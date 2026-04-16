  #include <Arduino.h>
  #include "esp_camera.h"
  #define CAMERA_MODEL_AI_THINKER
  #include "camera_pins.h"
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
  const char* FIREBASE_USER_PASSWORD = "esp12345678"; 

  const char* PLATE_RECOGNIZER_TOKEN = "080b98ac5ff98b0c09b952c4070dc946fe4e7616";
  const char* PLATE_RECOGNIZER_REGION = "cl";

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
  // Ajuste para maqueta pequena (deteccion cercana)
  const float ENTRY_THRESHOLD_CM = 20.0f;
  const float EXIT_THRESHOLD_CM = 20.0f;
  const float MAX_VALID_DISTANCE_CM = 450.0f;
  const float INVALID_DISTANCE_CM = 999.0f;

  const uint8_t SENSOR_SAMPLES = 5;
  const unsigned long SENSOR_POLL_MS = 180;
  const unsigned long COMMAND_POLL_MS = 1100;
  const unsigned long HEARTBEAT_MS = 5000;
  const unsigned long WIFI_RECONNECT_MS = 6000;
  const unsigned long BUTTON_DEBOUNCE_MS = 80;
  const unsigned long CROSSING_TIMEOUT_MS = 9000;
  const unsigned long DEFAULT_OPEN_FAILSAFE_MS = 15000;
  const unsigned long DEFAULT_CAPTURE_COOLDOWN_MS = 3000;
  const unsigned long SETTINGS_POLL_MS = 8000;
  const unsigned long HTTP_TIMEOUT_MS = 7000;
  const unsigned long RETRY_BASE_MS = 1800;
  const uint8_t MAX_RETRY_ATTEMPTS = 8;
  const uint8_t FIREBASE_REQUEST_MAX_ATTEMPTS = 3;
  const unsigned long FIREBASE_REQUEST_RETRY_MS = 1200;
const unsigned long ECHO_TIMEOUT_US = 30000;
const unsigned long FIREBASE_TOKEN_REFRESH_MARGIN_MS = 120000;
const unsigned long FIREBASE_AUTH_RETRY_MS = 8000;
const unsigned long FIREBASE_AUTH_LOCK_BASE_MS = 60000;
const unsigned long FIREBASE_AUTH_LOCK_MAX_MS = 900000;
const bool ENABLE_NTP_SYNC = false;
  const bool DEBUG_DISTANCE_LOG = true;
  const unsigned long DEBUG_DISTANCE_LOG_MS = 1000;
  const bool DEBUG_SERVO_FLOW = true;
  const bool SERVO_TEST_ON_PHOTO_CAPTURE = true;
  const bool START_IN_MANUAL_FISICO = false;
  const size_t MAX_PLATE_API_RESPONSE_STORED = 1200;
  const size_t MAX_FIREBASE_ERROR_BODY_LOG = 300;
  const framesize_t CAMERA_FRAME_SIZE_PSRAM = FRAMESIZE_SVGA;     // 800x600
  const framesize_t CAMERA_FRAME_SIZE_NO_PSRAM = FRAMESIZE_VGA;   // 640x480
  const int CAMERA_JPEG_QUALITY = 10;                              // Menor numero = mejor calidad
  const uint8_t CAMERA_FB_COUNT_PSRAM = 2;
  const uint8_t CAMERA_FB_COUNT_NO_PSRAM = 1;

  const int SERVO_OPEN_ANGLE = 92;
  const int SERVO_CLOSED_ANGLE = 8;
  const bool SERVO_SMOOTH_MOVE = true;
  const int SERVO_STEP_DEG = 2;
  const unsigned long SERVO_STEP_DELAY_MS = 15;
  const bool SERVO_DETACH_WHEN_IDLE = true;
  const unsigned long SERVO_SETTLE_MS = 120;

  Servo barrierServo;
  int servoCurrentAngle = SERVO_CLOSED_ANGLE;

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
  DetectionQueueItem plateReadingQueue;

  String barrierMode = START_IN_MANUAL_FISICO ? "manual_fisico" : "automatico";
  String barrierStatus = "cerrada";
  String lastCommandRequestId = "";
  String lastAutoOpenWindowRequestId = "";
  unsigned long barrierOpenedAtMs = 0;
  unsigned long barrierAutoCloseMs = DEFAULT_OPEN_FAILSAFE_MS;
  unsigned long captureCooldownMs = DEFAULT_CAPTURE_COOLDOWN_MS;

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
  unsigned long lastDistanceLogAt = 0;
  unsigned long lastSettingsPollAt = 0;

