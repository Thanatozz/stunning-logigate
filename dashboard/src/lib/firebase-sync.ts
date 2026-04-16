import {
  limitToLast,
  onValue,
  query,
  ref as dbRef,
  set,
  type Unsubscribe,
} from 'firebase/database'
import { DEVICE_OFFLINE_TIMEOUT_MS, inferDeviceStatusFromHeartbeat } from '@/lib/device-health'
import { firebaseAccessPoint, firebaseDb, isFirebaseConfigured } from '@/lib/firebase'
import { normalizeAccessPointKey } from '@/lib/access-point'
import { useAlertsStore } from '@/stores/alerts.store'
import { useAuthStore } from '@/stores/auth.store'
import { useBarrierStore } from '@/stores/barrier.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useDevicesStore } from '@/stores/devices.store'
import { useHistoryStore } from '@/stores/history.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useVehiclesStore } from '@/stores/vehicles.store'
import type {
  AccessEventType,
  AccessRecord,
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertType,
  BarrierMode,
  BarrierStatus,
  Device,
  DeviceStatus,
  DeviceTelemetry,
  DeviceType,
  RecentActivityItem,
  TruckInside,
  Vehicle,
  VehicleCategory,
  VehicleStatus,
} from '@/types/domain'

let running = false
const unsubscribers: Unsubscribe[] = []
let realtimeAccessPoint =
  normalizeAccessPointKey(firebaseAccessPoint) || 'porton_norte'
let latestAccessRecords: AccessRecord[] = []
let latestPlateReadingRecords: AccessRecord[] = []
let deviceHealthInterval: ReturnType<typeof setInterval> | null = null
let autoAlertSignatures = new Map<string, string>()
let activeOfflineAlertIds = new Set<string>()
let activeStayAlertIds = new Set<string>()
let offlineAlertContextById = new Map<string, { name: string; accessPoint: string }>()
let stayAlertContextById = new Map<string, { plate: string; accessPoint: string; limitMinutes: number }>()
let excesoAlertActive = false
let lastStateSyncMs = 0

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return fallback
}

function isDistanceSensorDisabled(distanceCm: number | null) {
  if (distanceCm === null) return false
  return distanceCm >= 998.5
}

function toIso(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : new Date().toISOString()
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function rssiToPercent(rssi: number) {
  if (!Number.isFinite(rssi)) return 0
  if (rssi <= -100) return 0
  if (rssi >= -50) return 100
  return clampPercent(2 * (rssi + 100))
}

function toTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) return Math.trunc(value)
    if (value > 1_000_000_000) return Math.trunc(value * 1000)
    return null
  }

  if (typeof value === 'string') {
    const parsedNumber = Number(value)
    if (Number.isFinite(parsedNumber)) return toTimestampMs(parsedNumber)
    const parsedDate = Date.parse(value)
    return Number.isNaN(parsedDate) ? null : parsedDate
  }

  return null
}

function isReasonableTimestamp(ms: number | null): ms is number {
  if (!Number.isFinite(ms as number)) return false
  const value = ms as number
  const min = Date.UTC(2020, 0, 1)
  const max = Date.now() + 1000 * 60 * 60 * 24 * 30
  return value >= min && value <= max
}

function pickBestTimestamp(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const ms = toTimestampMs(candidate)
    if (isReasonableTimestamp(ms)) {
      return new Date(ms).toISOString()
    }
  }
  return new Date().toISOString()
}

function parseDeviceLastSeen(item: Record<string, unknown>): string {
  const candidates = [
    toTimestampMs(item.lastSeenServer),
    toTimestampMs(item.lastSeenEpochMs),
    toTimestampMs(item.lastSeen),
  ]

  for (const candidate of candidates) {
    if (isReasonableTimestamp(candidate)) {
      return new Date(candidate).toISOString()
    }
  }

  return toIso(item.lastSeen)
}

function parseDeviceSignal(item: Record<string, unknown>, status: DeviceStatus): number {
  if (status === 'offline') return 0

  const rawSignal = toNullableNumber(item.signal)
  if (rawSignal !== null) return clampPercent(rawSignal)

  const rawRssi = toNullableNumber(item.rssi)
  if (rawRssi !== null) return rssiToPercent(rawRssi)

  return 0
}

function normalizeDeviceType(value: unknown): DeviceType {
  if (value === 'esp32_cam' || value === 'sensor_ir' || value === 'sensor_ultrasonico' || value === 'barrera_servo') {
    return value
  }
  return 'esp32_cam'
}

function normalizeDeviceStatus(value: unknown): DeviceStatus {
  if (value === 'online' || value === 'offline' || value === 'degradado') {
    return value
  }
  return 'offline'
}

