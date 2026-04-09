#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <time.h>
#include <math.h>

/*
  LogiGate - ESP32 gate controller (single-side sensing architecture)
  - 2x HC-SR04 (approach + safety)
  - 1x Servo barrier
  - 1x Manual physical button
  - Firebase Realtime Database (REST)

  Notes:
  - This sketch focuses on the physical barrier + telemetry contract.
  - ANPR/OCR can run in another module (ESP32-CAM or cloud function).
  - For production, replace HC-SR04 with industrial radar/ToF sensors.
*/

// -------------------- Runtime configuration --------------------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* FIREBASE_DB_URL = "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com";
const char* FIREBASE_AUTH = "YOUR_FIREBASE_DB_SECRET_OR_TOKEN";

const char* DEVICE_ID = "ESP32-GATE-001";
const char* ACCESS_POINT = "porton_norte";
const char* DEVICE_NAME = "ESP32 Gate Controller Norte";
const char* FIRMWARE_VERSION = "v2.0.0";

// -------------------- Pin mapping (ESP32 DevKit) --------------------
const int PIN_APPROACH_TRIG = 23;
const int PIN_APPROACH_ECHO = 22;
const int PIN_SAFETY_TRIG = 21;
const int PIN_SAFETY_ECHO = 19;
const int PIN_SERVO = 18;
const int PIN_MANUAL_BUTTON = 5;

// -------------------- Tuning --------------------
const float APPROACH_THRESHOLD_CM = 180.0f;
const float SAFETY_THRESHOLD_CM = 55.0f;
const float MAX_VALID_DISTANCE_CM = 450.0f;
const float INVALID_DISTANCE_CM = 999.0f;

const uint8_t SENSOR_SAMPLES = 5;
const unsigned long SENSOR_POLL_MS = 180;
const unsigned long COMMAND_POLL_MS = 1100;
const unsigned long HEARTBEAT_MS = 5000;
const unsigned long WIFI_RECONNECT_MS = 6000;
const unsigned long PRESENCE_RELEASE_MS = 1200;
const unsigned long BUTTON_DEBOUNCE_MS = 80;
const unsigned long AUTO_CLOSE_MS = 4500;
const unsigned long HTTP_TIMEOUT_MS = 7000;
const unsigned long RETRY_BASE_MS = 1800;
const uint8_t MAX_RETRY_ATTEMPTS = 8;
const unsigned long ECHO_TIMEOUT_US = 30000;

const int SERVO_OPEN_ANGLE = 92;
const int SERVO_CLOSED_ANGLE = 8;

Servo barrierServo;

struct DetectionQueueItem {
  bool pending = false;
  String eventId;
  String payload;
  uint8_t attempts = 0;
  unsigned long nextRetryAt = 0;
};

DetectionQueueItem detectionQueue;

String barrierMode = "automatico";
String barrierStatus = "cerrada";
String lastCommandRequestId = "";
unsigned long barrierOpenedAtMs = 0;

bool presenceDetected = false;
bool safetyBlocked = false;
bool presenceLatched = false;
unsigned long lastPresenceSeenAt = 0;

float approachDistanceCm = INVALID_DISTANCE_CM;
float safetyDistanceCm = INVALID_DISTANCE_CM;

unsigned long lastSensorPollAt = 0;
unsigned long lastCommandPollAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastWifiCheckAt = 0;
unsigned long lastNtpSyncAt = 0;

int buttonLastReading = HIGH;
int buttonStableState = HIGH;
unsigned long buttonLastDebounceAt = 0;

// -------------------- Utilities --------------------
String nowIsoUtc() {
  time_t now = time(nullptr);
  if (now < 1700000000) {
    return String("1970-01-01T00:00:00Z");
  }

  struct tm timeInfo;
  gmtime_r(&now, &timeInfo);
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
  return String(buffer);
}

long long nowEpochMs() {
  time_t now = time(nullptr);
  if (now < 1700000000) {
    return 0;
  }
  return static_cast<long long>(now) * 1000LL;
}

int wifiSignalPercent() {
  long rssi = WiFi.RSSI();
  if (rssi <= -100) return 0;
  if (rssi >= -50) return 100;
  return static_cast<int>(2 * (rssi + 100));
}

