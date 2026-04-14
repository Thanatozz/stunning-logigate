#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <time.h>
#include <math.h>

/*
  LogiGate - ESP32 gate controller
  Perfiles de hardware:
    - ESP32 DevKit (2 HC-SR04)
    - ESP32-CAM minimo (1 HC-SR04 + servo + boton)

  Nota ESP32-CAM minimo:
    - Usa un solo sensor fisico.
    - El cierre en automatico se hace por timeout seguro.
    - Ingreso/salida se define por estado en backend.

  Secuencia de paso esperada (ingreso):
    1) Sensor entrada ON
    2) Sensor entrada + salida ON
    3) Sensor entrada OFF
    4) Sensor salida OFF
    5) Cerrar barrera

  El mismo principio funciona al reves para salida:
    salida ON -> ambos ON -> salida OFF -> entrada OFF
*/

// -------------------- Runtime configuration --------------------
const char* WIFI_SSID = "Wifi iot";
const char* WIFI_PASSWORD = "111222333";

const char* FIREBASE_DB_URL = "https://stunning-logigate-default-rtdb.firebaseio.com";
const char* FIREBASE_API_KEY = "AIzaSyAJC6k0uwv9fIM7W0KOWaOjY00-BtIEWCU";
const char* FIREBASE_USER_EMAIL = "esp32@logigate.cl";
const char* FIREBASE_USER_PASSWORD = "logigateesp32";

const char* DEVICE_ID = "ESP32-GATE-001";
const char* ACCESS_POINT = "porton_norte";
const char* DEVICE_NAME = "ESP32 Gate Controller Norte";
const char* FIRMWARE_VERSION = "v2.1.0";

// -------------------- Pin mapping --------------------
// 1 = ESP32-CAM minimo (recomendado si tu placa no expone GPIO23/22/21/19)
// 0 = ESP32 DevKit (2 sensores)
#define USE_ESP32_CAM_MINIMAL 1

#if USE_ESP32_CAM_MINIMAL
const int PIN_ENTRY_TRIG = 14;
const int PIN_ENTRY_ECHO = 15;
const int PIN_EXIT_TRIG = -1;
const int PIN_EXIT_ECHO = -1;
const int PIN_SERVO = 13;
const int PIN_MANUAL_BUTTON = 2;
const bool HAS_EXIT_SENSOR = false;
#else
const int PIN_ENTRY_TRIG = 23;
const int PIN_ENTRY_ECHO = 22;
const int PIN_EXIT_TRIG = 21;
const int PIN_EXIT_ECHO = 19;
const int PIN_SERVO = 18;
const int PIN_MANUAL_BUTTON = 5;
const bool HAS_EXIT_SENSOR = true;
#endif

// -------------------- Tuning --------------------
const float ENTRY_THRESHOLD_CM = 170.0f;
const float EXIT_THRESHOLD_CM = 170.0f;
const float MAX_VALID_DISTANCE_CM = 450.0f;
const float INVALID_DISTANCE_CM = 999.0f;

const uint8_t SENSOR_SAMPLES = 5;
const unsigned long SENSOR_POLL_MS = 180;
const unsigned long COMMAND_POLL_MS = 1100;
const unsigned long HEARTBEAT_MS = 5000;
const unsigned long WIFI_RECONNECT_MS = 6000;
const unsigned long BUTTON_DEBOUNCE_MS = 80;
const unsigned long CROSSING_TIMEOUT_MS = 9000;
const unsigned long OPEN_FAILSAFE_MS = 15000;
const unsigned long HTTP_TIMEOUT_MS = 7000;
const unsigned long RETRY_BASE_MS = 1800;
const uint8_t MAX_RETRY_ATTEMPTS = 8;
const unsigned long ECHO_TIMEOUT_US = 30000;
const unsigned long FIREBASE_TOKEN_REFRESH_MARGIN_MS = 120000;

const int SERVO_OPEN_ANGLE = 92;
const int SERVO_CLOSED_ANGLE = 8;

Servo barrierServo;

enum PassageDirection {
  DIR_NONE = 0,
  DIR_INGRESO = 1,
  DIR_SALIDA = 2,
};

enum PassageState {
  SEQ_IDLE = 0,
  SEQ_FIRST_ACTIVE = 1,
  SEQ_BOTH_ACTIVE = 2,
  SEQ_FIRST_RELEASED = 3,
};

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

float entryDistanceCm = INVALID_DISTANCE_CM;
float exitDistanceCm = INVALID_DISTANCE_CM;
bool entryActive = false;
bool exitActive = false;
bool prevEntryActive = false;
bool prevExitActive = false;

PassageDirection crossingDirection = DIR_NONE;
PassageState crossingState = SEQ_IDLE;
unsigned long crossingStateStartedAt = 0;

