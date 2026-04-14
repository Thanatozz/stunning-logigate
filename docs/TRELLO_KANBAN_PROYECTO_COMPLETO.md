# Trello Kanban - Proyecto Completo (Integracion III)

## Alcance
Plantilla completa de tarjetas Trello para todo el proyecto, basada en:
- RF-01 a RF-51
- HU-01 a HU-16
- Hitos H-01 a H-07

## Listas Kanban
- Backlog
- To Do (Esta semana)
- En Progreso
- En Revision
- Hecho

## Reglas Kanban
- Maximo 2 tarjetas por persona en `En Progreso`.
- Toda tarjeta debe pasar por `En Revision` antes de `Hecho`.
- Cada tarjeta debe tener:
  - Responsable
  - Fecha limite
  - Etiqueta
  - Criterios de aceptacion

## Etiquetas recomendadas
- Azul: IoT/Hardware
- Verde: Dashboard/Frontend
- Naranja: Backend/Cloud
- Morado: Documentacion/QA
- Rojo: Urgente

---

## Backlog

### [ ] [HU-04][RF-22] Monitoreo de ocupacion con semaforo (3 SP)
- Definir umbrales verde/amarillo/rojo.
- Implementar indicador visible en pantalla principal.
- Validar cambio de estado en tiempo real.

### [ ] [HU-05][RF-32,RF-33] Historial de movimientos (5 SP)
- Filtro por rango de fechas.
- Filtro por camion/empresa/punto de acceso.
- Tabla de resultados con paginacion basica.

### [ ] [HU-06][RF-21,RF-24,RF-36] Estadisticas y graficos (5 SP)
- Grafico ingresos/salidas por hora.
- Comparacion entre periodos.
- Vista combinada tabla + grafico.

### [ ] [HU-09][RF-34,RF-35] Reportes exportables (5 SP)
- Generar resumen diario.
- Exportar CSV.
- Exportar PDF.

### [ ] [HU-10][RF-25,RF-37] Monitoreo remoto (3 SP)
- Publicar dashboard en hosting.
- Validar acceso remoto fuera de red local.
- Verificar login obligatorio.

### [ ] [HU-11][RF-37,RF-38,RF-39] Gestion de usuarios y roles (5 SP)
- Definir roles Administrador y Supervisor.
- Restringir acciones por rol.
- Registrar auditoria de acciones.

### [ ] [HU-13][RF-13] Registro manual de respaldo (2 SP)
- Crear formulario manual ingreso/salida.
- Guardar registro con bandera `manual`.
- Validar estructura consistente con registro automatico.

### [ ] [HU-14][RF-16,RF-17] Resiliencia ante desconexiones (8 SP)
- Implementar buffer local.
- Sincronizar al reconectar.
- Evitar duplicados y validar integridad.

### [ ] [HU-15][RF-40,RF-41,RF-42,RF-43] Configuracion del sistema (3 SP)
- Configurar umbrales de alerta.
- Configurar puntos de acceso.
- Configurar intervalo de captura y umbral OCR.

### [ ] [RNF] Rendimiento y disponibilidad
- RNF-01: refresco de datos < 10s.
- RNF-02: carga dashboard < 3s.
- RNF-04/RNF-05: disponibilidad y operacion continua.

### [ ] [RNF] Seguridad y compatibilidad
- RNF-11: HTTPS/TLS para comunicaciones.
- RNF-13: autenticacion obligatoria.
- RNF-14/RNF-15: compatibilidad navegadores + ESP32-CAM.

### [ ] [HITO] H-06 Pruebas y correccion (Semana 14)
- Ejecutar pruebas integrales.
- Corregir defectos criticos.
- Cerrar observaciones pendientes.

### [ ] [HITO] H-07 Demostracion y entrega final (Semana 16)
- Demo en laboratorio.
- Informe tecnico final consolidado.
- Cierre de tablero y evidencias.

---

## To Do (Esta semana)

### [ ] [HU-03][RF-19,RF-20,RF-25] Visualizacion en tiempo real (8 SP)
- Mostrar contador actual de camiones.
- Mostrar camiones presentes con hora de ingreso.
- Actualizacion en tiempo real.

