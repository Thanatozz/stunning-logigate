# Tablero Kanban - Integracion III (Actividad 1.4)

## Objetivo
Organizar las tarjetas de Trello del proyecto de Integracion III segun metodologia Kanban, alineado a RF-01, RF-02 y RF-03, con foco en el avance 1.4.

## Reglas Kanban del equipo
- Maximo 2 tarjetas por persona en `En Progreso` (WIP).
- Toda tarjeta debe pasar por `En Revision` antes de `Hecho`.
- Cada tarjeta debe tener: responsable, fecha limite y etiqueta.

## Etiquetas sugeridas
- Azul: IoT/Hardware
- Verde: Dashboard/Frontend
- Naranja: Backend/Cloud
- Morado: Documentacion/QA
- Rojo: Urgente

---

## Backlog

- [ ] `[HU-09][RF-34,RF-35]` Reportes exportables (CSV/PDF)
  - Definir formato de reporte diario.
  - Implementar exportacion CSV.
  - Implementar exportacion PDF.
  - Validar rango de fechas.

- [ ] `[HU-10][RF-25,RF-37]` Monitoreo remoto seguro
  - Publicar dashboard en hosting.
  - Validar acceso remoto fuera de red local.
  - Validar login obligatorio.

- [ ] `[HU-11][RF-37,RF-38,RF-39]` Gestion de usuarios y roles
  - Crear roles Administrador/Supervisor.
  - Restringir vistas y acciones por rol.
  - Registrar log de auditoria.

- [ ] `[HU-12][RF-12,RF-43]` Filtrado de falsos positivos
  - Ajustar umbral de confianza OCR.
  - Registrar alertas por no autorizado.
  - Verificar descarte de lecturas invalidas.

- [ ] `[HU-13][RF-13]` Registro manual de respaldo
  - Crear formulario manual de ingreso/salida.
  - Guardar campo `modoRegistro=manual`.
  - Validar consistencia de datos.

- [ ] `[HU-14][RF-16,RF-17]` Resiliencia ante desconexiones
  - Implementar buffer local.
  - Sincronizar al reconectar.
  - Evitar duplicados al sincronizar.

- [ ] `[HU-15][RF-40,RF-41,RF-42,RF-43]` Configuracion del sistema
  - Parametrizar umbrales de alerta.
  - Parametrizar puntos de acceso.
  - Parametrizar intervalo de captura y confianza OCR.

- [ ] `[Integracion E2E]` Flujo completo ESP32 -> OCR -> Firebase -> Dashboard
  - Probar ingreso autorizado.
  - Probar salida autorizada.
  - Probar rechazo no autorizado.
  - Probar apertura manual (remota y fisica).

---

## To Do (Esta semana)

- [ ] `[RF-03][Azul]` Configurar entorno de trabajo del Avance 1.4
  - Validar IDE y librerias.
  - Validar conexion de microcontrolador/simulador.
  - Confirmar pines y componentes.

- [ ] `[RF-03][Azul]` Implementar prototipo funcional base
  - Lectura de sensores.
  - Control servo barrera.
  - Boton manual de emergencia.
  - LEDs de estado.

- [ ] `[RF-03][Naranja]` Integrar flujo de datos con nube (real o simulado)
  - Definir estructura de registro.
  - Validar evento ingreso/salida.
  - Validar campos minimos (timestamp, patente, tipo, confianza).

- [ ] `[RF-03][Verde]` Actualizar panel basico de visualizacion
  - Mostrar contador en planta.
  - Mostrar eventos recientes.
  - Mostrar estado barrera.

- [ ] `[RF-03][Morado]` Preparar evidencias para informe 1.4
  - Capturas del sistema funcionando.
  - Tabla de pruebas ejecutadas.
  - Lista de problemas y correcciones.

---

## En Progreso

- [ ] `[RF-03][Azul]` Pruebas de adquisicion de datos y validacion de lectura
  - Probar sensor exterior/interior.
  - Validar detecciones consecutivas.
  - Ajustar tiempos/cooldown.

- [ ] `[RF-03][Morado]` Correccion de fallas detectadas en pruebas
  - Documentar falla.
  - Aplicar fix.
  - Reprobar y cerrar evidencia.

---

## En Revision

- [ ] `[RF-03][Morado]` Informe tecnico Actividad 1.4 listo para revision cruzada
  - Revisar formato y completitud.
  - Revisar coherencia tecnica.
  - Validar evidencias (capturas/tablas).

- [ ] `[RF-03][Morado]` Checklist final previo a entrega en Aula Virtual
  - Nombre de archivo correcto.
  - Integrantes y fecha.
  - Seccion de aprendizaje/cierre respondida.

---

## Hecho

- [x] `[RF-01]` Definir problema e implicancias en manufactura.
- [x] `[RF-01]` Establecer objetivos especificos del proyecto.
- [x] `[RF-01]` Identificar hitos del proyecto.
- [x] `[RF-01]` Estructurar cronograma (Carta Gantt).
- [x] `[RF-01]` Definir roles y tareas con metodologia Kanban.
- [x] `[RF-02]` Elaborar diagrama de arquitectura (hardware, software, comunicaciones).
- [x] `[RF-02]` Seleccionar y justificar tecnologias.
- [x] `[RF-02]` Diseñar propuesta de interfaz/dashboard (mockups).

> Nota: Si alguna tarjeta en `Hecho` aun no esta realmente cerrada, moverla de inmediato a `To Do` o `En Progreso`.