unsigned long lastSensorPollAt = 0;
unsigned long lastCommandPollAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastWifiCheckAt = 0;
unsigned long lastNtpSyncAt = 0;

String firebaseIdToken = "";
String firebaseRefreshToken = "";
unsigned long firebaseTokenRefreshAt = 0;

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

const char* directionToString(PassageDirection dir) {
  if (dir == DIR_INGRESO) return "ingreso";
  if (dir == DIR_SALIDA) return "salida";
  return "none";
}

const char* sequenceStateToString(PassageState state) {
  if (state == SEQ_FIRST_ACTIVE) return "first_sensor_active";
  if (state == SEQ_BOTH_ACTIVE) return "both_sensors_active";
  if (state == SEQ_FIRST_RELEASED) return "first_sensor_released";
  return "idle";
}

bool millisReached(unsigned long targetAt) {
  return static_cast<long>(millis() - targetAt) >= 0;
}

unsigned long parseExpiresInSeconds(const JsonVariantConst& value) {
  if (value.is<const char*>()) {
    return strtoul(value.as<const char*>(), nullptr, 10);
  }
  if (value.is<unsigned long>()) {
    return value.as<unsigned long>();
  }
  if (value.is<long>()) {
    long parsed = value.as<long>();
    return parsed > 0 ? static_cast<unsigned long>(parsed) : 0;
  }
  return 0;
}

void scheduleFirebaseTokenRefresh(unsigned long expiresInSeconds) {
  unsigned long expiresMs = expiresInSeconds * 1000UL;
  if (expiresMs <= FIREBASE_TOKEN_REFRESH_MARGIN_MS) {
    firebaseTokenRefreshAt = millis() + 1000UL;
    return;
  }
  firebaseTokenRefreshAt = millis() + (expiresMs - FIREBASE_TOKEN_REFRESH_MARGIN_MS);
}