### [ ] [HU-07][RF-26,RF-27,RF-29,RF-30] Alertas por anomalias (5 SP)
- Umbral de camiones simultaneos.
- Alerta por permanencia excesiva.
- Alerta por inconsistencia ingreso/salida.
- Mostrar alerta visible en dashboard.

### [ ] [HU-08][RF-23,RF-28,RF-18] Monitoreo de sensores (5 SP)
- Estado online/offline por dispositivo.
- Alerta por perdida de conexion.
- Registro de logs de conectividad.

### [ ] [Integracion] E2E ESP32 -> OCR -> Firebase -> Dashboard
- Probar ingreso autorizado.
- Probar salida autorizada.
- Probar rechazo no autorizado.

### [ ] [HITO] H-05 Integracion completa (Semana 12)
- Integrar modulo IoT, nube y dashboard.
- Validar flujo completo extremo a extremo.
- Registrar evidencia de funcionamiento.

---

## En Progreso

### [ ] [HU-01][RF-05,RF-06,RF-07,RF-08,RF-09] Deteccion y registro automatico (13 SP)
- Detectar presencia en porton.
- Capturar/leer patente.
- Determinar ingreso o salida por estado.
- Registrar evento estructurado.

### [ ] [HU-12][RF-12,RF-43] Filtrado de falsos positivos (3 SP)
- Descartar confianza OCR menor al umbral.
- Alertar patente no registrada.
- Permitir ajustar umbral.

### [ ] [HU-16][RF-44..RF-51] Control de barrera vehicular (8 SP)
- Modo automatico.
- Modo manual remoto (dashboard).
- Modo manual fisico (boton).
- Registrar aperturas/cierres y estado actual.

### [ ] [HITO] H-03 Prototipo IoT funcional (Semana 8)
- Firmware estable en ESP32/simulacion.
- Lectura de sensores validada.
- Control de barrera validado.

### [ ] [HITO] H-04 Dashboard operativo (Semana 11)
- Pantalla principal funcional.
- Vista historico base.
- Estado de barrera y contador en planta.

---

## En Revision

### [ ] [HU-02][RF-01,RF-02,RF-03,RF-04] Gestion de flota de camiones (3 SP)
- CRUD completo de camiones.
- Asociacion a empresa.
- Clasificacion por categoria.

### [ ] [Entrega] Informe tecnico Actividad 1.4
- Capturas del sistema funcionando.
- Descripcion de funcionamiento.
- Problemas detectados y soluciones aplicadas.

### [ ] [QA] Checklist de cierre de modulo IoT
- Casos de prueba minimos ejecutados.
- Sin bloqueos criticos abiertos.
- Evidencias adjuntas en tarjeta.

---

## Hecho

### [x] [RF-01] Definir problema e implicancias en manufactura
### [x] [RF-01] Establecer objetivos especificos
### [x] [RF-01] Identificar hitos del proyecto
### [x] [RF-01] Estructurar cronograma (Carta Gantt)
### [x] [RF-01] Definir roles y metodologia Kanban
### [x] [RF-02] Diseno conceptual y arquitectura del sistema
### [x] [RF-02] Seleccion y justificacion de tecnologias
### [x] [RF-02] Propuesta de interfaz/dashboard (mockups)
### [x] [HITO] H-01 Entrega plan del proyecto (Semana 2)
### [x] [HITO] H-02 Entrega diseno conceptual (Semana 5)

---

## Tarjetas de hitos (referencia rapida)
- H-01 Entrega plan del proyecto - Semana 2
- H-02 Entrega diseno conceptual - Semana 5
- H-03 Prototipo IoT funcional - Semana 8
- H-04 Dashboard operativo - Semana 11
- H-05 Integracion completa - Semana 12
- H-06 Pruebas y correccion - Semana 14
- H-07 Demo y entrega final - Semana 16

---

## Sugerencia de uso en Trello
1. Crea las 5 listas Kanban.
2. Copia cada tarjeta de este documento.
3. Asigna responsable, fecha y etiqueta.
4. Mueve tarjetas segun avance real del equipo.
5. Revisa WIP antes de cada reunion de control.