function normalizeBarrierMode(value: unknown): BarrierMode {
  if (value === 'automatico' || value === 'manual_remoto' || value === 'manual_fisico') {
    return value
  }
  return 'automatico'
}

function normalizeBarrierStatus(value: unknown): BarrierStatus {
  if (value === 'abierta' || value === 'cerrada' || value === 'en_transicion') {
    return value
  }
  return 'cerrada'
}

function normalizeEventType(value: unknown): AccessEventType {
  if (value === 'ingreso' || value === 'salida') return value
  return 'ingreso'
}

function normalizeVehicleStatus(value: unknown): VehicleStatus {
  if (value === 'autorizado' || value === 'observacion' || value === 'bloqueado') {
    return value
  }
  return 'autorizado'
}

function normalizeVehicleCategory(value: unknown): VehicleCategory {
  if (
    value === 'carga_pesada' ||
    value === 'carga_liviana' ||
    value === 'refrigerado' ||
    value === 'especial'
  ) {
    return value
  }
  return 'carga_liviana'
}

function normalizePlate(value: unknown): string {
  const raw = String(value ?? '').toUpperCase()
  return raw.replace(/[^A-Z0-9]/g, '')
}

function normalizePlateDisplay(value: unknown, fallback = 'SIN-PLACA'): string {
  const raw = String(value ?? '').trim().toUpperCase()
  return raw.length ? raw : fallback
}