String urlEncode(const String& input) {
  String encoded;
  encoded.reserve(input.length() * 3);
  const char* hex = "0123456789ABCDEF";

  for (size_t i = 0; i < input.length(); i++) {
    uint8_t c = static_cast<uint8_t>(input[i]);
    bool isSafe =
      (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      (c >= '0' && c <= '9') ||
      c == '-' || c == '_' || c == '.' || c == '~';

    if (isSafe) {
      encoded += static_cast<char>(c);
    } else {
      encoded += '%';
      encoded += hex[(c >> 4) & 0x0F];
      encoded += hex[c & 0x0F];
    }
  }
  return encoded;
}

bool firebaseSignInWithEmailPassword() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + String(FIREBASE_API_KEY);
  if (!http.begin(client, url)) {
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<256> payloadDoc;
  payloadDoc["email"] = FIREBASE_USER_EMAIL;
  payloadDoc["password"] = FIREBASE_USER_PASSWORD;
  payloadDoc["returnSecureToken"] = true;

  String payload;
  serializeJson(payloadDoc, payload);

  int code = http.POST(payload);
  String response = http.getString();
  http.end();

  if (code < 200 || code >= 300) {
    return false;
  }

  StaticJsonDocument<2048> doc;
  if (deserializeJson(doc, response) != DeserializationError::Ok) {
    return false;
  }

  String idToken = doc["idToken"] | "";
  String refreshToken = doc["refreshToken"] | "";
  if (idToken.length() == 0 || refreshToken.length() == 0) {
    return false;
  }

  firebaseIdToken = idToken;
  firebaseRefreshToken = refreshToken;
  unsigned long expiresInSeconds = parseExpiresInSeconds(doc["expiresIn"]);
  scheduleFirebaseTokenRefresh(expiresInSeconds);
  return true;
}

bool firebaseRefreshIdToken() {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (firebaseRefreshToken.length() == 0) return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  String url = "https://securetoken.googleapis.com/v1/token?key=" + String(FIREBASE_API_KEY);
  if (!http.begin(client, url)) {
    return false;
  }

  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  String body = "grant_type=refresh_token&refresh_token=" + urlEncode(firebaseRefreshToken);
  int code = http.POST(body);
  String response = http.getString();
  http.end();

  if (code < 200 || code >= 300) {
    return false;
  }

  StaticJsonDocument<2048> doc;
  if (deserializeJson(doc, response) != DeserializationError::Ok) {
    return false;
  }

  String idToken = doc["id_token"] | "";
  String refreshToken = doc["refresh_token"] | "";
  if (idToken.length() == 0 || refreshToken.length() == 0) {
    return false;
  }

  firebaseIdToken = idToken;
  firebaseRefreshToken = refreshToken;
  unsigned long expiresInSeconds = parseExpiresInSeconds(doc["expires_in"]);
  scheduleFirebaseTokenRefresh(expiresInSeconds);
  return true;
}

bool ensureFirebaseIdToken() {
  if (WiFi.status() != WL_CONNECTED) return false;

  if (firebaseIdToken.length() == 0) {
    return firebaseSignInWithEmailPassword();
  }

  if (firebaseTokenRefreshAt == 0 || millisReached(firebaseTokenRefreshAt)) {
    if (firebaseRefreshIdToken()) {
      return true;
    }
    firebaseIdToken = "";
    firebaseTokenRefreshAt = 0;
    return firebaseSignInWithEmailPassword();
  }

  return true;
}

String firebaseDbUrl(const String& path) {
  String base = String(FIREBASE_DB_URL);
  if (base.endsWith("/")) {
    base.remove(base.length() - 1);
  }
  return base + "/" + path + ".json?auth=" + firebaseIdToken;
}

bool firebaseRequest(const String& method, const String& path, const String& payload, String* responseOut = nullptr) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  for (uint8_t attempt = 0; attempt < 2; attempt++) {
    if (!ensureFirebaseIdToken()) {
      return false;
    }

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);

    if (!http.begin(client, firebaseDbUrl(path))) {
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

    String response = http.getString();
    http.end();

    if (responseOut != nullptr) {
      *responseOut = response;
    }

    if (code == 401 && attempt == 0) {
      firebaseTokenRefreshAt = 0;
      if (!firebaseRefreshIdToken()) {
        firebaseIdToken = "";
      }
      continue;
    }

    return (code >= 200 && code < 300);
  }

  return false;
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
  StaticJsonDocument<480> doc;
  doc["status"] = barrierStatus;
  doc["mode"] = barrierMode;
  doc["lastActionAt"] = nowIsoUtc();
  doc["lastActionBy"] = actor;
  doc["reason"] = reason;
  doc["crossingDirection"] = directionToString(crossingDirection);
  doc["crossingState"] = sequenceStateToString(crossingState);

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
  if (entryActive || exitActive) return;
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

void queueDetectionEvent(const char* trigger, const char* directionHint) {
  if (detectionQueue.pending) return;

  String eventId = String(DEVICE_ID) + "-" + String(static_cast<unsigned long>(time(nullptr))) + "-" + String(random(1000, 9999));

  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["accessPoint"] = ACCESS_POINT;
  doc["capturedAt"] = nowIsoUtc();
  doc["trigger"] = trigger;
  doc["directionHint"] = directionHint;
  doc["entryDistanceCm"] = entryDistanceCm;
  doc["exitDistanceCm"] = exitDistanceCm;
  doc["entrySensorActive"] = entryActive;
  doc["exitSensorActive"] = exitActive;
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

void resetCrossingSequence() {
  crossingDirection = DIR_NONE;
  crossingState = SEQ_IDLE;
  crossingStateStartedAt = millis();
}

void onCrossingCompleted(PassageDirection dir) {
  if (barrierMode == "automatico" && barrierStatus == "abierta") {
    if (dir == DIR_INGRESO) {
      closeBarrier("automatico", "Secuencia de ingreso completada");
    } else if (dir == DIR_SALIDA) {
      closeBarrier("automatico", "Secuencia de salida completada");
    }
  }
}

void updateCrossingSequence() {
  unsigned long nowMs = millis();

  if (crossingState != SEQ_IDLE && (nowMs - crossingStateStartedAt > CROSSING_TIMEOUT_MS)) {
    resetCrossingSequence();
  }

  if (crossingState == SEQ_IDLE) {
    if (entryActive && !exitActive) {
      crossingDirection = DIR_INGRESO;
      crossingState = SEQ_FIRST_ACTIVE;
      crossingStateStartedAt = nowMs;
      return;
    }
    if (exitActive && !entryActive) {
      crossingDirection = DIR_SALIDA;
      crossingState = SEQ_FIRST_ACTIVE;
      crossingStateStartedAt = nowMs;
      return;
    }
    return;
  }

  if (crossingState == SEQ_FIRST_ACTIVE) {
    if (crossingDirection == DIR_INGRESO) {
      if (entryActive && exitActive) {
        crossingState = SEQ_BOTH_ACTIVE;
        crossingStateStartedAt = nowMs;
      } else if (!entryActive && !exitActive) {
        resetCrossingSequence();
      }
      return;
    }

    if (crossingDirection == DIR_SALIDA) {
      if (exitActive && entryActive) {
        crossingState = SEQ_BOTH_ACTIVE;
        crossingStateStartedAt = nowMs;
      } else if (!entryActive && !exitActive) {
        resetCrossingSequence();
      }
      return;
    }
  }

  if (crossingState == SEQ_BOTH_ACTIVE) {
    if (crossingDirection == DIR_INGRESO) {
      if (!entryActive && exitActive) {
        crossingState = SEQ_FIRST_RELEASED;
        crossingStateStartedAt = nowMs;
      } else if (!entryActive && !exitActive) {
        resetCrossingSequence();
      }
      return;
    }

    if (crossingDirection == DIR_SALIDA) {
      if (!exitActive && entryActive) {
        crossingState = SEQ_FIRST_RELEASED;
        crossingStateStartedAt = nowMs;
      } else if (!entryActive && !exitActive) {
        resetCrossingSequence();
      }
      return;
    }
  }

  if (crossingState == SEQ_FIRST_RELEASED) {
    if (!entryActive && !exitActive) {
      PassageDirection completed = crossingDirection;
      resetCrossingSequence();
      onCrossingCompleted(completed);
    }
  }
}

void updateSensorsAndEvents() {
  entryDistanceCm = readDistanceMedianCm(PIN_ENTRY_TRIG, PIN_ENTRY_ECHO, SENSOR_SAMPLES);

  entryActive = (entryDistanceCm <= ENTRY_THRESHOLD_CM);
  if (HAS_EXIT_SENSOR) {
    exitDistanceCm = readDistanceMedianCm(PIN_EXIT_TRIG, PIN_EXIT_ECHO, SENSOR_SAMPLES);
    exitActive = (exitDistanceCm <= EXIT_THRESHOLD_CM);
  } else {
    exitDistanceCm = INVALID_DISTANCE_CM;
    exitActive = false;
  }

  if (!prevEntryActive && entryActive) {
    queueDetectionEvent("entry_rising_edge", "ingreso");
  }
  if (HAS_EXIT_SENSOR && !prevExitActive && exitActive) {
    queueDetectionEvent("exit_rising_edge", "salida");
  }

  prevEntryActive = entryActive;
  if (HAS_EXIT_SENSOR) {
    prevExitActive = exitActive;
    updateCrossingSequence();
  } else {
    prevExitActive = false;
    resetCrossingSequence();
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
      if (entryActive || exitActive) {
        ackCommand(requestId, "rejected", "Passage sensors active");
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

void applyAutomaticClosureRule() {
  if (barrierMode != "automatico") return;
  if (barrierStatus != "abierta") return;
  if (entryActive || exitActive) return;

  if (millis() - barrierOpenedAtMs >= OPEN_FAILSAFE_MS) {
    closeBarrier("automatico", "Failsafe close timeout");
  }
}

void publishHeartbeat(bool force) {
  if (!force && millis() - lastHeartbeatAt < HEARTBEAT_MS) return;
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<768> doc;
  doc["name"] = DEVICE_NAME;
  doc["type"] = "esp32_cam";
  doc["accessPoint"] = ACCESS_POINT;
  doc["status"] = "online";
  doc["mode"] = barrierMode;
  doc["signal"] = wifiSignalPercent();
  doc["firmware"] = FIRMWARE_VERSION;
  doc["lastSeen"] = nowIsoUtc();

  JsonObject telemetry = doc.createNestedObject("telemetry");
  telemetry["entryDistanceCm"] = entryDistanceCm;
  telemetry["exitDistanceCm"] = exitDistanceCm;
  telemetry["entrySensorActive"] = entryActive;
  telemetry["exitSensorActive"] = exitActive;
  telemetry["crossingDirection"] = directionToString(crossingDirection);
  telemetry["crossingState"] = sequenceStateToString(crossingState);
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

  pinMode(PIN_ENTRY_TRIG, OUTPUT);
  pinMode(PIN_ENTRY_ECHO, INPUT);
  if (HAS_EXIT_SENSOR) {
    pinMode(PIN_EXIT_TRIG, OUTPUT);
    pinMode(PIN_EXIT_ECHO, INPUT);
  }
  pinMode(PIN_MANUAL_BUTTON, INPUT_PULLUP);

  barrierServo.setPeriodHertz(50);
  barrierServo.attach(PIN_SERVO);
  barrierServo.write(SERVO_CLOSED_ANGLE);
  barrierStatus = "cerrada";
  barrierOpenedAtMs = 0;
  resetCrossingSequence();

  connectWifi();
  if (WiFi.status() == WL_CONNECTED) {
    syncNtp();
    ensureFirebaseIdToken();
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
    updateSensorsAndEvents();
    lastSensorPollAt = millis();
  }

  flushDetectionQueue();

  if (millis() - lastCommandPollAt >= COMMAND_POLL_MS) {
    pollCommands();
    lastCommandPollAt = millis();
  }

  applyAutomaticClosureRule();
  publishHeartbeat(false);
}