String firebaseIdToken = "";
String firebaseRefreshToken = "";
unsigned long firebaseTokenRefreshAt = 0;
unsigned long lastFirebaseAuthAttemptAt = 0;
unsigned long firebaseAuthLockedUntil = 0;
unsigned long firebaseAuthLockMs = FIREBASE_AUTH_LOCK_BASE_MS;

  int buttonLastReading = HIGH;
  int buttonStableState = HIGH;
  unsigned long buttonLastDebounceAt = 0;

  bool cameraReady = false;
  unsigned long lastCaptureAt = 0;

  // -------------------- Forward declarations --------------------
  bool isWifiConnected();
  void clearDetectionQueue();
  void clearPlateReadingQueue();
  void flushPlateReadingQueue();
  void connectWifi();
  void setupHardware();
  void setupConnectivityAndAuth();
  void runConnectivityTask();
  void runSensorTask();
  void runCommandTask();
  void runSettingsTask();
  void openBarrier(const char* actor, const char* reason);
  void moveServoToAngle(int targetAngle);
  bool sendPhotoToPlateRecognizer(camera_fb_t* fb, String& responseBodyOut, int& httpCodeOut);
  bool extractPlateRecognition(const String& responseBody, String& plateOut, float& scoreOut, float& confidenceOut, String& regionOut);
  String clipForStorage(const String& input, size_t maxLen);
  bool firebaseRequest(
    const String& method,
    const String& path,
    const String& payload,
    String* responseOut = nullptr,
    int* statusCodeOut = nullptr
  );
  bool firebaseGet(const String& path, String& response);
  bool firebasePut(const String& path, const String& payload);
  bool firebasePatch(const String& path, const String& payload);
  void persistPlateRecognitionResult(
    const char* trigger,
    bool requestOk,
    int httpCode,
    const String& responseBody,
    bool hasPlate,
    const String& plate,
    float score,
    float confidence,
    const String& region
  );

  // -------------------- Camera --------------------
  bool initCamera() {
  #if USE_ESP32_CAM_MINIMAL
    bool hasPsram = psramFound();
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
  #if defined(ESP_IDF_VERSION_MAJOR) && (ESP_IDF_VERSION_MAJOR >= 5)
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
  #else
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
  #endif
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size = hasPsram ? CAMERA_FRAME_SIZE_PSRAM : CAMERA_FRAME_SIZE_NO_PSRAM;
    config.jpeg_quality = CAMERA_JPEG_QUALITY;
    config.fb_count = hasPsram ? CAMERA_FB_COUNT_PSRAM : CAMERA_FB_COUNT_NO_PSRAM;
  #if defined(CAMERA_GRAB_WHEN_EMPTY)
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  #endif
  #if defined(CAMERA_FB_IN_PSRAM)
    config.fb_location = CAMERA_FB_IN_PSRAM;
  #endif

    if (!hasPsram) {
      config.frame_size = CAMERA_FRAME_SIZE_NO_PSRAM;
      config.fb_count = CAMERA_FB_COUNT_NO_PSRAM;
  #if defined(CAMERA_FB_IN_DRAM)
      config.fb_location = CAMERA_FB_IN_DRAM;
  #endif
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
      Serial.printf("Camera init failed: 0x%x\n", err);
      return false;
    }

    sensor_t* s = esp_camera_sensor_get();
    if (s) {
      // Ajuste recomendado para OV3660 en ESP32-CAM AI Thinker.
      if (s->id.PID == OV3660_PID) {
        s->set_vflip(s, 1);
        s->set_brightness(s, 0);
        s->set_saturation(s, 0);
      }
      s->set_framesize(s, hasPsram ? CAMERA_FRAME_SIZE_PSRAM : CAMERA_FRAME_SIZE_NO_PSRAM);
      s->set_quality(s, CAMERA_JPEG_QUALITY);
      s->set_brightness(s, 0);
      s->set_contrast(s, 1);
      s->set_saturation(s, 0);
    }

    Serial.println("Camera ready");
    return true;
  #else
    return false;
  #endif
  }

  void capturePhoto(const char* trigger) {
  #if USE_ESP32_CAM_MINIMAL
    if (!cameraReady) return;

    if (millis() - lastCaptureAt < captureCooldownMs) {
      return;
    }

    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Capture failed");
      return;
    }

    Serial.printf("Foto capturada | trigger=%s | bytes=%u | %ux%u\n",
                  trigger, fb->len, fb->width, fb->height);

    String plateApiResponse;
    int plateApiHttpCode = 0;
    bool plateRequestOk = sendPhotoToPlateRecognizer(fb, plateApiResponse, plateApiHttpCode);

    String plate = "";
    float score = 0.0f;
    float confidence = 0.0f;
    String region = "";
    bool hasPlate = extractPlateRecognition(plateApiResponse, plate, score, confidence, region);

    if (plateRequestOk) {
      if (hasPlate) {
        Serial.printf("[PLATE] patente_identificada_correctamente plate=%s score=%.3f confidence=%.3f region=%s\n",
                      plate.c_str(), score, confidence, region.c_str());
      } else {
        Serial.println("[PLATE] no_existe_patente_en_foto");
      }
    } else {
      Serial.printf("[PLATE] error_consulta_plate_recognizer httpCode=%d\n", plateApiHttpCode);
    }

    persistPlateRecognitionResult(
      trigger,
      plateRequestOk,
      plateApiHttpCode,
      plateApiResponse,
      hasPlate,
      plate,
      score,
      confidence,
      region
    );

    esp_camera_fb_return(fb);
    lastCaptureAt = millis();

    if (SERVO_TEST_ON_PHOTO_CAPTURE) {
      openBarrier("photo_test", "Photo captured trigger");
    }
  #else
    (void)trigger;
  #endif
  }

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

  bool isWifiConnected() {
    return WiFi.status() == WL_CONNECTED;
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

  String clipForStorage(const String& input, size_t maxLen) {
    if (input.length() <= maxLen) {
      return input;
    }
    return input.substring(0, maxLen);
  }

  bool sendPhotoToPlateRecognizer(camera_fb_t* fb, String& responseBodyOut, int& httpCodeOut) {
    responseBodyOut = "";
    httpCodeOut = 0;

    if (!isWifiConnected()) {
      return false;
    }

    if (strlen(PLATE_RECOGNIZER_TOKEN) == 0 || String(PLATE_RECOGNIZER_TOKEN) == "REEMPLAZAR_POR_TOKEN_REAL") {
      Serial.println("[PLATE] token no configurado");
      return false;
    }

    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(HTTP_TIMEOUT_MS);

    const char* host = "api.platerecognizer.com";
    const uint16_t port = 443;
    if (!client.connect(host, port)) {
      Serial.println("[PLATE] fallo conexion HTTPS");
      return false;
    }

    String boundary = "----logigate-" + String(static_cast<uint32_t>(esp_random()), HEX);
    String partRegion =
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"regions\"\r\n\r\n" + String(PLATE_RECOGNIZER_REGION) + "\r\n";
    String partFileHeader =
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"upload\"; filename=\"capture.jpg\"\r\n"
      "Content-Type: image/jpeg\r\n\r\n";
    String partFileFooter = "\r\n--" + boundary + "--\r\n";

    size_t contentLength = partRegion.length() + partFileHeader.length() + fb->len + partFileFooter.length();

    client.print("POST /v1/plate-reader/ HTTP/1.1\r\n");
    client.print("Host: api.platerecognizer.com\r\n");
    client.print("Authorization: Token ");
    client.print(PLATE_RECOGNIZER_TOKEN);
    client.print("\r\n");
    client.print("Content-Type: multipart/form-data; boundary=");
    client.print(boundary);
    client.print("\r\n");
    client.print("Content-Length: ");
    client.print(contentLength);
    client.print("\r\n");
    client.print("Connection: close\r\n\r\n");

    client.print(partRegion);
    client.print(partFileHeader);
    size_t bytesWritten = client.write(fb->buf, fb->len);
    client.print(partFileFooter);
    client.flush();

    if (bytesWritten != fb->len) {
      Serial.printf("[PLATE] envio incompleto bytes=%u/%u\n",
                    static_cast<unsigned int>(bytesWritten),
                    static_cast<unsigned int>(fb->len));
      client.stop();
      return false;
    }

    unsigned long waitStart = millis();
    while (!client.available() && client.connected() && (millis() - waitStart < HTTP_TIMEOUT_MS)) {
      delay(10);
    }

    String rawResponse = "";
    while (client.connected() || client.available()) {
      String chunk = client.readString();
      if (chunk.length() == 0) {
        break;
      }
      rawResponse += chunk;
    }
    client.stop();

    int statusLineEnd = rawResponse.indexOf("\r\n");
    if (statusLineEnd < 0) {
      return false;
    }

    String statusLine = rawResponse.substring(0, statusLineEnd);
    int firstSpace = statusLine.indexOf(' ');
    int secondSpace = statusLine.indexOf(' ', firstSpace + 1);
    if (firstSpace < 0 || secondSpace < 0) {
      return false;
    }

    httpCodeOut = statusLine.substring(firstSpace + 1, secondSpace).toInt();

    int bodyStart = rawResponse.indexOf("\r\n\r\n");
    if (bodyStart >= 0) {
      responseBodyOut = rawResponse.substring(bodyStart + 4);
    } else {
      responseBodyOut = "";
    }

    return (httpCodeOut >= 200 && httpCodeOut < 300);
  }

  bool extractPlateRecognition(const String& responseBody, String& plateOut, float& scoreOut, float& confidenceOut, String& regionOut) {
    plateOut = "";
    scoreOut = 0.0f;
    confidenceOut = 0.0f;
    regionOut = "";

    if (responseBody.length() == 0) {
      return false;
    }

    StaticJsonDocument<4096> doc;
    DeserializationError err = deserializeJson(doc, responseBody);
    if (err != DeserializationError::Ok) {
      return false;
    }

    JsonArray results = doc["results"].as<JsonArray>();
    if (results.isNull() || results.size() == 0) {
      return false;
    }

    JsonObject first = results[0];
    plateOut = String(first["plate"] | "");
    plateOut.trim();
    plateOut.toUpperCase();
    scoreOut = first["score"] | 0.0f;
    confidenceOut = first["dscore"] | 0.0f;
    regionOut = String(first["region"]["code"] | "");

    return plateOut.length() > 0;
  }

  void persistPlateRecognitionResult(
    const char* trigger,
    bool requestOk,
    int httpCode,
    const String& responseBody,
    bool hasPlate,
    const String& plate,
    float score,
    float confidence,
    const String& region
  ) {
    String eventId = String(DEVICE_ID) + "-pr-" + String(millis()) + "-" + String(static_cast<uint32_t>(esp_random()), HEX);
    String normalizedPlate = plate;
    normalizedPlate.trim();
    normalizedPlate.toUpperCase();
    String recognitionStatusCode;
    String recognitionStatusMessage;

    if (!requestOk) {
      recognitionStatusCode = "error_consulta_plate_recognizer";
      recognitionStatusMessage = "Error consultando Plate Recognizer";
    } else if (hasPlate) {
      recognitionStatusCode = "patente_identificada_correctamente";
      recognitionStatusMessage = "La patente se identifico correctamente";
    } else {
      recognitionStatusCode = "no_existe_patente_en_foto";
      recognitionStatusMessage = "No existe patente en foto";
    }

    StaticJsonDocument<4096> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["accessPoint"] = ACCESS_POINT;
    doc["trigger"] = trigger;
    doc["capturedAt"] = nowIsoUtc();
    doc["capturedAtEpochMs"] = nowEpochMs();
    JsonObject capturedAtServer = doc.createNestedObject("capturedAtServer");
    capturedAtServer[".sv"] = "timestamp";

    doc["requestOk"] = requestOk;
    doc["httpCode"] = httpCode;
    doc["hasPlate"] = hasPlate && normalizedPlate.length() > 0;
    doc["plate"] = normalizedPlate;
    doc["score"] = score;
    doc["confidence"] = confidence;
    doc["region"] = region;
    doc["recognitionStatusCode"] = recognitionStatusCode;
    doc["recognitionStatusMessage"] = recognitionStatusMessage;

    doc["entryDistanceCm"] = entryDistanceCm;
    doc["exitDistanceCm"] = exitDistanceCm;
    doc["entrySensorActive"] = entryActive;
    doc["exitSensorActive"] = exitActive;
    doc["mode"] = barrierMode;
    doc["barrierStatus"] = barrierStatus;

    doc["plateApiRaw"] = clipForStorage(responseBody, MAX_PLATE_API_RESPONSE_STORED);

    String payload;
    serializeJson(doc, payload);

    // Usa cola/reintento para evitar perder lecturas por fallas transitorias (token/WiFi/http=-1).
    if (!plateReadingQueue.pending) {
      plateReadingQueue.pending = true;
      plateReadingQueue.eventId = eventId;
      plateReadingQueue.payload = payload;
      plateReadingQueue.attempts = 0;
      plateReadingQueue.nextRetryAt = millis();
    } else {
      Serial.printf("[PLATE] cola ocupada, se prioriza evento pendiente id=%s\n",
                    plateReadingQueue.eventId.c_str());
    }

    flushPlateReadingQueue();

    if (plateReadingQueue.pending && plateReadingQueue.eventId == eventId) {
      Serial.printf("[PLATE] guardado pendiente en cola (path=ingest/plate_readings/%s)\n", eventId.c_str());
    }
  }

  void logServoFlow(const char* phase, const char* actor, const char* reason) {
    if (!DEBUG_SERVO_FLOW) return;
    Serial.printf("[SERVO] %s | actor=%s | reason=%s | mode=%s | status=%s | entryAct=%d | exitAct=%d\n",
                  phase,
                  actor,
                  reason,
                  barrierMode.c_str(),
                  barrierStatus.c_str(),
                  entryActive ? 1 : 0,
                  exitActive ? 1 : 0);
  }

  void moveServoToAngle(int targetAngle) {
    targetAngle = constrain(targetAngle, 0, 180);

    if (!barrierServo.attached()) {
      barrierServo.attach(PIN_SERVO);
    }

    if (!SERVO_SMOOTH_MOVE) {
      barrierServo.write(targetAngle);
      servoCurrentAngle = targetAngle;
    } else {
      int startAngle = servoCurrentAngle;
      if (startAngle == targetAngle) {
        barrierServo.write(targetAngle);
      } else {
        int direction = (targetAngle > startAngle) ? 1 : -1;
        int step = max(1, SERVO_STEP_DEG);
        int angle = startAngle;
        while (angle != targetAngle) {
          angle += direction * step;
          if ((direction > 0 && angle > targetAngle) || (direction < 0 && angle < targetAngle)) {
            angle = targetAngle;
          }
          barrierServo.write(angle);
          servoCurrentAngle = angle;
          delay(SERVO_STEP_DELAY_MS);
        }
      }
    }

    delay(SERVO_SETTLE_MS);
    if (SERVO_DETACH_WHEN_IDLE) {
      barrierServo.detach();
    }
  }

// -------------------- Firebase REST auth/data --------------------
bool firebaseAuthIsLocked() {
  if (firebaseAuthLockedUntil == 0) {
    return false;
  }
  if (millisReached(firebaseAuthLockedUntil)) {
    firebaseAuthLockedUntil = 0;
    return false;
  }
  return true;
}

void setFirebaseAuthLock(unsigned long lockMs, const char* reason) {
  if (lockMs < FIREBASE_AUTH_LOCK_BASE_MS) {
    lockMs = FIREBASE_AUTH_LOCK_BASE_MS;
  }
  if (lockMs > FIREBASE_AUTH_LOCK_MAX_MS) {
    lockMs = FIREBASE_AUTH_LOCK_MAX_MS;
  }
  firebaseAuthLockMs = lockMs;
  firebaseAuthLockedUntil = millis() + lockMs;
  Serial.printf("[AUTH] lock activado por %lu ms (%s)\n", lockMs, reason);
}

void escalateFirebaseAuthLock(const char* reason) {
  unsigned long nextLockMs = firebaseAuthLockMs;
  if (nextLockMs < FIREBASE_AUTH_LOCK_BASE_MS) {
    nextLockMs = FIREBASE_AUTH_LOCK_BASE_MS;
  }
  if (nextLockMs < FIREBASE_AUTH_LOCK_MAX_MS) {
    nextLockMs = min(FIREBASE_AUTH_LOCK_MAX_MS, nextLockMs * 2UL);
  }
  setFirebaseAuthLock(nextLockMs, reason);
}

bool firebaseSignInWithEmailPassword() {
  if (!isWifiConnected()) {
    Serial.println("[AUTH] signIn cancelado: WiFi no conectado");
      return false;
    }

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);

    String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + String(FIREBASE_API_KEY);
    if (!http.begin(client, url)) {
      Serial.println("[AUTH] signIn cancelado: http.begin fallo");
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
    Serial.printf("[AUTH] signIn HTTP %d body=%s\n",
                  code,
                  clipForStorage(response, MAX_FIREBASE_ERROR_BODY_LOG).c_str());
    if (response.indexOf("TOO_MANY_ATTEMPTS_TRY_LATER") >= 0) {
      escalateFirebaseAuthLock("TOO_MANY_ATTEMPTS_TRY_LATER");
    } else if (response.indexOf("INVALID_LOGIN_CREDENTIALS") >= 0 ||
               response.indexOf("INVALID_PASSWORD") >= 0 ||
               response.indexOf("EMAIL_NOT_FOUND") >= 0 ||
               response.indexOf("USER_DISABLED") >= 0) {
      setFirebaseAuthLock(FIREBASE_AUTH_LOCK_MAX_MS, "credenciales invalidas o usuario deshabilitado");
    }
    return false;
  }

    StaticJsonDocument<2048> doc;
    if (deserializeJson(doc, response) != DeserializationError::Ok) {
      Serial.println("[AUTH] signIn respuesta JSON invalida");
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
  firebaseAuthLockedUntil = 0;
  firebaseAuthLockMs = FIREBASE_AUTH_LOCK_BASE_MS;
  Serial.printf("[AUTH] signIn ok expiresIn=%lu\n", expiresInSeconds);
  return true;
}

  bool firebaseRefreshIdToken() {
    if (!isWifiConnected()) {
      Serial.println("[AUTH] refresh cancelado: WiFi no conectado");
      return false;
    }
    if (firebaseRefreshToken.length() == 0) {
      Serial.println("[AUTH] refresh cancelado: refresh_token vacio");
      return false;
    }

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);

    String url = "https://securetoken.googleapis.com/v1/token?key=" + String(FIREBASE_API_KEY);
    if (!http.begin(client, url)) {
      Serial.println("[AUTH] refresh cancelado: http.begin fallo");
      return false;
    }

    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    String body = "grant_type=refresh_token&refresh_token=" + urlEncode(firebaseRefreshToken);
    int code = http.POST(body);
    String response = http.getString();
    http.end();

  if (code < 200 || code >= 300) {
    Serial.printf("[AUTH] refresh HTTP %d body=%s\n",
                  code,
                  clipForStorage(response, MAX_FIREBASE_ERROR_BODY_LOG).c_str());
    if (response.indexOf("TOO_MANY_ATTEMPTS_TRY_LATER") >= 0) {
      escalateFirebaseAuthLock("refresh TOO_MANY_ATTEMPTS_TRY_LATER");
    }
    return false;
  }

    StaticJsonDocument<2048> doc;
    if (deserializeJson(doc, response) != DeserializationError::Ok) {
      Serial.println("[AUTH] refresh respuesta JSON invalida");
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
  firebaseAuthLockedUntil = 0;
  firebaseAuthLockMs = FIREBASE_AUTH_LOCK_BASE_MS;
  Serial.printf("[AUTH] refresh ok expiresIn=%lu\n", expiresInSeconds);
  return true;
}

bool ensureFirebaseIdToken() {
  if (!isWifiConnected()) return false;
  if (firebaseAuthIsLocked()) return false;

    if (firebaseIdToken.length() == 0) {
      if (millis() - lastFirebaseAuthAttemptAt < FIREBASE_AUTH_RETRY_MS) {
        return false;
      }
      lastFirebaseAuthAttemptAt = millis();
      return firebaseSignInWithEmailPassword();
    }

    if (firebaseTokenRefreshAt == 0 || millisReached(firebaseTokenRefreshAt)) {
    if (firebaseRefreshIdToken()) {
      return true;
    }
      firebaseIdToken = "";
      firebaseTokenRefreshAt = 0;
      if (millis() - lastFirebaseAuthAttemptAt < FIREBASE_AUTH_RETRY_MS) {
        return false;
      }
      lastFirebaseAuthAttemptAt = millis();
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

  bool firebaseRequest(const String& method, const String& path, const String& payload, String* responseOut, int* statusCodeOut) {
    if (statusCodeOut != nullptr) {
      *statusCodeOut = -1;
    }
    if (responseOut != nullptr) {
      *responseOut = "";
    }

    for (uint8_t attempt = 0; attempt < FIREBASE_REQUEST_MAX_ATTEMPTS; attempt++) {
      if (!isWifiConnected()) {
        connectWifi();
        if (!isWifiConnected()) {
          if (attempt < (FIREBASE_REQUEST_MAX_ATTEMPTS - 1)) {
            delay(FIREBASE_REQUEST_RETRY_MS * (attempt + 1));
            continue;
          }
          Serial.printf("[FIREBASE] %s %s cancelado: WiFi no conectado\n", method.c_str(), path.c_str());
          return false;
        }
      }

    if (!ensureFirebaseIdToken()) {
      if (firebaseAuthIsLocked()) {
        Serial.printf("[FIREBASE] %s %s cancelado: auth en cooldown\n", method.c_str(), path.c_str());
        return false;
      }
      if (attempt < (FIREBASE_REQUEST_MAX_ATTEMPTS - 1)) {
        delay(FIREBASE_REQUEST_RETRY_MS * (attempt + 1));
        continue;
        }
        Serial.printf("[FIREBASE] %s %s cancelado: token no disponible\n", method.c_str(), path.c_str());
        return false;
      }

      WiFiClientSecure client;
      client.setInsecure();

      HTTPClient http;
      http.setTimeout(HTTP_TIMEOUT_MS);

      if (!http.begin(client, firebaseDbUrl(path))) {
        Serial.printf("[FIREBASE] %s %s cancelado: http.begin fallo (heap=%u)\n",
                      method.c_str(),
                      path.c_str(),
                      static_cast<unsigned>(ESP.getFreeHeap()));
        if (statusCodeOut != nullptr) {
          *statusCodeOut = -1;
        }
        if (attempt < (FIREBASE_REQUEST_MAX_ATTEMPTS - 1)) {
          delay(FIREBASE_REQUEST_RETRY_MS * (attempt + 1));
          continue;
        }
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

      if (statusCodeOut != nullptr) {
        *statusCodeOut = code;
      }

      if (responseOut != nullptr) {
        *responseOut = response;
      }

      if (code < 0) {
        String errTxt = HTTPClient::errorToString(code);
        Serial.printf("[FIREBASE] %s %s transporte error=%d (%s)\n",
                      method.c_str(),
                      path.c_str(),
                      code,
                      errTxt.c_str());
        if (attempt < (FIREBASE_REQUEST_MAX_ATTEMPTS - 1)) {
          delay(FIREBASE_REQUEST_RETRY_MS * (attempt + 1));
          continue;
        }
        return false;
      }

      if (code == 401 && attempt < (FIREBASE_REQUEST_MAX_ATTEMPTS - 1)) {
        firebaseTokenRefreshAt = 0;
        if (!firebaseRefreshIdToken()) {
          firebaseIdToken = "";
        }
        continue;
      }

      bool ok = (code >= 200 && code < 300);
      if (!ok) {
        Serial.printf("[FIREBASE] %s %s -> HTTP %d body=%s\n",
                      method.c_str(),
                      path.c_str(),
                      code,
                      clipForStorage(response, MAX_FIREBASE_ERROR_BODY_LOG).c_str());
        if (code >= 500 && attempt < (FIREBASE_REQUEST_MAX_ATTEMPTS - 1)) {
          delay(FIREBASE_REQUEST_RETRY_MS * (attempt + 1));
          continue;
        }
      }

      return ok;
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

  // -------------------- Sensors & connectivity --------------------
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
    if (isWifiConnected()) return;

    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.persistent(false);
    Serial.printf("[WIFI] conectando a %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startAt = millis();
    while (!isWifiConnected() && (millis() - startAt) < 15000) {
      delay(300);
    }

    if (isWifiConnected()) {
      String ip = WiFi.localIP().toString();
      Serial.printf("[WIFI] conectado ip=%s rssi=%ld\n", ip.c_str(), WiFi.RSSI());
    } else {
      Serial.printf("[WIFI] conexion fallida status=%d\n", static_cast<int>(WiFi.status()));
    }
  }

  void syncNtp() {
    if (!ENABLE_NTP_SYNC) return;
    if (!isWifiConnected()) return;

    configTime(0, 0, "pool.ntp.org", "time.nist.gov");

    unsigned long startAt = millis();
    while ((time(nullptr) < 1700000000) && (millis() - startAt < 5000)) {
      delay(250);
    }
    lastNtpSyncAt = millis();
  }

  // -------------------- Barrier state & event flow --------------------
  void writeBarrierSnapshot(const char* actor, const char* reason) {
    StaticJsonDocument<640> doc;
    doc["status"] = barrierStatus;
    doc["mode"] = barrierMode;
    doc["lastActionAt"] = nowIsoUtc();
    doc["lastActionEpochMs"] = nowEpochMs();
    JsonObject lastActionAtServer = doc.createNestedObject("lastActionAtServer");
    lastActionAtServer[".sv"] = "timestamp";
    doc["lastActionBy"] = actor;
    doc["reason"] = reason;
    doc["crossingDirection"] = directionToString(crossingDirection);
    doc["crossingState"] = sequenceStateToString(crossingState);

    String payload;
    serializeJson(doc, payload);
    firebasePatch(String("barrier/") + ACCESS_POINT, payload);
  }

  void openBarrier(const char* actor, const char* reason) {
    if (barrierStatus == "abierta") {
      logServoFlow("open skipped (already open)", actor, reason);
      return;
    }
    logServoFlow("open start", actor, reason);
    moveServoToAngle(SERVO_OPEN_ANGLE);
    barrierStatus = "abierta";
    barrierOpenedAtMs = millis();
    logServoFlow("open done", actor, reason);
    writeBarrierSnapshot(actor, reason);
  }

  void closeBarrier(const char* actor, const char* reason) {
    if (barrierStatus == "cerrada") {
      logServoFlow("close skipped (already closed)", actor, reason);
      return;
    }
    if (entryActive || exitActive) {
      logServoFlow("close blocked (sensor active)", actor, reason);
      return;
    }
    logServoFlow("close start", actor, reason);
    moveServoToAngle(SERVO_CLOSED_ANGLE);
    barrierStatus = "cerrada";
    logServoFlow("close done", actor, reason);
    writeBarrierSnapshot(actor, reason);
  }

  void forceToggleBarrier(const char* actor, const char* reason) {
    if (barrierStatus == "abierta") {
      logServoFlow("force close start", actor, reason);
      moveServoToAngle(SERVO_CLOSED_ANGLE);
      barrierStatus = "cerrada";
      barrierOpenedAtMs = 0;
      logServoFlow("force close done", actor, reason);
      writeBarrierSnapshot(actor, reason);
      return;
    }

    logServoFlow("force open start", actor, reason);
    moveServoToAngle(SERVO_OPEN_ANGLE);
    barrierStatus = "abierta";
    barrierOpenedAtMs = millis();
    logServoFlow("force open done", actor, reason);
    writeBarrierSnapshot(actor, reason);
  }

  void ackCommand(const String& requestId, const char* status, const char* message) {
    StaticJsonDocument<384> doc;
    doc["requestId"] = requestId;
    doc["status"] = status;
    doc["message"] = message;
    doc["processedAt"] = nowIsoUtc();
    doc["processedAtEpochMs"] = nowEpochMs();
    JsonObject processedAtServer = doc.createNestedObject("processedAtServer");
    processedAtServer[".sv"] = "timestamp";

    String payload;
    serializeJson(doc, payload);
    firebasePatch(String("devices/") + DEVICE_ID + "/lastCommandAck", payload);
  }

  void queueDetectionEvent(const char* trigger, const char* directionHint) {
    if (detectionQueue.pending) return;

    String eventId = String(DEVICE_ID) + "-" + String(millis()) + "-" + String(static_cast<uint32_t>(esp_random()), HEX);

    StaticJsonDocument<768> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["accessPoint"] = ACCESS_POINT;
    doc["capturedAt"] = nowIsoUtc();
    doc["capturedAtEpochMs"] = nowEpochMs();
    JsonObject capturedAtServer = doc.createNestedObject("capturedAtServer");
    capturedAtServer[".sv"] = "timestamp";
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

  void clearDetectionQueue() {
    detectionQueue.pending = false;
    detectionQueue.eventId = "";
    detectionQueue.payload = "";
    detectionQueue.attempts = 0;
    detectionQueue.nextRetryAt = 0;
  }

  void flushDetectionQueue() {
    if (!detectionQueue.pending) return;
    if (millis() < detectionQueue.nextRetryAt) return;
    if (!isWifiConnected()) return;

    bool ok = firebasePut(String("ingest/detections/") + detectionQueue.eventId, detectionQueue.payload);
    if (ok) {
      clearDetectionQueue();
      return;
    }

    detectionQueue.attempts++;
    if (detectionQueue.attempts >= MAX_RETRY_ATTEMPTS) {
      clearDetectionQueue();
      return;
    }
    detectionQueue.nextRetryAt = millis() + (RETRY_BASE_MS * detectionQueue.attempts);
  }

  void clearPlateReadingQueue() {
    plateReadingQueue.pending = false;
    plateReadingQueue.eventId = "";
    plateReadingQueue.payload = "";
    plateReadingQueue.attempts = 0;
    plateReadingQueue.nextRetryAt = 0;
  }

  void flushPlateReadingQueue() {
    if (!plateReadingQueue.pending) return;
    if (millis() < plateReadingQueue.nextRetryAt) return;
    if (!isWifiConnected()) return;

    int dbStatusCode = -1;
    String dbResponse;
    bool ok = firebaseRequest(
      "PUT",
      String("ingest/plate_readings/") + plateReadingQueue.eventId,
      plateReadingQueue.payload,
      &dbResponse,
      &dbStatusCode
    );

    if (ok) {
      Serial.printf("[PLATE] guardado en Realtime DB (path=ingest/plate_readings/%s)\n",
                    plateReadingQueue.eventId.c_str());
      clearPlateReadingQueue();
      return;
    }

    plateReadingQueue.attempts++;
    Serial.printf("[PLATE] no se pudo guardar en Realtime DB (path=ingest/plate_readings/%s http=%d body=%s attempt=%u)\n",
                  plateReadingQueue.eventId.c_str(),
                  dbStatusCode,
                  clipForStorage(dbResponse, MAX_FIREBASE_ERROR_BODY_LOG).c_str(),
                  plateReadingQueue.attempts);

    if (dbStatusCode == 401 || dbStatusCode == 403 || dbResponse.indexOf("PERMISSION_DENIED") >= 0) {
      Serial.println("[PLATE] revisar RTDB rules/claims para permitir escritura en ingest/plate_readings");
    }

    if (plateReadingQueue.attempts >= MAX_RETRY_ATTEMPTS) {
      Serial.printf("[PLATE] descartado por max retries id=%s\n", plateReadingQueue.eventId.c_str());
      clearPlateReadingQueue();
      return;
    }

    plateReadingQueue.nextRetryAt = millis() + (RETRY_BASE_MS * plateReadingQueue.attempts);
  }

  // -------------------- Passage state machine --------------------
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

  // -------------------- Inputs, commands, and control --------------------
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

    if (DEBUG_DISTANCE_LOG && (millis() - lastDistanceLogAt >= DEBUG_DISTANCE_LOG_MS)) {
      Serial.printf("Dist entrada=%.1fcm act=%d\n",
                    entryDistanceCm, entryActive ? 1 : 0);
      lastDistanceLogAt = millis();
    }

    if (!prevEntryActive && entryActive) {
      queueDetectionEvent("entry_rising_edge", "ingreso");
      capturePhoto("entry_rising_edge");
    }
    if (HAS_EXIT_SENSOR && !prevExitActive && exitActive) {
      queueDetectionEvent("exit_rising_edge", "salida");
      capturePhoto("exit_rising_edge");
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
        Serial.println("[SERVO] physical button press -> toggle open/close");
        if (barrierMode != "manual_fisico") {
          Serial.printf("[SERVO] forcing mode to manual_fisico from %s\n", barrierMode.c_str());
          barrierMode = "manual_fisico";
          writeBarrierSnapshot("manual_fisico_forzado", "Physical button forced manual mode");
        }
        forceToggleBarrier("manual_fisico_forzado", "Physical button forced actuation");

        // Evita reapertura inmediata si quedo una ventana remota activa.
        firebasePatch(String("commands/") + ACCESS_POINT, "{\"action\":\"none\",\"autoOpenUntil\":0}");
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
      Serial.printf("[CMD] mode change: %s -> %s\n", barrierMode.c_str(), mode.c_str());
      barrierMode = mode;
      writeBarrierSnapshot("dashboard", "Mode updated from command node");
    }

    if (requestId.length() > 0 && requestId != lastCommandRequestId) {
      Serial.printf("[CMD] requestId=%s action=%s mode=%s\n",
                    requestId.c_str(),
                    action.c_str(),
                    barrierMode.c_str());
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
      bool windowActiveWithClock = (nowMs > 0 && nowMs <= autoOpenUntil);
      bool windowActiveWithoutClock =
        (nowMs == 0 && requestId.length() > 0 && requestId != lastAutoOpenWindowRequestId);

      if (windowActiveWithClock) {
        Serial.printf("[CMD] auto-open window active (now=%lld <= until=%lld)\n", nowMs, autoOpenUntil);
      } else if (windowActiveWithoutClock) {
        Serial.printf("[CMD] auto-open fallback without NTP (requestId=%s)\n", requestId.c_str());
      }

      if (windowActiveWithClock || windowActiveWithoutClock) {
        openBarrier("automatico", "Authorized auto-open window");
        if (requestId.length() > 0) {
          lastAutoOpenWindowRequestId = requestId;
        }
      }
    }
  }

  void pollRuntimeSettings() {
    String response;
    if (!firebaseGet("settings", response)) {
      return;
    }
    if (response == "null" || response.length() == 0) {
      return;
    }

    StaticJsonDocument<384> doc;
    if (deserializeJson(doc, response) != DeserializationError::Ok) {
      return;
    }

    unsigned long nextCaptureSeconds = doc["captureIntervalSeconds"] | 0UL;
    if (nextCaptureSeconds > 0) {
      unsigned long boundedSeconds = constrain(nextCaptureSeconds, 1UL, 120UL);
      unsigned long nextCaptureMs = boundedSeconds * 1000UL;
      if (nextCaptureMs != captureCooldownMs) {
        Serial.printf(
          "[SETTINGS] captureIntervalSeconds=%lu (cooldownMs=%lu)\n",
          boundedSeconds,
          nextCaptureMs
        );
        captureCooldownMs = nextCaptureMs;
      }
    }

    unsigned long nextAutoCloseSeconds = doc["barrierAutoCloseSeconds"] | 0UL;
    if (nextAutoCloseSeconds > 0) {
      unsigned long boundedSeconds = constrain(nextAutoCloseSeconds, 1UL, 300UL);
      unsigned long nextAutoCloseMs = boundedSeconds * 1000UL;
      if (nextAutoCloseMs != barrierAutoCloseMs) {
        Serial.printf(
          "[SETTINGS] barrierAutoCloseSeconds=%lu (autoCloseMs=%lu)\n",
          boundedSeconds,
          nextAutoCloseMs
        );
        barrierAutoCloseMs = nextAutoCloseMs;
      }
    }
  }

  void runSettingsTask() {
    if (millis() - lastSettingsPollAt < SETTINGS_POLL_MS) return;
    pollRuntimeSettings();
    lastSettingsPollAt = millis();
  }

  void applyAutomaticClosureRule() {
    if (barrierMode != "automatico") return;
    if (barrierStatus != "abierta") return;
    if (entryActive || exitActive) return;

    if (millis() - barrierOpenedAtMs >= barrierAutoCloseMs) {
      Serial.println("[SERVO] failsafe close timeout reached");
      closeBarrier("automatico", "Failsafe close timeout");
    }
  }

  void publishHeartbeat(bool force) {
    if (!force && millis() - lastHeartbeatAt < HEARTBEAT_MS) return;
    if (!isWifiConnected()) return;

    StaticJsonDocument<1024> doc;
    doc["name"] = DEVICE_NAME;
    doc["type"] = "esp32_cam";
    doc["accessPoint"] = ACCESS_POINT;
    doc["status"] = "online";
    doc["mode"] = barrierMode;
    doc["signal"] = wifiSignalPercent();
    doc["firmware"] = FIRMWARE_VERSION;
    doc["lastSeen"] = nowIsoUtc();
    doc["lastSeenEpochMs"] = nowEpochMs();
    JsonObject lastSeenServer = doc.createNestedObject("lastSeenServer");
    lastSeenServer[".sv"] = "timestamp";

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

  // -------------------- Lifecycle tasks --------------------
  void setupHardware() {
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
    servoCurrentAngle = SERVO_CLOSED_ANGLE;
    delay(SERVO_SETTLE_MS);
    if (SERVO_DETACH_WHEN_IDLE) {
      barrierServo.detach();
    }

    barrierStatus = "cerrada";
    barrierOpenedAtMs = 0;
    resetCrossingSequence();
  }

  void setupConnectivityAndAuth() {
    connectWifi();
    if (!isWifiConnected()) return;

    syncNtp();
    ensureFirebaseIdToken();
    pollRuntimeSettings();
    lastSettingsPollAt = millis();
  }

  void runConnectivityTask() {
    if (millis() - lastWifiCheckAt < WIFI_RECONNECT_MS) return;

    if (!isWifiConnected()) {
      connectWifi();
    }

    if (ENABLE_NTP_SYNC && isWifiConnected() && (millis() - lastNtpSyncAt > 3600000)) {
      syncNtp();
    }

    lastWifiCheckAt = millis();
  }

  void runSensorTask() {
    if (millis() - lastSensorPollAt < SENSOR_POLL_MS) return;
    updateSensorsAndEvents();
    lastSensorPollAt = millis();
  }

  void runCommandTask() {
    if (millis() - lastCommandPollAt < COMMAND_POLL_MS) return;
    pollCommands();
    lastCommandPollAt = millis();
  }

  void setup() {
    Serial.begin(115200);
    randomSeed(esp_random());
    cameraReady = initCamera();

    setupHardware();
    setupConnectivityAndAuth();

    writeBarrierSnapshot("boot", "Device startup");
    publishHeartbeat(true);
  }

  void loop() {
    runConnectivityTask();

    processManualButton();

    runSensorTask();

    flushDetectionQueue();
    flushPlateReadingQueue();

    runSettingsTask();
    runCommandTask();

    applyAutomaticClosureRule();
    publishHeartbeat(false);
  }