String firebaseUrl(const String& path) {
  String base = String(FIREBASE_DB_URL);
  if (base.endsWith("/")) {
    base.remove(base.length() - 1);
  }
  return base + "/" + path + ".json?auth=" + String(FIREBASE_AUTH);
}

bool firebaseRequest(const String& method, const String& path, const String& payload, String* responseOut = nullptr) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  if (!http.begin(client, firebaseUrl(path))) {
    return false;
  }

  int code = -1;
  if (method == "GET") {
    code = http.GET();
  } else if (method == "PUT") {
    http.addHeader("Content-Type", "application/json");
    code = http.PUT(payload);
  } else if (method == "PATCH") {
    http.addHeader("Content-Type", "application/json");
    code = http.sendRequest("PATCH", payload);
  } else if (method == "POST") {
    http.addHeader("Content-Type", "application/json");
    code = http.POST(payload);
  }

  if (responseOut != nullptr) {
    *responseOut = http.getString();
  }

  http.end();
  return (code >= 200 && code < 300);
}

bool firebaseGet(const String& path, String& response) {
  return firebaseRequest("GET", path, "", &response);
}

bool firebasePut(const String& path, const String& payload) {
  return firebaseRequest("PUT", path, payload, nullptr);
}

bool firebasePatch(const String& path, const String& payload) {
  return firebaseRequest("PATCH", path, payload, nullptr);
}

float readDistanceRawCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, ECHO_TIMEOUT_US);
  if (duration <= 0) {
    return NAN;
  }

  return (duration * 0.0343f) / 2.0f;
}

float sanitizeDistance(float distanceCm) {
  if (isnan(distanceCm) || distanceCm <= 0.0f || distanceCm > MAX_VALID_DISTANCE_CM) {
    return INVALID_DISTANCE_CM;
  }
  return distanceCm;
}

void sortArray(float* values, uint8_t count) {
  for (uint8_t i = 0; i < count; i++) {
    for (uint8_t j = i + 1; j < count; j++) {
      if (values[j] < values[i]) {
        float tmp = values[i];
        values[i] = values[j];
        values[j] = tmp;
      }
    }
  }
}

float readDistanceMedianCm(int trigPin, int echoPin, uint8_t sampleCount) {
  float samples[7];
  if (sampleCount > 7) sampleCount = 7;

  for (uint8_t i = 0; i < sampleCount; i++) {
    samples[i] = sanitizeDistance(readDistanceRawCm(trigPin, echoPin));
    delay(5);
  }

  sortArray(samples, sampleCount);
  return samples[sampleCount / 2];
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAt) < 15000) {
    delay(300);
  }
}

void syncNtp() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  unsigned long startAt = millis();
  while ((time(nullptr) < 1700000000) && (millis() - startAt < 5000)) {
    delay(250);
  }
  lastNtpSyncAt = millis();
}

void writeBarrierSnapshot(const char* actor, const char* reason) {
  StaticJsonDocument<384> doc;
  doc["status"] = barrierStatus;
  doc["mode"] = barrierMode;
  doc["lastActionAt"] = nowIsoUtc();
  doc["lastActionBy"] = actor;
  doc["reason"] = reason;

  String payload;
  serializeJson(doc, payload);
  firebasePatch(String("barrier/") + ACCESS_POINT, payload);
}

void openBarrier(const char* actor, const char* reason) {
  if (barrierStatus == "abierta") return;
  barrierServo.write(SERVO_OPEN_ANGLE);
  barrierStatus = "abierta";
  barrierOpenedAtMs = millis();
  writeBarrierSnapshot(actor, reason);
}

void closeBarrier(const char* actor, const char* reason) {
  if (barrierStatus == "cerrada") return;
  if (safetyBlocked) return;
  barrierServo.write(SERVO_CLOSED_ANGLE);
  barrierStatus = "cerrada";
  writeBarrierSnapshot(actor, reason);
}

void ackCommand(const String& requestId, const char* status, const char* message) {
  StaticJsonDocument<256> doc;
  doc["requestId"] = requestId;
  doc["status"] = status;
  doc["message"] = message;
  doc["processedAt"] = nowIsoUtc();

  String payload;
  serializeJson(doc, payload);
  firebasePatch(String("devices/") + DEVICE_ID + "/lastCommandAck", payload);
}

