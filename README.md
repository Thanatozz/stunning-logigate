# 🚛 Sistema IoT de Monitoreo de Acceso Vehicular

Sistema de monitoreo automatizado de ingreso y salida de camiones en una planta manufacturera, utilizando reconocimiento automático de patentes (ANPR) con ESP32-CAM, Firebase y Vue.js.

> **Asignatura:** Integración de Competencias III  
> **Equipo:** 5 integrantes  
> **Metodología:** Kanban (Trello)

---

## 📋 Descripción del Proyecto

Una pequeña empresa manufacturera necesita automatizar el control de acceso de camiones a su planta. El sistema detecta la llegada de un vehículo mediante un sensor infrarrojo, captura la imagen de su patente con un ESP32-CAM, la envía a Plate Recognizer para reconocimiento OCR, determina automáticamente si es ingreso o salida consultando el estado del vehículo en Firebase, y controla una barrera vehicular. Todo se visualiza en un dashboard web en tiempo real.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                   CAPA FÍSICA (PORTÓN)                  │
│                                                         │
│  [Sensor IR] → [ESP32-CAM + OV2640] → [Servo Barrera]  │
│       GPIO 13       Flash LED GPIO 4      GPIO 12       │
│                    [Botón Manual GPIO 15]                │
└──────────────────────┬──────────────────────────────────┘
                       │ WiFi / HTTPS
┌──────────────────────┴──────────────────────────────────┐
│                  SERVICIOS EN LA NUBE                    │
│                                                         │
│  [Plate Recognizer API] ←→ [Firebase Realtime DB]       │
│   OCR de patentes          [Firebase Auth]               │
│   2,500 lecturas/mes       [Firebase Hosting]            │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket
┌──────────────────────┴──────────────────────────────────┐
│                 CAPA DE PRESENTACIÓN                     │
│                                                         │
│  [Dashboard Web - Vue.js 3 + vue-chartjs]               │
│   Semáforo │ KPIs │ Gráficos │ Alertas │ Control Barrera│
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

### Hardware
| Componente | Función | GPIO | Costo |
|---|---|---|---|
| ESP32-CAM (AI-Thinker) | Microcontrolador + cámara OV2640 + WiFi + Flash LED | - | ~$6 |
| Sensor IR de obstáculo | Detecta presencia del vehículo | GPIO 13 | ~$1 |
| Servo motor SG90 | Simula barrera vehicular | GPIO 12 | ~$2 |
| Botón pulsador + resistencia | Apertura manual física de emergencia | GPIO 15 | ~$0.15 |
| Protoboard + cables | Conexiones | - | ~$3 |
| Adaptador FTDI | Programación del ESP32-CAM | - | ~$2 |
| **Total** | | | **~$14 USD** |

