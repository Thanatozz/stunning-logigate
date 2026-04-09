# Integracion Dashboard + Firebase + IoT Fisico

Este documento define como conectar todo de forma incremental y con responsabilidades claras.

## 1) Arquitectura recomendada

```mermaid
flowchart LR
  A[ESP32 Gate Controller] -->|write| B[RTDB: ingest/detections]
  A -->|write| C[RTDB: devices + barrier]
  D[Dashboard Vue] -->|write manual command| E[RTDB: commands/{accessPoint}]
  D -->|read realtime| F[RTDB: dashboardCache/state/accessRecords/alerts/devices/barrier]
  G[Cloud Functions] -->|consume| B
  G -->|update| F
  G -->|authorize and set open window| E
```

### Principio clave

- El dispositivo no decide autorizacion final.
- El backend (Cloud Function) decide ingreso/salida, alertas y orden de apertura.
- El dashboard solo muestra estado y emite comandos manuales con permisos.

## 2) Flujo operacional end-to-end

1. ESP32 detecta presencia y publica en `ingest/detections/{eventId}`.
2. Cloud Function procesa evento:
   - Determina patente/autorizacion (OCR + `vehicles`).
   - Calcula `ingreso` o `salida` usando `state/trucksInside`.
   - Crea `accessRecords`.
   - Actualiza `state`, `alerts`, `dashboardCache`.
   - Si autorizado, actualiza `commands/{accessPoint}.autoOpenUntil`.
3. ESP32 lee `commands/{accessPoint}` y abre/cierra barrera.
4. ESP32 publica heartbeat en `devices/{deviceId}` y estado en `barrier/{accessPoint}`.
5. Dashboard escucha nodos realtime y refresca stores.

## 3) Mapeo de nodos Firebase a stores actuales del dashboard

| Store actual | Nodo recomendado |
|---|---|
| `dashboard.store` | `dashboardCache/kpiSummary`, `dashboardCache/dailySummary`, `dashboardCache/chartSeries`, `dashboardCache/recentActivity`, `state` |
| `history.store` | `accessRecords` |
| `alerts.store` | `alerts` |
| `devices.store` | `devices` |
| `barrier.store` | `barrier/{accessPoint}` + escritura en `commands/{accessPoint}` |
| `settings.store` | `settings` |
| `users.store` | `users` |

## 4) Contrato minimo para comandos de barrera

Ruta: `commands/{accessPoint}`

```json
{
  "requestId": "cmd-20260408-011",
  "mode": "manual_remoto",
  "action": "abrir",
  "autoOpenUntil": 0,
  "updatedBy": "uid-demo-admin",
  "updatedAt": "2026-04-08T23:58:00Z"
}
```

- `mode`: estrategia de control activa.
- `action`: comando puntual (`abrir`, `cerrar`, `none`).
- `autoOpenUntil`: ventana de apertura autorizada en modo automatico.

## 5) Plan de implementacion por etapas

## Etapa A: Firebase base

1. Crear RTDB.
2. Cargar estructura inicial con `docs/firebase_schema_logigate.json`.
3. Aplicar `docs/firebase_rules_logigate.json`.
4. Crear usuarios Auth (admin/supervisor).
5. Asignar custom claims (`role`, `admin`, `supervisor`).

## Etapa B: Dispositivo ESP32

1. Cargar firmware `firmware/esp32_gate_controller/esp32_gate_controller.ino`.
2. Configurar credenciales WiFi/Firebase.
3. Verificar escritura en:
   - `devices/{deviceId}`
   - `barrier/{accessPoint}`
   - `ingest/detections/{eventId}`
4. Probar comando manual desde Firebase Console en `commands/{accessPoint}`.

## Etapa C: Backend cloud

Implementar funciones:
- `onDetectionCreated`: procesa `ingest/detections/*`.
- `rebuildDashboardCache`: recalcula KPIs y series.
- `onManualCommandAudit`: registra auditoria de comandos.

## Etapa D: Dashboard

1. Crear capa `firebase` para lecturas/escrituras.
2. Reemplazar mocks store por listeners RTDB progresivamente.
3. Mantener fallback local solo para modo demo.
4. Activar comando remoto de barrera escribiendo `commands/{accessPoint}`.

## 6) Secuencia recomendada para desarrollar sin bloquearte

1. **Primero** conectar ESP32 + Firebase (sin dashboard).
2. **Segundo** conectar dashboard de solo lectura.
3. **Tercero** activar comandos remotos y control por rol.
4. **Cuarto** integrar OCR/ANPR y logica completa de autorizacion.

## 7) Checklist de pruebas integradas

- [ ] Heartbeat llega cada 5s a `devices`.
- [ ] Evento de deteccion llega a `ingest/detections`.
- [ ] Cloud Function genera `accessRecords`.
- [ ] `state/currentCount` sube/baja segun ingreso/salida.
- [ ] Dashboard refleja estado en tiempo real.
- [ ] Comando remoto abre/cierra barrera.
- [ ] Con sensor de seguridad bloqueado, cierre remoto se rechaza.

## 8) Riesgos comunes y mitigacion

- Reglas demasiado abiertas -> aplicar custom claims y reglas por nodo.
- Costos por listeners amplios -> suscribirse por nodos concretos y paginar historico.
- Logica duplicada entre device y dashboard -> mantener decision en Cloud Function.
- Dependencia total de red -> modo `manual_fisico` y reglas fail-safe locales.
