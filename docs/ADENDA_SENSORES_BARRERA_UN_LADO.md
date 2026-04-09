# Adenda Tecnica: Sensores Industriales para Porton de Camiones (Un Solo Lado)

## 1) Objetivo
Definir una arquitectura de sensado robusta para portones logisticos donde **NO se puede usar un sensor por cada lado del porton** ni depender de pares emisor/receptor en extremos opuestos.

Esta adenda asume:
- Modulo IoT instalado en la estructura de la barrera (lado unico).
- Operacion en ambiente industrial con polvo, vibracion, lluvia, luz solar directa y ruido electromagnetico.
- Flujo bidireccional (ingreso/salida) resuelto por software, no por doble sensor enfrentado.

## 2) Decision de Arquitectura

### 2.1 Principio base
La direccion del evento (ingreso/salida) se calcula con estado en backend (stateful event detection), no por secuencia de dos sensores en extremos opuestos.

### 2.2 Sensorizacion recomendada (co-localizada, un solo lado)
1. **Sensor primario de presencia/aproximacion**: Radar FMCW industrial (24/60 GHz) montado en el lado de la barrera.
2. **Sensor de seguridad anti-atrapamiento**: LiDAR ToF de corto alcance o borde sensible en la pluma (boom) para evitar cierre sobre vehiculo/obstaculo.
3. **Validacion opcional de masa metalica**: lazo inductivo unico o magnetometro de piso cercano al mismo lado (opcional, recomendado para reducir falsos positivos).

> No se usa arreglo "sensor exterior + sensor interior" en puntas opuestas.

## 3) Requisitos minimos de sensor (produccion)

### 3.1 Requisitos ambientales y electricos
- Grado de proteccion: IP67 minimo (ideal IP69K en lluvia/lavado).
- Rango termico: -20 C a +60 C minimo.
- Inmunidad EMC: cumplimiento IEC 61000-6-2 / 61000-6-4 o equivalente industrial.
- Tension industrial: 12-24 VDC con proteccion de sobretension y polaridad inversa.
- Salida robusta: PNP/NPN o interfaz aislada hacia controlador.

### 3.2 Requisitos funcionales
- Latencia de deteccion: <= 100 ms.
- Distancia de deteccion vehicular configurable: 3 a 8 m (segun geometria de porton).
- Tasa de falso positivo por lluvia/polvo/sombra: < 1% en pruebas de campo.
- Histeresis y filtros configurables (anti rebote, anti vibracion).

## 4) Logica de control recomendada

1. Radar detecta presencia en zona de aproximacion.
2. Se dispara captura ANPR (camara).
3. OCR + validacion de patente autorizada.
4. Backend determina ingreso/salida por estado actual del vehiculo.
5. Si autorizado, abrir barrera.
6. Mantener barrera abierta mientras sensor de seguridad detecte obstaculo bajo pluma.
7. Cerrar solo cuando zona de seguridad este libre por una ventana estable (ej. 1.5-2 s).

## 5) Filtros anti-ruido recomendados
- Debounce temporal: 200-500 ms.
- Ventana de voto (N de M muestras) para confirmar presencia.
- Histeresis de distancia/senal para evitar oscilacion cerca del umbral.
- Dead-time post evento (ej. 2-4 s) para evitar doble disparo.
- Regla de seguridad: ante duda, **no cerrar**.

## 6) Cambios necesarios en documentos actuales

## 6.1 Informe Tecnico Actividad 1.4
Corregir referencias a "dos sensores IR" porque contradicen la restriccion de hardware de un solo lado.
- Actualmente menciona dos sensores: `docs/_extracted/Informe_Tecnico_Actividad_1_4 (1).txt` lineas 29, 44, 63-66, 430.
- Reemplazar por arquitectura co-localizada de un lado (radar + seguridad de pluma).

## 6.2 Compendio Tecnico Actividad 1.3
Actualizar la seleccion de sensor para entorno industrial.
- Actualmente prioriza IR simple de bajo costo: `docs/_extracted/Compendio_Tecnico_Actividad_1_3.txt` lineas 101-128.
- Agregar criterios de IP, EMC, temperatura, vibracion, lluvia y polvo.
- Mantener direccion por software (lineas 427-435), alineado con esta adenda.

## 6.3 Plan Proyecto Actividad 1.2
Ajustar RF-05 para no acotar solo a sensor IR.
- Texto actual centrado en IR: `docs/_extracted/Plan_Proyecto_Actividad_1_2 (2).txt` linea 72.
- Propuesta: "Deteccion de presencia vehicular con sensor industrial de un solo lado (radar/LiDAR/lazo), con inmunidad ambiental y baja tasa de falsos positivos".

## 7) Criterios de aceptacion (campo)
- 0 colisiones de barrera en pruebas de 200 ciclos.
- Falso disparo <= 1% con lluvia simulada, polvo y vibracion.
- Deteccion correcta de presencia >= 99% para camiones.
- Tiempo total deteccion->decision->apertura <= 1.5 s.
- Operacion degradada segura ante falla de sensor (manual remoto/fisico + alerta).
