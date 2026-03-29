import type {
  ActivityByHourPoint,
  DailySummary,
  DailyTrendPoint,
  KpiSummary,
  PlantState,
  RecentActivityItem,
  ComparisonPoint,
} from '@/types/domain'

export const mockKpiSummary: KpiSummary = {
  trucksInPlant: 4,
  todayEntries: 27,
  todayExits: 23,
  avgStayMinutes: 142,
}

export const mockPlantState: PlantState = {
  currentCount: 4,
  maxCapacity: 20,
  occupancyLevel: 'medio',
  trucksInside: [
    {
      plate: 'AB-1234',
      company: 'Transportes Andes',
      enteredAt: '2026-03-29T05:40:00-03:00',
      accumulatedMinutes: 240,
      accessPoint: 'Portón Norte',
    },
    {
      plate: 'JK-7890',
      company: 'Trans Cordillera',
      enteredAt: '2026-03-29T07:21:00-03:00',
      accumulatedMinutes: 139,
      accessPoint: 'Portón Norte',
    },
    {
      plate: 'LM-2468',
      company: 'Carga Metropolitana',
      enteredAt: '2026-03-29T08:04:00-03:00',
      accumulatedMinutes: 96,
      accessPoint: 'Portón Sur',
    },
    {
      plate: 'EF-9012',
      company: 'Frío Express',
      enteredAt: '2026-03-29T08:58:00-03:00',
      accumulatedMinutes: 42,
      accessPoint: 'Portón Sur',
    },
  ],
}

export const mockActivityByHour: ActivityByHourPoint[] = [
  { hour: '05:00', entries: 2, exits: 0 },
  { hour: '06:00', entries: 4, exits: 1 },
  { hour: '07:00', entries: 5, exits: 2 },
  { hour: '08:00', entries: 7, exits: 5 },
  { hour: '09:00', entries: 4, exits: 3 },
  { hour: '10:00', entries: 2, exits: 1 },
  { hour: '11:00', entries: 3, exits: 2 },
]

export const mockDailyTrend: DailyTrendPoint[] = [
  { date: 'Lun', entries: 31, exits: 29 },
  { date: 'Mar', entries: 28, exits: 27 },
  { date: 'Mié', entries: 33, exits: 30 },
  { date: 'Jue', entries: 26, exits: 25 },
  { date: 'Vie', entries: 35, exits: 34 },
  { date: 'Sáb', entries: 19, exits: 18 },
  { date: 'Dom', entries: 27, exits: 23 },
]

export const mockComparison: ComparisonPoint[] = [
  { label: 'Ingresos', current: 189, previous: 164 },
  { label: 'Salidas', current: 176, previous: 160 },
  { label: 'Tiempo promedio', current: 142, previous: 156 },
  { label: 'Alertas', current: 12, previous: 18 },
]

export const mockRecentActivity: RecentActivityItem[] = [
  {
    id: 'act-001',
    title: 'Ingreso registrado',
    detail: 'Patente JK-7890 por Portón Norte',
    timestamp: '2026-03-29T09:20:00-03:00',
    level: 'normal',
  },
  {
    id: 'act-002',
    title: 'Alerta crítica',
    detail: 'ESP32-CAM Portón Sur quedó sin conexión',
    timestamp: '2026-03-29T09:30:00-03:00',
    level: 'critical',
  },
  {
    id: 'act-003',
    title: 'Apertura manual',
    detail: 'Barrera Norte abierta por Supervisor Javier Soto',
    timestamp: '2026-03-29T09:15:00-03:00',
    level: 'info',
  },
  {
    id: 'act-004',
    title: 'Salida confirmada',
    detail: 'Patente CD-5678, permanencia 164 minutos',
    timestamp: '2026-03-29T08:57:00-03:00',
    level: 'normal',
  },
]

export const mockDailySummary: DailySummary = {
  totalEntries: 27,
  totalExits: 23,
  avgStayMinutes: 142,
  peakHour: '08:00 - 09:00',
  occupancyRate: 72,
}