void queueDetectionEvent() {
  if (detectionQueue.pending) return;

  String eventId = String(DEVICE_ID) + "-" + String(static_cast<unsigned long>(time(nullptr))) + "-" + String(random(1000, 9999));

  StaticJsonDocument<448> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["accessPoint"] = ACCESS_POINT;
  doc["capturedAt"] = nowIsoUtc();
  doc["trigger"] = "presence_rising_edge";
  doc["approachDistanceCm"] = approachDistanceCm;
  doc["safetyDistanceCm"] = safetyDistanceCm;
  doc["mode"] = barrierMode;
  doc["requiresAuthorization"] = true;
  doc["firmware"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);

  detectionQueue.pending = true;
  detectionQueue.eventId = eventId;
  detectionQueue.payload = payload;
  detectionQueue.attempts = 0;
  detectionQueue.nextRetryAt = millis();
}

void flushDetectionQueue() {
  if (!detectionQueue.pending) return;
  if (millis() < detectionQueue.nextRetryAt) return;
  if (WiFi.status() != WL_CONNECTED) return;

  bool ok = firebasePut(String("ingest/detections/") + detectionQueue.eventId, detectionQueue.payload);
  if (ok) {
    detectionQueue.pending = false;
    detectionQueue.eventId = "";
    detectionQueue.payload = "";
    detectionQueue.attempts = 0;
    detectionQueue.nextRetryAt = 0;
    return;
  }

  detectionQueue.attempts++;
  if (detectionQueue.attempts >= MAX_RETRY_ATTEMPTS) {
    detectionQueue.pending = false;
    return;
  }
  detectionQueue.nextRetryAt = millis() + (RETRY_BASE_MS * detectionQueue.attempts);
}

void updateSensorsAndPresenceState() {
  approachDistanceCm = readDistanceMedianCm(PIN_APPROACH_TRIG, PIN_APPROACH_ECHO, SENSOR_SAMPLES);
  safetyDistanceCm = readDistanceMedianCm(PIN_SAFETY_TRIG, PIN_SAFETY_ECHO, SENSOR_SAMPLES);

  presenceDetected = (approachDistanceCm <= APPROACH_THRESHOLD_CM);
  safetyBlocked = (safetyDistanceCm <= SAFETY_THRESHOLD_CM);

  if (presenceDetected) {
    lastPresenceSeenAt = millis();
    if (!presenceLatched) {
      presenceLatched = true;
      queueDetectionEvent();
    }
  } else if (presenceLatched && (millis() - lastPresenceSeenAt > PRESENCE_RELEASE_MS)) {
    presenceLatched = false;
  }

  if (barrierStatus == "abierta" && safetyBlocked) {
    barrierOpenedAtMs = millis();
  }
}

void processManualButton() {
  int reading = digitalRead(PIN_MANUAL_BUTTON);
  if (reading != buttonLastReading) {
    buttonLastDebounceAt = millis();
  }

  if ((millis() - buttonLastDebounceAt) > BUTTON_DEBOUNCE_MS) {
    if (buttonStableState == HIGH && reading == LOW) {
      if (barrierMode == "manual_fisico") {
        if (barrierStatus == "abierta") {
          closeBarrier("manual_fisico", "Physical button pressed");
        } else {
          openBarrier("manual_fisico", "Physical button pressed");
        }
      }
    }
    buttonStableState = reading;
  }
  buttonLastReading = reading;
}

