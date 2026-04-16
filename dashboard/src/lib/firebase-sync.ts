import {
  limitToLast,
  onValue,
  query,
  ref as dbRef,
  type Unsubscribe,
} from 'firebase/database'
import { DEVICE_OFFLINE_TIMEOUT_MS, inferDeviceStatusFromHeartbeat } from '@/lib/device-health'
import { firebaseAccessPoint, firebaseDb, isFirebaseConfigured } from '@/lib/firebase'
import { normalizeAccessPointKey } from '@/lib/access-point'
import { useAlertsStore } from '@/stores/alerts.store'
import { useBarrierStore } from '@/stores/barrier.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useDevicesStore } from '@/stores/devices.store'
import { useHistoryStore } from '@/stores/history.store'
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
} from '@/types/domain'

let running = false
const unsubscribers: Unsubscribe[] = []
let realtimeAccessPoint =
  normalizeAccessPointKey(firebaseAccessPoint) || 'porton_norte'
let latestAccessRecords: AccessRecord[] = []
let latestPlateReadingRecords: AccessRecord[] = []
let deviceHealthInterval: ReturnType<typeof setInterval> | null = null

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
        plate: String(item.plate ?? plate),
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
  const devicesStore = useDevicesStore()
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
        relatedPlate: item.relatedPlate ? String(item.relatedPlate) : undefined,
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
        plate: String(item.plate ?? 'SIN-PLACA'),
        company: String(item.company ?? 'Sin empresa'),
        eventType: normalizeEventType(item.eventType),
        timestamp: toIso(item.timestamp),
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
  return Object.entries(source)
    .map(([id, raw]) => {
      const item = toObject(raw)
      const plate = String(item.plate ?? '').trim()
      return {
        id: `pr-${id}`,
        plate: plate.length ? plate : 'SIN-PLACA',
        company: String(item.company ?? 'Sin empresa'),
        eventType: normalizeEventTypeFromPlateReading(item),
        timestamp: toIso(item.capturedAt ?? item.timestamp),
        accessPoint: String(item.accessPoint ?? realtimeAccessPoint),
        ocrConfidence: normalizeOcrConfidenceFromPlateReading(item),
        stayMinutes: null,
        barrierMode: normalizeBarrierMode(item.mode),
        deviceId: String(item.deviceId ?? 'device-unknown'),
      }
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
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

  const dashboardStore = useDashboardStore()
  const devicesStore = useDevicesStore()
  const alertsStore = useAlertsStore()
  const historyStore = useHistoryStore()
  const barrierStore = useBarrierStore()
  latestAccessRecords = []
  latestPlateReadingRecords = []

  addListener('dashboardCache/kpiSummary', (value) => {
    dashboardStore.setKpiFromRemote(toObject(value))
    dashboardStore.setLastUpdated()
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
    dashboardStore.setLastUpdated()
  })

  addListener('devices', (value) => {
    devicesStore.setDevices(parseDevices(value))
    dashboardStore.setLastUpdated()
  })

  addListener(`barrier/${realtimeAccessPoint}`, (value) => {
    const barrier = toObject(value)
    barrierStore.setBarrierSnapshot({
      accessPoint: realtimeAccessPoint,
      status: normalizeBarrierStatus(barrier.status),
      mode: normalizeBarrierMode(barrier.mode),
      lastActionAt: toIso(barrier.lastActionAt),
      lastActionBy: String(barrier.lastActionBy ?? 'sistema'),
    })
    dashboardStore.setLastUpdated()
  })

  addLimitedListener('alerts', 200, (value) => {
    alertsStore.setAlerts(parseAlerts(value))
    dashboardStore.setLastUpdated()
  })

  addLimitedListener('accessRecords', 500, (value) => {
    latestAccessRecords = parseAccessRecords(value)
    historyStore.setRecords(mergeHistoryRecords(latestAccessRecords, latestPlateReadingRecords))
    dashboardStore.setLastUpdated()
  })

  addLimitedListener('ingest/plate_readings', 500, (value) => {
    latestPlateReadingRecords = parsePlateReadingsAsAccessRecords(value)
    historyStore.setRecords(mergeHistoryRecords(latestAccessRecords, latestPlateReadingRecords))
    dashboardStore.setLastUpdated()
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