function sanitizeRtdbKeySegment(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'item'
  return trimmed.replace(/[.#$/\[\]\s]/g, '_')
}

function normalizeAlertType(value: unknown): AlertType {
  const valid: AlertType[] = [
    'exceso_camiones',
    'permanencia_excesiva',
    'dispositivo_offline',
    'inconsistencia',
    'vehiculo_no_autorizado',
  ]
  return valid.includes(value as AlertType) ? (value as AlertType) : 'inconsistencia'
}

function normalizeAlertSeverity(value: unknown): AlertSeverity {
  if (value === 'critical' || value === 'warning' || value === 'info') return value
  return 'info'
}

function normalizeAlertStatus(value: unknown): AlertStatus {
  if (value === 'activa' || value === 'resuelta' || value === 'ignorada') return value
  return 'activa'
}

function normalizeActivityLevel(value: unknown): RecentActivityItem['level'] {
  if (value === 'critical' || value === 'warning' || value === 'info' || value === 'normal') {
    return value
  }
  return 'normal'
}

function normalizeOccupancyLevel(value: unknown): 'bajo' | 'medio' | 'alto' {
  if (value === 'bajo' || value === 'medio' || value === 'alto') return value
  return 'bajo'
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function parseTrucksInside(value: unknown): TruckInside[] {
  const source = toObject(value)
  return Object.entries(source)
    .map(([plate, raw]) => {
      const item = toObject(raw)
      return {
        plate: normalizePlateDisplay(item.plate ?? plate),
        company: String(item.company ?? 'Sin empresa'),
        enteredAt: toIso(item.enteredAt),
        accumulatedMinutes: toNumber(item.accumulatedMinutes, 0),
        accessPoint: String(item.accessPoint ?? realtimeAccessPoint),
      }
    })
    .sort((a, b) => Date.parse(b.enteredAt) - Date.parse(a.enteredAt))
}

function parseRecentActivity(value: unknown): RecentActivityItem[] {
  const source = toObject(value)
  return Object.entries(source)
    .map(([id, raw]) => {
      const item = toObject(raw)
      return {
        id,
        title: String(item.title ?? 'Actividad'),
        detail: String(item.detail ?? ''),
        timestamp: toIso(item.timestamp),
        level: normalizeActivityLevel(item.level),
      }
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}

function parseSettings(value: unknown): Record<string, unknown> {
  return toObject(value)
}

function parseVehicleRegistry(value: unknown): Vehicle[] {
  const source = toObject(value)
  const nowIso = new Date().toISOString()
  return Object.entries(source)
    .map(([key, raw]) => {
      const item = toObject(raw)
      const plateDisplay = normalizePlateDisplay(item.plate ?? key, '')
      const normalizedPlate = normalizePlate(plateDisplay)
      if (!normalizedPlate) return null

      return {
        plate: plateDisplay,
        company: String(item.company ?? 'Sin empresa'),
        cargoType: String(item.cargoType ?? 'general'),
        category: normalizeVehicleCategory(item.category),
        status: normalizeVehicleStatus(item.status),
        active: toBoolean(item.active, true),
        createdAt: toIso(item.createdAt ?? nowIso),
      } satisfies Vehicle
    })
    .filter((item): item is Vehicle => item !== null)
    .sort((a, b) => a.plate.localeCompare(b.plate))
}

function parseDevices(value: unknown): Device[] {
  const source = toObject(value)
  const nowMs = Date.now()
  return Object.entries(source)
    .map(([id, raw]) => {
      const item = toObject(raw)
      const statusFromPayload = normalizeDeviceStatus(item.status)
      const lastSeen = parseDeviceLastSeen(item)
      const status = inferDeviceStatusFromHeartbeat(statusFromPayload, lastSeen, nowMs)
      return {
        id,
        name: String(item.name ?? id),
        type: normalizeDeviceType(item.type),
        accessPoint: String(item.accessPoint ?? realtimeAccessPoint),
        status,
        lastSeen,
        signal: parseDeviceSignal(item, status),
        firmware: String(item.firmware ?? 'v1.0.0'),
        telemetry: parseDeviceTelemetry(item.telemetry),
      }
    })
    .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen))
}

function refreshDerivedDeviceHealth() {
  const authStore = useAuthStore()
  const dashboardStore = useDashboardStore()
  const devicesStore = useDevicesStore()
  const settingsStore = useSettingsStore()
  const vehiclesStore = useVehiclesStore()
  const nowMs = Date.now()
  let changed = false

  const next = devicesStore.devices.map((device) => {
    const inferredStatus = inferDeviceStatusFromHeartbeat(device.status, device.lastSeen, nowMs)
    const inferredSignal = inferredStatus === 'offline' ? 0 : clampPercent(device.signal)

    if (inferredStatus === device.status && inferredSignal === device.signal) {
      return device
    }

    changed = true
    return {
      ...device,
      status: inferredStatus,
      signal: inferredSignal,
    }
  })

  if (changed) {
    devicesStore.setDevices(next)
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  }
}

function parseDeviceTelemetry(value: unknown): DeviceTelemetry | undefined {
  const telemetry = toObject(value)
  if (!Object.keys(telemetry).length) return undefined

  const entryDistanceCm = toNullableNumber(telemetry.entryDistanceCm)
  const exitDistanceCm = toNullableNumber(telemetry.exitDistanceCm)
  const entrySensorActive = isDistanceSensorDisabled(entryDistanceCm)
    ? false
    : toBoolean(telemetry.entrySensorActive)
  const exitSensorActive = isDistanceSensorDisabled(exitDistanceCm)
    ? false
    : toBoolean(telemetry.exitSensorActive)

  return {
    barrierStatus: String(telemetry.barrierStatus ?? 'desconocido'),
    crossingDirection: String(telemetry.crossingDirection ?? 'none'),
    crossingState: String(telemetry.crossingState ?? 'idle'),
    entryDistanceCm,
    entrySensorActive,
    exitDistanceCm,
    exitSensorActive,
    uptimeMs: toNullableNumber(telemetry.uptimeMs),
  }
}

function parseAlerts(value: unknown): Alert[] {
  const source = toObject(value)
  return Object.entries(source)
    .map(([id, raw]) => {
      const item = toObject(raw)
      return {
        id: String(item.id ?? id),
        type: normalizeAlertType(item.type),
        description: String(item.description ?? ''),
        severity: normalizeAlertSeverity(item.severity),
        status: normalizeAlertStatus(item.status),
        timestamp: toIso(item.timestamp),
        relatedPlate: item.relatedPlate ? normalizePlateDisplay(item.relatedPlate) : undefined,
        source: String(item.source ?? 'RTDB'),
      }
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}

function parseAccessRecords(value: unknown): AccessRecord[] {
  const source = toObject(value)
  return Object.entries(source)
    .map(([id, raw]) => {
      const item = toObject(raw)
      return {
        id: String(item.id ?? id),
        plate: normalizePlateDisplay(item.plate),
        company: String(item.company ?? 'Sin empresa'),
        eventType: normalizeEventType(item.eventType),
        timestamp: pickBestTimestamp(item.timestamp, item.capturedAt, item.capturedAtServer, item.capturedAtEpochMs),
        accessPoint: String(item.accessPoint ?? realtimeAccessPoint),
        ocrConfidence: toNumber(item.ocrConfidence, 0),
        stayMinutes: toNullableNumber(item.stayMinutes),
        barrierMode: normalizeBarrierMode(item.barrierMode),
        deviceId: String(item.deviceId ?? 'device-unknown'),
      }
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}

function normalizeEventTypeFromPlateReading(item: Record<string, unknown>): AccessEventType {
  const directionHint = String(item.directionHint ?? item.crossingDirection ?? '').toLowerCase()
  const trigger = String(item.trigger ?? '').toLowerCase()
  if (directionHint === 'salida' || trigger.includes('exit')) return 'salida'
  return 'ingreso'
}

function normalizeOcrConfidenceFromPlateReading(item: Record<string, unknown>): number {
  const raw = toNumber(item.ocrConfidence ?? item.confidence ?? item.score, 0)
  if (raw <= 1) return Math.round(raw * 1000) / 10
  return raw
}

function parsePlateReadingsAsAccessRecords(value: unknown): AccessRecord[] {
  const source = toObject(value)
  const records = Object.entries(source)
    .map(([id, raw]) => {
      const item = toObject(raw)
      const plate = normalizePlateDisplay(item.plate, '')
      return {
        id: `pr-${id}`,
        plate: plate.length ? plate : 'SIN-PLACA',
        company: String(item.company ?? 'Sin empresa'),
        eventType: normalizeEventTypeFromPlateReading(item),
        timestamp: pickBestTimestamp(item.capturedAt, item.timestamp, item.capturedAtServer, item.capturedAtEpochMs),
        accessPoint: String(item.accessPoint ?? realtimeAccessPoint),
        ocrConfidence: normalizeOcrConfidenceFromPlateReading(item),
        stayMinutes: null,
        barrierMode: normalizeBarrierMode(item.mode),
        deviceId: String(item.deviceId ?? 'device-unknown'),
      }
    })

  const insideByPlate = new Set<string>()
  const normalized = [...records]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((record) => {
      const plateKey = normalizePlate(record.plate)
      if (!plateKey || plateKey === 'SINPLACA') return record

      const currentlyInside = insideByPlate.has(plateKey)
      let eventType: AccessEventType = record.eventType

      if (record.eventType === 'ingreso' && currentlyInside) {
        eventType = 'salida'
      } else if (record.eventType === 'salida' && !currentlyInside) {
        eventType = 'ingreso'
      }

      if (eventType === 'ingreso') {
        insideByPlate.add(plateKey)
      } else {
        insideByPlate.delete(plateKey)
      }

      if (eventType === record.eventType) return record
      return {
        ...record,
        eventType,
      }
    })

  return normalized.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}

function mergeHistoryRecords(records: AccessRecord[], plateReadings: AccessRecord[]): AccessRecord[] {
  const merged = [...records, ...plateReadings]
  const dedup = new Map<string, AccessRecord>()

  for (const row of merged) {
    const key = `${row.plate}|${row.timestamp}|${row.eventType}|${row.accessPoint}`
    const existing = dedup.get(key)
    if (!existing || existing.id.startsWith('pr-')) {
      dedup.set(key, row)
    }
  }

  return Array.from(dedup.values()).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}

function buildTruckSetSignature(trucks: TruckInside[]): Set<string> {
  return new Set(
    trucks.map((truck) => {
      const plateKey = normalizePlate(truck.plate)
      const accessPointKey =
        normalizeAccessPointKey(truck.accessPoint) ||
        sanitizeRtdbKeySegment(String(truck.accessPoint ?? realtimeAccessPoint))
      return `${plateKey}|${accessPointKey}`
    }),
  )
}

function hasSameTruckSet(current: TruckInside[], next: TruckInside[]): boolean {
  if (current.length !== next.length) return false

  const currentSet = buildTruckSetSignature(current)
  const nextSet = buildTruckSetSignature(next)
  if (currentSet.size !== nextSet.size) return false

  for (const key of currentSet) {
    if (!nextSet.has(key)) return false
  }

  return true
}

function getLatestRecordTimestampMs(records: AccessRecord[]): number {
  let latest = 0
  for (const record of records) {
    const value = Date.parse(record.timestamp)
    if (Number.isFinite(value) && value > latest) latest = value
  }
  return latest
}

function deriveTrucksInsideFromHistory(records: AccessRecord[], vehicles: Vehicle[]): TruckInside[] {
  const sorted = [...records].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  const companyByPlate = new Map<string, string>()
  for (const vehicle of vehicles) {
    const plateKey = normalizePlate(vehicle.plate)
    if (!plateKey) continue
    companyByPlate.set(plateKey, vehicle.company)
  }

  const insideByPlate = new Map<string, TruckInside>()
  for (const record of sorted) {
    const plateKey = normalizePlate(record.plate)
    if (!plateKey || plateKey === 'SINPLACA') continue

    const timestampMs = Date.parse(record.timestamp)
    const enteredAt = Number.isFinite(timestampMs)
      ? new Date(timestampMs).toISOString()
      : new Date().toISOString()
    const company =
      record.company && record.company !== 'Sin empresa'
        ? record.company
        : companyByPlate.get(plateKey) ?? 'Sin empresa'
    const accessPoint = String(record.accessPoint ?? realtimeAccessPoint)

    if (record.eventType === 'ingreso') {
      if (insideByPlate.has(plateKey)) {
        // Regla operativa: si una patente vuelve a "ingresar" estando dentro, se interpreta como salida.
        insideByPlate.delete(plateKey)
      } else {
        insideByPlate.set(plateKey, {
          plate: normalizePlateDisplay(record.plate, plateKey),
          company,
          enteredAt,
          accumulatedMinutes: 0,
          accessPoint,
        })
      }
      continue
    }

    insideByPlate.delete(plateKey)
  }

  const nowMs = Date.now()
  return Array.from(insideByPlate.values())
    .map((truck) => {
      const enteredMs = Date.parse(truck.enteredAt)
      const accumulatedMinutes = Number.isFinite(enteredMs)
        ? Math.max(0, Math.floor((nowMs - enteredMs) / 60000))
        : truck.accumulatedMinutes
      return {
        ...truck,
        accumulatedMinutes,
      }
    })
    .sort((a, b) => Date.parse(b.enteredAt) - Date.parse(a.enteredAt))
}

function syncPlantStateFromHistory(params: {
  dashboardStore: ReturnType<typeof useDashboardStore>
  vehiclesStore: ReturnType<typeof useVehiclesStore>
}) {
  const { dashboardStore, vehiclesStore } = params
  const mergedRecords = mergeHistoryRecords(latestAccessRecords, latestPlateReadingRecords)
  if (!mergedRecords.length) return

  const derivedTrucks = deriveTrucksInsideFromHistory(mergedRecords, vehiclesStore.vehicles)
  const stateTrucks = dashboardStore.plantState.trucksInside
  const stateLooksEmpty =
    stateTrucks.length === 0 && dashboardStore.plantState.currentCount === 0
  const diverged = !hasSameTruckSet(stateTrucks, derivedTrucks)
  const hasHistoryNewerThanState = getLatestRecordTimestampMs(mergedRecords) > lastStateSyncMs

  if (!((stateLooksEmpty && derivedTrucks.length > 0) || (hasHistoryNewerThanState && diverged))) {
    return
  }

  dashboardStore.setPlantStateFromRemote({
    maxCapacity: dashboardStore.plantState.maxCapacity,
    trucksInside: derivedTrucks,
  })
}

function detectInconsistencyEvents(records: AccessRecord[]): AccessRecord[] {
  const sorted = [...records].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  )
  const insideByPlate = new Set<string>()
  const inconsistencies: AccessRecord[] = []

  for (const record of sorted) {
    const plateKey = normalizePlate(record.plate)
    if (!plateKey || plateKey === 'SINPLACA') continue

    if (record.eventType === 'ingreso') {
      if (insideByPlate.has(plateKey)) {
        inconsistencies.push(record)
      } else {
        insideByPlate.add(plateKey)
      }
      continue
    }

    if (!insideByPlate.has(plateKey)) {
      inconsistencies.push(record)
      continue
    }
    insideByPlate.delete(plateKey)
  }

  return inconsistencies
}

function buildAlertSignature(alert: Alert): string {
  return [
    alert.type,
    alert.severity,
    alert.status,
    alert.description,
    alert.relatedPlate ?? '',
    alert.source,
  ].join('|')
}

async function writeAutoAlert(alert: Alert) {
  if (!firebaseDb) return

  const signature = buildAlertSignature(alert)
  if (autoAlertSignatures.get(alert.id) === signature) return
  autoAlertSignatures.set(alert.id, signature)

  try {
    await set(dbRef(firebaseDb, `alerts/${alert.id}`), alert)
  } catch (error) {
    autoAlertSignatures.delete(alert.id)
    console.warn('[LogiGate][alerts] No se pudo sincronizar alerta automatica', {
      id: alert.id,
      error,
    })
  }
}

function emitAutoAlert(payload: Omit<Alert, 'timestamp'>) {
  const next: Alert = {
    ...payload,
    timestamp: new Date().toISOString(),
  }
  void writeAutoAlert(next)
}

function hydrateAutoAlertStateFromRemote(alerts: Alert[]) {
  activeOfflineAlertIds = new Set(
    alerts
      .filter(
        (alert) =>
          alert.id.startsWith('auto-dispositivo-offline-') &&
          alert.status === 'activa',
      )
      .map((alert) => alert.id),
  )

  activeStayAlertIds = new Set(
    alerts
      .filter(
        (alert) =>
          alert.id.startsWith('auto-permanencia-') && alert.status === 'activa',
      )
      .map((alert) => alert.id),
  )

  excesoAlertActive = alerts.some(
    (alert) => alert.id === 'auto-exceso-camiones' && alert.status === 'activa',
  )
}

function evaluateAndSyncDerivedAlerts(params: {
  authStore: ReturnType<typeof useAuthStore>
  dashboardStore: ReturnType<typeof useDashboardStore>
  devicesStore: ReturnType<typeof useDevicesStore>
  settingsStore: ReturnType<typeof useSettingsStore>
  vehiclesStore: ReturnType<typeof useVehiclesStore>
}) {
  const {
    authStore,
    dashboardStore,
    devicesStore,
    settingsStore,
    vehiclesStore,
  } = params

  if (!firebaseDb || !isFirebaseConfigured) return
  if (authStore.currentRole !== 'admin') return

  const source = 'Motor de alertas (dashboard)'
  const vehicleRegistry = new Map<string, Vehicle>()
  for (const vehicle of vehiclesStore.vehicles) {
    const plateKey = normalizePlate(vehicle.plate)
    if (!plateKey) continue
    vehicleRegistry.set(plateKey, vehicle)
  }

  const recentRecords = mergeHistoryRecords(
    latestAccessRecords,
    latestPlateReadingRecords,
  ).slice(0, 250)

  if (vehicleRegistry.size > 0) {
    for (const record of recentRecords) {
      if (record.eventType !== 'ingreso') continue
      const plateKey = normalizePlate(record.plate)
      if (!plateKey || plateKey === 'SINPLACA') continue

      const vehicle = vehicleRegistry.get(plateKey)
      if (vehicle && vehicle.active && vehicle.status !== 'bloqueado') continue

      const reason =
        !vehicle
          ? 'no registrada en flota autorizada'
          : !vehicle.active
            ? 'registrada como inactiva'
            : 'bloqueada para acceso'
      const severity: AlertSeverity =
        vehicle?.status === 'bloqueado' || vehicle?.active === false
          ? 'critical'
          : 'warning'
      const alertId = `auto-vehiculo-no-autorizado-${sanitizeRtdbKeySegment(
        record.id,
      )}`

      emitAutoAlert({
        id: alertId,
        type: 'vehiculo_no_autorizado',
        description: `Patente ${record.plate} ${reason}.`,
        severity,
        status: 'activa',
        source,
        relatedPlate: record.plate,
      })
    }
  }

  const inconsistencies = detectInconsistencyEvents(latestAccessRecords)
  for (const record of inconsistencies) {
    const alertId = `auto-inconsistencia-${sanitizeRtdbKeySegment(record.id)}`
    const description =
      record.eventType === 'ingreso'
        ? `Ingreso duplicado detectado para ${record.plate}.`
        : `Salida sin ingreso previo para ${record.plate}.`

    emitAutoAlert({
      id: alertId,
      type: 'inconsistencia',
      description,
      severity: 'warning',
      status: 'activa',
      source,
      relatedPlate: record.plate,
    })
  }

  const nextOfflineIds = new Set<string>()
  for (const device of devicesStore.devices) {
    if (device.status !== 'offline') continue
    const alertId = `auto-dispositivo-offline-${sanitizeRtdbKeySegment(
      device.id,
    )}`
    nextOfflineIds.add(alertId)
    offlineAlertContextById.set(alertId, {
      name: device.name,
      accessPoint: device.accessPoint,
    })

    emitAutoAlert({
      id: alertId,
      type: 'dispositivo_offline',
      description: `${device.name} sin conexion en ${device.accessPoint}.`,
      severity: 'critical',
      status: 'activa',
      source,
    })
  }

  for (const alertId of activeOfflineAlertIds) {
    if (nextOfflineIds.has(alertId)) continue
    const context = offlineAlertContextById.get(alertId)
    emitAutoAlert({
      id: alertId,
      type: 'dispositivo_offline',
      description: context
        ? `${context.name} recupero conectividad en ${context.accessPoint}.`
        : 'Dispositivo recupero conectividad.',
      severity: 'info',
      status: 'resuelta',
      source,
    })
    offlineAlertContextById.delete(alertId)
  }
  activeOfflineAlertIds = nextOfflineIds

  const maxStayMinutes = Math.max(
    1,
    Math.floor(
      Number(
        settingsStore.settings.maxStayMinutes ??
          dashboardStore.plantState.maxCapacity,
      ),
    ),
  )
  const nextStayIds = new Set<string>()
  for (const truck of dashboardStore.plantState.trucksInside) {
    if (truck.accumulatedMinutes <= maxStayMinutes) continue

    const plateKey = normalizePlate(truck.plate) || sanitizeRtdbKeySegment(truck.plate)
    const accessPointKey =
      normalizeAccessPointKey(truck.accessPoint) ||
      sanitizeRtdbKeySegment(truck.accessPoint)
    const alertId = `auto-permanencia-${sanitizeRtdbKeySegment(
      plateKey,
    )}-${sanitizeRtdbKeySegment(accessPointKey)}`
    nextStayIds.add(alertId)
    stayAlertContextById.set(alertId, {
      plate: truck.plate,
      accessPoint: truck.accessPoint,
      limitMinutes: maxStayMinutes,
    })

    emitAutoAlert({
      id: alertId,
      type: 'permanencia_excesiva',
      description: `Patente ${truck.plate} supera ${maxStayMinutes} minutos en planta.`,
      severity: 'warning',
      status: 'activa',
      source,
      relatedPlate: truck.plate,
    })
  }

  for (const alertId of activeStayAlertIds) {
    if (nextStayIds.has(alertId)) continue
    const context = stayAlertContextById.get(alertId)
    emitAutoAlert({
      id: alertId,
      type: 'permanencia_excesiva',
      description: context
        ? `Permanencia normalizada para ${context.plate} (${context.accessPoint}).`
        : 'Permanencia normalizada.',
      severity: 'info',
      status: 'resuelta',
      source,
      relatedPlate: context?.plate,
    })
    stayAlertContextById.delete(alertId)
  }
  activeStayAlertIds = nextStayIds

  const maxTrucksThreshold = Math.max(
    1,
    Math.floor(
      Number(
        settingsStore.settings.maxTrucks ??
          dashboardStore.plantState.maxCapacity ??
          1,
      ),
    ),
  )
  const isExcesoCamiones =
    dashboardStore.plantState.currentCount > maxTrucksThreshold

  if (isExcesoCamiones) {
    excesoAlertActive = true
    emitAutoAlert({
      id: 'auto-exceso-camiones',
      type: 'exceso_camiones',
      description: `Ocupacion excede umbral configurado (${maxTrucksThreshold}).`,
      severity: 'critical',
      status: 'activa',
      source,
    })
  } else if (excesoAlertActive) {
    emitAutoAlert({
      id: 'auto-exceso-camiones',
      type: 'exceso_camiones',
      description: 'Ocupacion bajo el umbral configurado.',
      severity: 'info',
      status: 'resuelta',
      source,
    })
    excesoAlertActive = false
  }
}

function addListener(path: string, callback: (value: unknown) => void) {
  if (!firebaseDb) return
  const unsubscribe = onValue(
    dbRef(firebaseDb, path),
    (snapshot) => callback(snapshot.val()),
    (error) => {
      const dashboardStore = useDashboardStore()
      dashboardStore.setError(`Firebase (${path}): ${error.message}`)
    },
  )
  unsubscribers.push(unsubscribe)
}

function addLimitedListener(path: string, limit: number, callback: (value: unknown) => void) {
  if (!firebaseDb) return
  const q = query(dbRef(firebaseDb, path), limitToLast(limit))
  const unsubscribe = onValue(
    q,
    (snapshot) => callback(snapshot.val()),
    (error) => {
      const dashboardStore = useDashboardStore()
      dashboardStore.setError(`Firebase (${path}): ${error.message}`)
    },
  )
  unsubscribers.push(unsubscribe)
}

export function startFirebaseRealtimeSync() {
  if (!isFirebaseConfigured || !firebaseDb || running) return false

  const authStore = useAuthStore()
  const dashboardStore = useDashboardStore()
  const devicesStore = useDevicesStore()
  const vehiclesStore = useVehiclesStore()
  const alertsStore = useAlertsStore()
  const historyStore = useHistoryStore()
  const barrierStore = useBarrierStore()
  const settingsStore = useSettingsStore()
  latestAccessRecords = []
  latestPlateReadingRecords = []
  autoAlertSignatures = new Map<string, string>()
  activeOfflineAlertIds = new Set<string>()
  activeStayAlertIds = new Set<string>()
  offlineAlertContextById = new Map<string, { name: string; accessPoint: string }>()
  stayAlertContextById = new Map<
    string,
    { plate: string; accessPoint: string; limitMinutes: number }
  >()
  excesoAlertActive = false
  lastStateSyncMs = 0

  addListener('dashboardCache/kpiSummary', (value) => {
    dashboardStore.setKpiFromRemote(toObject(value))
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  addListener('dashboardCache/dailySummary', (value) => {
    dashboardStore.setDailySummaryFromRemote(toObject(value))
    dashboardStore.setLastUpdated()
  })

  addListener('dashboardCache/chartSeries/activityByHour', (value) => {
    dashboardStore.setActivityByHourFromRemote(toObject(value))
    dashboardStore.setLastUpdated()
  })

  addListener('dashboardCache/recentActivity', (value) => {
    dashboardStore.setRecentActivityFromRemote(parseRecentActivity(value))
    dashboardStore.setLastUpdated()
  })

  addListener('state', (value) => {
    const state = toObject(value)
    dashboardStore.setPlantStateFromRemote({
      currentCount: toNumber(state.currentCount, 0),
      maxCapacity: toNumber(state.maxCapacity, 20),
      occupancyLevel: normalizeOccupancyLevel(state.occupancyLevel),
      trucksInside: parseTrucksInside(state.trucksInside),
    })
    lastStateSyncMs = Date.now()
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  addListener('devices', (value) => {
    devicesStore.setDevices(parseDevices(value))
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  addListener('vehicles', (value) => {
    vehiclesStore.setVehicles(parseVehicleRegistry(value))
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  addListener(`barrier/${realtimeAccessPoint}`, (value) => {
    const barrier = toObject(value)
    barrierStore.syncBarrierFromRemote({
      accessPoint: realtimeAccessPoint,
      status: normalizeBarrierStatus(barrier.status),
      mode: normalizeBarrierMode(barrier.mode),
      lastActionAt: toIso(barrier.lastActionAt),
      lastActionBy: String(barrier.lastActionBy ?? 'sistema'),
      reason: String(barrier.reason ?? ''),
      source: String(barrier.lastActionBy ?? 'device'),
    })
    dashboardStore.setLastUpdated()
  })

  addListener('settings', (value) => {
    const settings = parseSettings(value)
    if (!Object.keys(settings).length) return
    settingsStore.applyRemoteSettings(settings)
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  addLimitedListener('alerts', 200, (value) => {
    const parsedAlerts = parseAlerts(value)
    alertsStore.setAlerts(parsedAlerts)
    hydrateAutoAlertStateFromRemote(parsedAlerts)
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  addLimitedListener('accessRecords', 500, (value) => {
    latestAccessRecords = parseAccessRecords(value)
    historyStore.setRecords(mergeHistoryRecords(latestAccessRecords, latestPlateReadingRecords))
    syncPlantStateFromHistory({
      dashboardStore,
      vehiclesStore,
    })
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  addLimitedListener('ingest/plate_readings', 500, (value) => {
    latestPlateReadingRecords = parsePlateReadingsAsAccessRecords(value)
    historyStore.setRecords(mergeHistoryRecords(latestAccessRecords, latestPlateReadingRecords))
    syncPlantStateFromHistory({
      dashboardStore,
      vehiclesStore,
    })
    dashboardStore.setLastUpdated()
    evaluateAndSyncDerivedAlerts({
      authStore,
      dashboardStore,
      devicesStore,
      settingsStore,
      vehiclesStore,
    })
  })

  if (deviceHealthInterval) clearInterval(deviceHealthInterval)
  deviceHealthInterval = setInterval(refreshDerivedDeviceHealth, Math.max(1000, Math.floor(DEVICE_OFFLINE_TIMEOUT_MS / 5)))
  refreshDerivedDeviceHealth()

  dashboardStore.setError('')
  running = true
  return true
}

export function stopFirebaseRealtimeSync() {
  if (!running) return
  if (deviceHealthInterval) {
    clearInterval(deviceHealthInterval)
    deviceHealthInterval = null
  }
  for (const unsubscribe of unsubscribers.splice(0, unsubscribers.length)) {
    unsubscribe()
  }
  autoAlertSignatures = new Map<string, string>()
  activeOfflineAlertIds = new Set<string>()
  activeStayAlertIds = new Set<string>()
  offlineAlertContextById = new Map<string, { name: string; accessPoint: string }>()
  stayAlertContextById = new Map<
    string,
    { plate: string; accessPoint: string; limitMinutes: number }
  >()
  excesoAlertActive = false
  lastStateSyncMs = 0
  running = false
}

export function isFirebaseRealtimeSyncRunning() {
  return running
}

export function setRealtimeSyncAccessPoint(accessPoint: string) {
  const normalized =
    normalizeAccessPointKey(accessPoint) ||
    normalizeAccessPointKey(firebaseAccessPoint) ||
    'porton_norte'

  if (normalized === realtimeAccessPoint) return
  realtimeAccessPoint = normalized

  if (running) {
    stopFirebaseRealtimeSync()
    startFirebaseRealtimeSync()
  }
}

export function getRealtimeSyncAccessPoint() {
  return realtimeAccessPoint
}
