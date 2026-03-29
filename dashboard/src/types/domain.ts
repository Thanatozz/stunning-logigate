export type Role = 'admin' | 'supervisor'

export type VehicleCategory = 'carga_pesada' | 'carga_liviana' | 'refrigerado' | 'especial'
export type VehicleStatus = 'autorizado' | 'observacion' | 'bloqueado'

export interface UserSession {
  id: string
  name: string
  email: string
  role: Role
  lastLoginAt: string
}

export interface Vehicle {
  plate: string
  company: string
  cargoType: string
  category: VehicleCategory
  status: VehicleStatus
  active: boolean
  createdAt: string
}

export type AccessEventType = 'ingreso' | 'salida'
export type BarrierMode = 'automatico' | 'manual_remoto' | 'manual_fisico'

export interface AccessRecord {
  id: string
  plate: string
  company: string
  eventType: AccessEventType
  timestamp: string
  accessPoint: string
  ocrConfidence: number
  stayMinutes: number | null
  barrierMode: BarrierMode
  deviceId: string
}

export type OccupancyLevel = 'bajo' | 'medio' | 'alto'

export interface TruckInside {
  plate: string
  company: string
  enteredAt: string
  accumulatedMinutes: number
  accessPoint: string
}

export interface PlantState {
  currentCount: number
  maxCapacity: number
  occupancyLevel: OccupancyLevel
  trucksInside: TruckInside[]
}

export type AlertType =
  | 'exceso_camiones'
  | 'permanencia_excesiva'
  | 'dispositivo_offline'
  | 'inconsistencia'
  | 'vehiculo_no_autorizado'

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'activa' | 'resuelta' | 'ignorada'

export interface Alert {
  id: string
  type: AlertType
  description: string
  severity: AlertSeverity
  status: AlertStatus
  timestamp: string
  relatedPlate?: string
  source: string
}

export type DeviceType = 'esp32_cam' | 'sensor_ir' | 'barrera_servo'
export type DeviceStatus = 'online' | 'offline' | 'degradado'

export interface Device {
  id: string
  name: string
  type: DeviceType
  accessPoint: string
  status: DeviceStatus
  lastSeen: string
  signal: number
  firmware: string
}

export type BarrierStatus = 'abierta' | 'cerrada' | 'en_transicion'

export interface BarrierState {
  accessPoint: string
  status: BarrierStatus
  mode: BarrierMode
  lastActionAt: string
  lastActionBy: string
}

export interface AccessPoint {
  id: string
  name: string
  location: string
  active: boolean
}

export interface SystemSettings {
  maxTrucks: number
  maxStayMinutes: number
  ocrConfidenceThreshold: number
  captureIntervalSeconds: number
  barrierAutoCloseSeconds: number
  accessPoints: AccessPoint[]
}

export interface KpiSummary {
  trucksInPlant: number
  todayEntries: number
  todayExits: number
  avgStayMinutes: number
}

export interface ChartPoint {
  label: string
  value: number
}

export interface ActivityByHourPoint {
  hour: string
  entries: number
  exits: number
}

export interface DailyTrendPoint {
  date: string
  entries: number
  exits: number
}

export interface ComparisonPoint {
  label: string
  current: number
  previous: number
}

export interface ChartSeries {
  activityByHour: ActivityByHourPoint[]
  trend: DailyTrendPoint[]
  comparison: ComparisonPoint[]
}

export interface RecentActivityItem {
  id: string
  title: string
  detail: string
  timestamp: string
  level: AlertSeverity | 'normal'
}

export interface DailySummary {
  totalEntries: number
  totalExits: number
  avgStayMinutes: number
  peakHour: string
  occupancyRate: number
}
