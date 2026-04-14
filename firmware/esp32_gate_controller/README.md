# ESP32 Gate Controller (LogiGate)

Firmware para el controlador fisico del porton:
- Sensor ultrasonico de entrada.
- Sensor ultrasonico de salida (opcional segun perfil).
- Captura de foto por trigger de sensor (ESP32-CAM AI Thinker, sin web server).
- Servo de barrera.
- Boton manual fisico.
- Sincronizacion con Firebase Realtime Database via REST.

## Hardware de referencia

- ESP32 DevKit (WROOM32) o ESP32-CAM
- 1x o 2x HC-SR04
- 1x SG90 (o servo equivalente)
- 1x boton pulsador
- Fuente 5V externa (>= 2A recomendada para servo)

## Perfiles de pines

En `esp32_gate_controller.ino`:

- `#define USE_ESP32_CAM_MINIMAL 1`:
  - `PIN_ENTRY_TRIG = GPIO14`
  - `PIN_ENTRY_ECHO = GPIO15`
  - `PIN_SERVO = GPIO13`
  - `PIN_MANUAL_BUTTON = GPIO2`
  - Sin sensor de salida fisico (`HAS_EXIT_SENSOR = false`)
  - Camara AI Thinker (OV3660/OV2640) inicializada en `setup()` con `esp_camera_init()`

- `#define USE_ESP32_CAM_MINIMAL 0`:
  - Perfil ESP32 DevKit con 2 sensores (entrada/salida).

## Librerias Arduino

- `ArduinoJson` (>= 6)
- `ESP32Servo`

## Configuracion rapida

Editar en `esp32_gate_controller.ino`:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `FIREBASE_DB_URL`
- `FIREBASE_API_KEY`
- `FIREBASE_USER_EMAIL`
- `FIREBASE_USER_PASSWORD`
- `DEVICE_ID`
- `ACCESS_POINT`

## Contrato Firebase usado por el firmware

Lectura:
- `commands/{accessPoint}`

Escritura:
- `devices/{deviceId}` (heartbeat + telemetria + ack)
- `barrier/{accessPoint}` (estado local del actuador)
- `ingest/detections/{eventId}` (disparos de presencia)

## Modos de operacion

- `automatico`: abre por ventana autorizada (`autoOpenUntil`) y cierra al completar secuencia de cruce (o por timeout seguro si hay 1 solo sensor).
- `manual_remoto`: obedece comandos abrir/cerrar desde dashboard.
- `manual_fisico`: boton local controla abrir/cerrar.

## Captura por trigger (sin stream)

- No usa `startCameraServer()` ni `CameraWebServer`.
- Inicializa camara al arrancar (`initCamera()`).
- Captura una foto en flanco de activacion:
  - entrada: `entry_rising_edge`
  - salida: `exit_rising_edge` (si hay sensor de salida)
- Cooldown anti-rafaga: `CAPTURE_COOLDOWN_MS = 3000`.

Nota: por ahora la imagen se captura y se reporta por `Serial`. Para persistencia debes agregar subida a backend o guardado en SD.

## Secuencia de cierre (ingreso)

Con barrera abierta, el cierre se ejecuta cuando se cumple:

1. Sensor entrada ON
2. Sensor entrada + salida ON
3. Sensor entrada OFF
4. Sensor salida OFF
5. Cerrar barrera

Para salida, la secuencia se evalua en orden inverso.

## Seguridad operacional incorporada

- No permite cierre mientras algun sensor de paso este activo.
- Debounce de boton.
- Reintentos en cola para detecciones cuando hay fallas de red.
- Heartbeat periodico del dispositivo para monitoreo.

## Estabilidad en ESP32-CAM

- `GPIO2` (boton) es pin delicado de arranque; evita dejarlo forzado a LOW durante boot.
- Prueba incremental recomendada:
  1) camara sola
  2) camara + servo
  3) luego ultrasonico y boton

## Compilacion

1. Abrir Arduino IDE.
2. Seleccionar placa ESP32 Dev Module.
3. Instalar librerias requeridas.
4. Cargar `esp32_gate_controller.ino`.
5. Subir al dispositivo.

## Nota para produccion

HC-SR04 es util para prototipo. En ambiente industrial se recomienda radar FMCW + ToF/LiDAR industrial, con carcasa IP y validacion EMC.

## comando curl a api 

curl -X POST "https://api.platerecognizer.com/v1/plate-reader/" -H "Authorization: Token 080b98ac5ff98b0c09b952c4070dc946fe4e7616" -F "upload=@camion.jpg" -F "regions=cl"

## respuesta de la api con curl

{"processing_time":61.706,"results":[{"box":{"xmin":162,"ymin":564,"xmax":231,"ymax":595},"plate":"tl1338","region":{"code":"cl","score":0.152},"score":0.999,"candidates":[{"score":0.999,"plate":"tl1338"}],"dscore":0.871,"vehicle":{"score":0.941,"type":"Big Truck","box":{"xmin":22,"ymin":75,"xmax":973,"ymax":695}}},{"box":{"xmin":20,"ymin":483,"xmax":59,"ymax":508},"plate":"vd5337","region":{"code":"cl","score":0.709},"score":0.992,"candidates":[{"score":0.992,"plate":"vd5337"}],"dscore":0.527,"vehicle":{"score":0.0,"type":"Unknown","box":{"xmin":0,"ymin":0,"xmax":0,"ymax":0}}}],"filename":"1258_1sLM3_camion.jpg","version":1,"camera_id":null,"timestamp":"2026-04-09T12:58:02.631999Z","image_width":1024,"image_height":767}
