# ESP32 Gate Controller (LogiGate)

Firmware para el controlador fisico del porton:
- Sensor de aproximacion (ultrasonico).
- Sensor de seguridad bajo barrera (ultrasonico).
- Servo de barrera.
- Boton manual fisico.
- Sincronizacion con Firebase Realtime Database via REST.

## Hardware de referencia

- ESP32 DevKit (WROOM32)
- 2x HC-SR04
- 1x SG90 (o servo equivalente)
- 1x boton pulsador
- Fuente 5V externa (>= 2A recomendada para servo)

## Librerias Arduino

- `ArduinoJson` (>= 6)
- `ESP32Servo`

## Configuracion rapida

Editar en `esp32_gate_controller.ino`:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `FIREBASE_DB_URL`
- `FIREBASE_AUTH`
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

- `automatico`: abre por ventana autorizada (`autoOpenUntil`) y cierra por timeout seguro.
- `manual_remoto`: obedece comandos abrir/cerrar desde dashboard.
- `manual_fisico`: boton local controla abrir/cerrar.

## Seguridad operacional incorporada

- Si el sensor de seguridad detecta obstaculo, no permite cierre.
- Debounce de boton.
- Reintentos en cola para detecciones cuando hay fallas de red.
- Heartbeat periodico del dispositivo para monitoreo.

## Compilacion

1. Abrir Arduino IDE.
2. Seleccionar placa ESP32 Dev Module.
3. Instalar librerias requeridas.
4. Cargar `esp32_gate_controller.ino`.
5. Subir al dispositivo.

## Nota para produccion

HC-SR04 es util para prototipo. En ambiente industrial se recomienda radar FMCW + ToF/LiDAR industrial, con carcasa IP y validacion EMC.