void pollCommands() {
  String response;
  if (!firebaseGet(String("commands/") + ACCESS_POINT, response)) {
    return;
  }
  if (response == "null" || response.length() == 0) {
    return;
  }

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, response) != DeserializationError::Ok) {
    return;
  }

  String mode = doc["mode"] | barrierMode;
  String action = doc["action"] | "none";
  String requestId = doc["requestId"] | "";
  long long autoOpenUntil = doc["autoOpenUntil"] | 0LL;

  if (mode != barrierMode) {
    barrierMode = mode;
    writeBarrierSnapshot("dashboard", "Mode updated from command node");
  }

  if (requestId.length() > 0 && requestId != lastCommandRequestId) {
    if (action == "abrir") {
      openBarrier("manual_remoto", "Open command from dashboard");
      ackCommand(requestId, "ok", "Barrier opened");
    } else if (action == "cerrar") {
      if (safetyBlocked) {
        ackCommand(requestId, "rejected", "Safety sensor is blocked");
      } else {
        closeBarrier("manual_remoto", "Close command from dashboard");
        ackCommand(requestId, "ok", "Barrier closed");
      }
    } else {
      ackCommand(requestId, "ignored", "No actionable command");
    }

    if (action != "none") {
      firebasePatch(String("commands/") + ACCESS_POINT, "{\"action\":\"none\"}");
    }
    lastCommandRequestId = requestId;
  }

  if (barrierMode == "automatico" && autoOpenUntil > 0) {
    long long nowMs = nowEpochMs();
    if (nowMs > 0 && nowMs <= autoOpenUntil) {
      openBarrier("automatico", "Authorized auto-open window");
    }
  }
}

void applyAutoCloseRule() {
  if (barrierMode != "automatico") return;
  if (barrierStatus != "abierta") return;
  if (safetyBlocked) return;

  if (millis() - barrierOpenedAtMs >= AUTO_CLOSE_MS) {
    closeBarrier("automatico", "Auto close timeout");
  }
}

void publishHeartbeat(bool force) {
  if (!force && millis() - lastHeartbeatAt < HEARTBEAT_MS) return;
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<640> doc;
  doc["name"] = DEVICE_NAME;
  doc["type"] = "esp32_cam";
  doc["accessPoint"] = ACCESS_POINT;
  doc["status"] = "online";
  doc["mode"] = barrierMode;
  doc["signal"] = wifiSignalPercent();
  doc["firmware"] = FIRMWARE_VERSION;
  doc["lastSeen"] = nowIsoUtc();

  JsonObject telemetry = doc.createNestedObject("telemetry");
  telemetry["approachDistanceCm"] = approachDistanceCm;
  telemetry["safetyDistanceCm"] = safetyDistanceCm;
  telemetry["presenceDetected"] = presenceDetected;
  telemetry["safetyBlocked"] = safetyBlocked;
  telemetry["barrierStatus"] = barrierStatus;
  telemetry["uptimeMs"] = millis();

  String payload;
  serializeJson(doc, payload);
  firebasePatch(String("devices/") + DEVICE_ID, payload);
  lastHeartbeatAt = millis();
}

void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  pinMode(PIN_APPROACH_TRIG, OUTPUT);
  pinMode(PIN_APPROACH_ECHO, INPUT);
  pinMode(PIN_SAFETY_TRIG, OUTPUT);
  pinMode(PIN_SAFETY_ECHO, INPUT);
  pinMode(PIN_MANUAL_BUTTON, INPUT_PULLUP);

  barrierServo.setPeriodHertz(50);
  barrierServo.attach(PIN_SERVO);
  barrierServo.write(SERVO_CLOSED_ANGLE);
  barrierStatus = "cerrada";
  barrierOpenedAtMs = 0;

  connectWifi();
  if (WiFi.status() == WL_CONNECTED) {
    syncNtp();
  }

  writeBarrierSnapshot("boot", "Device startup");
  publishHeartbeat(true);
}

void loop() {
  if (millis() - lastWifiCheckAt >= WIFI_RECONNECT_MS) {
    if (WiFi.status() != WL_CONNECTED) {
      connectWifi();
    }
    if (WiFi.status() == WL_CONNECTED && millis() - lastNtpSyncAt > 3600000) {
      syncNtp();
    }
    lastWifiCheckAt = millis();
  }

  processManualButton();

  if (millis() - lastSensorPollAt >= SENSOR_POLL_MS) {
    updateSensorsAndPresenceState();
    lastSensorPollAt = millis();
  }

  flushDetectionQueue();

  if (millis() - lastCommandPollAt >= COMMAND_POLL_MS) {
    pollCommands();
    lastCommandPollAt = millis();
  }

  applyAutoCloseRule();
  publishHeartbeat(false);
}