### Software / Servicios
| Tecnología | Uso | Costo |
|---|---|---|
| [Plate Recognizer](https://platerecognizer.com/) | OCR de patentes vehiculares | Gratis (2,500/mes) |
| [Firebase](https://firebase.google.com/) Realtime DB | Base de datos en tiempo real | Gratis (plan Spark) |
| [Firebase](https://firebase.google.com/) Auth | Autenticación y roles de usuario | Gratis |
| [Firebase](https://firebase.google.com/) Hosting | Hosting del dashboard | Gratis |
| [Vue.js 3](https://vuejs.org/) | Framework del dashboard | Gratis |
| [vue-chartjs](https://vue-chartjs.org/) | Gráficos interactivos | Gratis |
| [Vue Router](https://router.vuejs.org/) | Navegación SPA | Gratis |

---

## 📂 Estructura del Proyecto

```
iot-access-control/
├── README.md
├── docs/                          # Documentación del proyecto
│   ├── Plan_Proyecto_1.2.pdf
│   ├── Compendio_Tecnico_1.3.pdf
│   └── diagramas/
│       ├── arquitectura_general.png
│       └── hardware_iot.png
│
├── firmware/                      # Código del ESP32-CAM (Arduino IDE)
│   └── access_control/
│       ├── access_control.ino     # Código principal
│       ├── config.h               # Credenciales WiFi, API keys
│       ├── camera.h               # Configuración de cámara OV2640
│       ├── plate_recognizer.h     # Integración con API de Plate Recognizer
│       ├── firebase_client.h      # Comunicación con Firebase
│       ├── barrier_control.h      # Control del servo (barrera)
│       └── ir_sensor.h            # Lectura del sensor infrarrojo
│
├── dashboard/                     # Dashboard web (Vue.js 3)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── main.js                # Entry point
│   │   ├── App.vue                # Componente raíz
│   │   ├── router/
│   │   │   └── index.js           # Definición de rutas
│   │   ├── firebase/
│   │   │   └── config.js          # Configuración de Firebase SDK
│   │   ├── composables/           # Lógica reutilizable (Vue 3 Composition API)
│   │   │   ├── useAuth.js         # Login, logout, roles
│   │   │   ├── useVehicles.js     # CRUD de vehículos
│   │   │   ├── useRecords.js      # Registros de acceso en tiempo real
│   │   │   ├── useAlerts.js       # Motor de alertas
│   │   │   ├── useBarrier.js      # Control de barrera remoto
│   │   │   └── useStats.js        # Estadísticas y reportes
│   │   ├── views/                 # Pantallas principales
│   │   │   ├── LoginView.vue
│   │   │   ├── DashboardView.vue
│   │   │   ├── HistoryView.vue
│   │   │   ├── ReportsView.vue
│   │   │   ├── AlertsView.vue
│   │   │   ├── VehiclesView.vue
│   │   │   └── SettingsView.vue
│   │   ├── components/            # Componentes reutilizables
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.vue
│   │   │   │   ├── Header.vue
│   │   │   │   └── MainLayout.vue
│   │   │   ├── dashboard/
│   │   │   │   ├── KpiCard.vue
│   │   │   │   ├── TrafficLight.vue
│   │   │   │   ├── ActivityChart.vue
│   │   │   │   ├── TrucksTable.vue
│   │   │   │   ├── AlertsPanel.vue
│   │   │   │   └── BarrierControl.vue
│   │   │   ├── history/
│   │   │   │   ├── FilterBar.vue
│   │   │   │   └── RecordsTable.vue
│   │   │   ├── reports/
│   │   │   │   ├── DailySummary.vue
│   │   │   │   ├── TrendChart.vue
│   │   │   │   └── ComparisonChart.vue
│   │   │   ├── vehicles/
│   │   │   │   ├── VehicleForm.vue
│   │   │   │   └── VehicleTable.vue
│   │   │   └── common/
│   │   │       ├── DataTable.vue
│   │   │       ├── StatusBadge.vue
│   │   │       ├── ExportButton.vue
│   │   │       └── ConfirmDialog.vue
│   │   └── assets/
│   │       └── styles/
│   │           └── main.css
│   └── firebase.json              # Config de Firebase Hosting
│
└── .gitignore
```

---

## 📊 Requerimientos Funcionales

### Módulo de Gestión de Vehículos (RF-01 a RF-04)
- [ ] RF-01: Registrar camiones (patente, empresa, tipo de carga, capacidad)
- [ ] RF-02: Editar y eliminar registros de camiones
- [ ] RF-03: Asociar camión a empresa transportista
- [ ] RF-04: Clasificar vehículos por categoría

### Módulo de Detección, Reconocimiento y Registro (RF-05 a RF-13)
- [ ] RF-05: Detectar presencia de vehículo con sensor IR (GPIO 13)
- [ ] RF-06: Capturar imagen JPEG con OV2640 al detectar presencia
- [ ] RF-07: Enviar imagen a Plate Recognizer API y obtener patente
- [ ] RF-08: Determinar ingreso/salida por estado en Firebase (stateful event detection)
- [ ] RF-09: Registrar evento con timestamp, patente, tipoEvento, puntoAcceso, confianzaOCR
- [ ] RF-10: Calcular tiempo de permanencia automáticamente
- [ ] RF-11: Soportar múltiples portones independientes
- [ ] RF-12: Filtrar falsos positivos (confianza < 80% o patente no registrada)
- [ ] RF-13: Registro manual de respaldo

### Módulo de Comunicación IoT y Nube (RF-14 a RF-18)
- [ ] RF-14: Enviar datos a Firebase vía HTTPS (TLS 1.2+)
- [ ] RF-15: Almacenar datos estructurados en Firebase
- [ ] RF-16: Buffer local ante pérdida de conexión WiFi
- [ ] RF-17: Validar integridad de datos (evitar duplicados)
- [ ] RF-18: Registrar logs de conectividad del ESP32-CAM

### Módulo de Dashboard y Visualización (RF-19 a RF-25)
- [ ] RF-19: Mostrar cantidad de camiones en planta (tiempo real)
- [ ] RF-20: Listado de camiones presentes con hora de ingreso y tiempo acumulado
- [ ] RF-21: Gráficos de barras/líneas de ingresos/salidas por hora (vue-chartjs)
- [ ] RF-22: Semáforo de ocupación (verde/amarillo/rojo)
- [ ] RF-23: Estado de conexión de dispositivos IoT (online/offline)
- [ ] RF-24: Visualización simultánea tabla + gráfico
- [ ] RF-25: Dashboard responsive (Vue.js 3, mobile + desktop)

### Módulo de Alertas y Notificaciones (RF-26 a RF-31)
- [ ] RF-26: Alerta por exceso de camiones (umbral configurable)
- [ ] RF-27: Alerta por permanencia excesiva (tiempo configurable)
- [ ] RF-28: Alerta por pérdida de conexión de dispositivo IoT
- [ ] RF-29: Alerta de inconsistencia (ingreso duplicado / salida sin ingreso)
- [ ] RF-30: Alertas visibles en dashboard (banner, color, sonido)
- [ ] RF-31: Historial de alertas con estado (activa/resuelta/ignorada)

### Módulo de Reportes e Historial (RF-32 a RF-36)
- [ ] RF-32: Consultar historial filtrado por rango de fechas
- [ ] RF-33: Filtrar por camión, empresa o punto de acceso
- [ ] RF-34: Reporte resumen diario (ingresos, salidas, tiempo promedio, hora pico)
- [ ] RF-35: Exportar reportes en CSV y PDF
- [ ] RF-36: Estadísticas comparativas entre períodos

### Módulo de Usuarios y Seguridad (RF-37 a RF-39)
- [ ] RF-37: Login con email/contraseña (Firebase Auth)
- [ ] RF-38: Roles: Administrador (full) y Supervisor (solo lectura)
- [ ] RF-39: Log de auditoría de acciones por usuario

### Módulo de Configuración (RF-40 a RF-43)
- [ ] RF-40: Configurar umbrales de alertas
- [ ] RF-41: Administrar puntos de acceso (portones)
- [ ] RF-42: Configurar intervalo de captura del ESP32-CAM
- [ ] RF-43: Configurar umbral mínimo de confianza OCR (default 80%)

### Módulo de Control de Barrera (RF-44 a RF-51)
- [ ] RF-44: Controlar barrera (servo motor) vía GPIO 12
- [ ] RF-45: Modo automático: abrir al detectar vehículo autorizado, cerrar tras tiempo configurable
- [ ] RF-46: Modo manual remoto: abrir/cerrar desde dashboard vía Firebase
- [ ] RF-47: Modo manual físico: botón pulsador GPIO 15 para emergencias
- [ ] RF-48: Cambiar entre los tres modos desde el dashboard
- [ ] RF-49: Registrar cada apertura/cierre (modo, timestamp, usuario)
- [ ] RF-50: Mostrar estado de barrera (abierta/cerrada) en tiempo real
- [ ] RF-51: No abrir barrera si vehículo no autorizado (modo automático)

---

## 🗄️ Estructura de Datos en Firebase

```json
{
  "registros": {
    "<auto_id>": {
      "patente": "AB-1234",
      "timestamp": 1711700000,
      "tipoEvento": "ingreso",
      "puntoAcceso": "porton_norte",
      "confianzaOCR": 97.5,
      "modoApertura": "automatico",
      "dispositivoId": "ESP32-CAM-001"
    }
  },
  "vehiculos": {
    "AB-1234": {
      "empresa": "Transportes Chile SpA",
      "tipoCarga": "materia_prima",
      "categoria": "carga_pesada",
      "fechaRegistro": 1711600000,
      "activo": true
    }
  },
  "estadoPlanta": {
    "vehiculosPresentes": {
      "AB-1234": {
        "horaIngreso": 1711700000,
        "puntoIngreso": "porton_norte"
      }
    },
    "contadorActual": 3
  },
  "alertas": {
    "<auto_id>": {
      "tipo": "permanencia_excesiva",
      "descripcion": "Camión AB-1234 lleva más de 8 horas en planta",
      "severidad": "warning",
      "estado": "activa",
      "timestamp": 1711730000,
      "patenteRelacionada": "AB-1234"
    }
  },
  "usuarios": {
    "<uid>": {
      "email": "supervisor@planta.cl",
      "rol": "supervisor",
      "ultimoAcceso": 1711700000
    }
  },
  "configuracion": {
    "maxCamiones": 20,
    "tiempoMaxPermanencia": 480,
    "intervaloCaptura": 5,
    "umbralConfianza": 80,
    "tiempoCierreBarrera": 10
  },
  "comandos": {
    "porton_norte": {
      "abrirBarrera": false,
      "modo": "automatico"
    }
  },
  "dispositivos": {
    "ESP32-CAM-001": {
      "puntoAcceso": "porton_norte",
      "estado": "online",
      "ultimoPing": 1711700000,
      "ip": "192.168.1.50"
    }
  }
}
```

---

## 🖥️ Pantallas del Dashboard

### Acceso por Rol

| Pantalla | Ruta | Administrador | Supervisor |
|---|---|---|---|
| Login | `/login` | ✅ | ✅ |
| Dashboard | `/` | ✅ | ✅ |
| Historial | `/history` | ✅ | ✅ |
| Reportes | `/reports` | ✅ | ✅ |
| Alertas | `/alerts` | ✅ | ✅ |
| Vehículos | `/vehicles` | ✅ (CRUD) | ✅ (solo lectura) |
| Configuración | `/settings` | ✅ | ❌ |

### Componentes del Dashboard Principal

```
┌─────────────────────────────────────────────────────┐
│  [Sidebar]  │          HEADER + Usuario              │
│             │─────────────────────────────────────────│
│  Dashboard  │  [KPI: En planta] [KPI: Ingresos hoy]  │
│  Historial  │  [KPI: Salidas hoy] [KPI: Tiempo prom] │
│  Reportes   │─────────────────────────────────────────│
│  Alertas    │  [Semáforo]  │  [Gráfico actividad/h]  │
│  Vehículos  │─────────────────────────────────────────│
│  Config     │  [Tabla camiones en planta]              │
│             │─────────────────────────────────────────│
│             │  [Panel alertas activas] [Ctrl Barrera]  │
└─────────────┴─────────────────────────────────────────┘
```

---

## 🚀 Setup Rápido

### 1. Clonar el repositorio
```bash
git clone https://github.com/[tu-usuario]/iot-access-control.git
cd iot-access-control
```

### 2. Dashboard (Vue.js)
```bash
cd dashboard
npm install
npm run dev          # Servidor de desarrollo en http://localhost:5173
```

### 3. Firebase
```bash
npm install -g firebase-tools
firebase login
firebase init        # Seleccionar: Realtime Database, Authentication, Hosting
firebase deploy      # Publicar dashboard
```

### 4. ESP32-CAM (Arduino IDE)
1. Abrir Arduino IDE 2.x
2. Boards Manager → Instalar `esp32` de Espressif Systems
3. Abrir `firmware/access_control/access_control.ino`
4. Copiar `config.h.example` a `config.h` y completar credenciales
5. Seleccionar placa: `AI Thinker ESP32-CAM`
6. Conectar FTDI → Upload

### 5. Plate Recognizer
1. Crear cuenta en [platerecognizer.com](https://platerecognizer.com/)
2. Obtener API key desde el dashboard
3. Agregar key en `firmware/access_control/config.h`

---

## 🔧 Variables de Entorno

### `firmware/access_control/config.h`
```cpp
#define WIFI_SSID          "nombre_red_wifi"
#define WIFI_PASSWORD      "contraseña_wifi"
#define PLATE_API_KEY      "tu_api_key_plate_recognizer"
#define FIREBASE_HOST      "tu-proyecto.firebaseio.com"
#define FIREBASE_AUTH      "tu_firebase_database_secret"
#define PUNTO_ACCESO       "porton_norte"
#define UMBRAL_CONFIANZA   80
#define TIEMPO_BARRERA_MS  10000
```

### `dashboard/src/firebase/config.js`
```javascript
export const firebaseConfig = {
  apiKey: "tu_api_key",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

> ⚠️ **NUNCA subir credenciales reales a GitHub.** Agregar `config.h` y `config.js` al `.gitignore`.

---

## 📡 Flujo de Datos

```
1. Sensor IR detecta presencia (GPIO 13 → HIGH)
2. ESP32-CAM enciende flash LED (GPIO 4)
3. Cámara OV2640 captura imagen JPEG
4. Imagen → POST HTTPS → Plate Recognizer API
5. API retorna: { "plate": "AB-1234", "score": 0.97 }
6. ¿Confianza ≥ 80%?
   → NO: Descartar evento (falso positivo)
   → SÍ: Continuar
7. ¿Patente registrada en Firebase /vehiculos/?
   → NO: Registrar como "no autorizado" + alerta. Barrera NO abre.
   → SÍ: Continuar
8. ¿Vehículo tiene ingreso activo en /estadoPlanta/?
   → NO: Registrar como INGRESO
   → SÍ: Registrar como SALIDA + calcular tiempo permanencia
9. Modo barrera = automático → Servo abre (GPIO 12) → Timer → Cierra
10. Datos → Firebase Realtime DB
11. Firebase → WebSocket → Dashboard Vue.js (actualización instantánea)
```

---

## 🎨 Historias de Usuario (Story Points)

| ID | Historia | SP | Complejidad |
|---|---|---|---|
| HU-01 | Detección y registro automático de vehículos | 13 | Alta |
| HU-02 | Gestión de flota de camiones | 3 | Baja |
| HU-03 | Visualización en tiempo real | 8 | Alta |
| HU-04 | Monitoreo de ocupación con semáforo | 3 | Baja |
| HU-05 | Historial de movimientos | 5 | Media |
| HU-06 | Estadísticas y gráficos | 5 | Media |
| HU-07 | Alertas por anomalías | 5 | Media |
| HU-08 | Monitoreo de sensores | 5 | Media |
| HU-09 | Reportes exportables | 5 | Media |
| HU-10 | Monitoreo remoto | 3 | Baja |
| HU-11 | Gestión de usuarios y roles | 5 | Media |
| HU-12 | Filtrado de falsos positivos | 3 | Baja |
| HU-13 | Registro manual de respaldo | 2 | Muy baja |
| HU-14 | Resiliencia ante desconexiones | 8 | Alta |
| HU-15 | Configuración del sistema | 3 | Baja |
| HU-16 | Control de barrera vehicular | 8 | Alta |
| | **Total** | **84** | |

---

## 👥 Equipo y Roles (Kanban)

| Rol | Responsabilidad |
|---|---|
| **Líder Técnico / Coordinador** | Tablero Trello, revisión de entregables, resolución de bloqueos |
| **Desarrollador IoT / Hardware** | ESP32-CAM, sensor IR, servo, Plate Recognizer API |
| **Desarrollador Backend / Cloud** | Firebase (DB, Auth, Rules, Hosting), lógica de alertas |
| **Desarrollador Frontend / Dashboard** | Vue.js 3, vue-chartjs, diseño responsive |
| **Analista / Documentador / QA** | Documentación, pruebas, registro de errores |

### Tablero Kanban (Trello)
Columnas: `Backlog` → `To Do` → `En Progreso` (máx 2 por persona) → `En Revisión` → `Hecho`

Etiquetas de color:
- 🔵 IoT / Hardware
- 🟢 Dashboard / Frontend
- 🟠 Backend / Cloud
- 🟣 Documentación / QA
- 🔴 Urgente

---

## 📄 Licencia

Proyecto académico — Integración de Competencias III.
