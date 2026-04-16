import {
  limitToLast,
  onValue,
  query,
  ref as dbRef,
  type Unsubscribe,
} from 'firebase/database'
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
  DeviceType,
  RecentActivityItem,
  TruckInside,
} from '@/types/domain'

let running = false
const unsubscribers: Unsubscribe[] = []
let realtimeAccessPoint =
  normalizeAccessPointKey(firebaseAccessPoint) || 'porton_norte'

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toIso(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : new Date().toISOString()
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
  return Object.entries(source)
    .map(([id, raw]) => {
      const item = toObject(raw)
      return {
        id,
        name: String(item.name ?? id),
        type: normalizeDeviceType(item.type),
        accessPoint: String(item.accessPoint ?? realtimeAccessPoint),
        status: normalizeDeviceStatus(item.status),
        lastSeen: toIso(item.lastSeen),
        signal: toNumber(item.signal, 0),
        firmware: String(item.firmware ?? 'v1.0.0'),
      }
    })
    .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen))
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
    historyStore.setRecords(parseAccessRecords(value))
    dashboardStore.setLastUpdated()
  })

  dashboardStore.setError('')
  running = true
  return true
}

export function stopFirebaseRealtimeSync() {
  if (!running) return
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
