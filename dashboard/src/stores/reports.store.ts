import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAlertsStore } from '@/stores/alerts.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useHistoryStore } from '@/stores/history.store'
import type { AccessRecord, ComparisonPoint, DailySummary, DailyTrendPoint } from '@/types/domain'

interface SummaryWindow {
  days: number
  label: string
}

const SUMMARY_WINDOWS: SummaryWindow[] = [
  { days: 1, label: 'Hoy' },
  { days: 7, label: 'Últimos 7 días' },
  { days: 30, label: 'Últimos 30 días' },
]

const EMPTY_SUMMARY: DailySummary = {
  totalEntries: 0,
  totalExits: 0,
  avgStayMinutes: 0,
  peakHour: '-',
  occupancyRate: 0,
}

export const useReportsStore = defineStore('reports', () => {
  const historyStore = useHistoryStore()
  const dashboardStore = useDashboardStore()
  const alertsStore = useAlertsStore()

  const selectedSummaryIndex = ref(1)

  const summaries = computed<DailySummary[]>(() => {
    return SUMMARY_WINDOWS.map((window) => {
      const range = getCurrentRange(window.days)
      const records = filterRecordsByRange(historyStore.records, range.start, range.end)
      return buildSummary(records, dashboardStore.occupancyPercent)
    })
  })

  const summaryOptions = computed(() =>
    SUMMARY_WINDOWS.map((window, index) => ({
      label: window.label,
      value: index,
    })),
  )

  const selectedWindow = computed(() => SUMMARY_WINDOWS[selectedSummaryIndex.value] ?? SUMMARY_WINDOWS[0])

  const selectedSummary = computed<DailySummary>(() => {
    return summaries.value[selectedSummaryIndex.value] ?? summaries.value[0] ?? EMPTY_SUMMARY
  })

  const rangeLabel = computed(() => selectedWindow.value.label)

  const trend = computed<DailyTrendPoint[]>(() => {
    const range = getCurrentRange(selectedWindow.value.days)
    return buildTrend(historyStore.records, range.start, range.end, selectedWindow.value.days)
  })

  const comparison = computed<ComparisonPoint[]>(() => {
    const range = getCurrentRange(selectedWindow.value.days)
    const previousRange = getPreviousRange(range.start, selectedWindow.value.days)

    const currentRecords = filterRecordsByRange(historyStore.records, range.start, range.end)
    const previousRecords = filterRecordsByRange(historyStore.records, previousRange.start, previousRange.end)

    const currentSummary = buildSummary(currentRecords, dashboardStore.occupancyPercent)
    const previousSummary = buildSummary(previousRecords, dashboardStore.occupancyPercent)

    const currentAlerts = countAlertsInRange(alertsStore.alerts, range.start, range.end)
    const previousAlerts = countAlertsInRange(alertsStore.alerts, previousRange.start, previousRange.end)

    return [
      { label: 'Ingresos', current: currentSummary.totalEntries, previous: previousSummary.totalEntries },
      { label: 'Salidas', current: currentSummary.totalExits, previous: previousSummary.totalExits },
      { label: 'Tiempo promedio (min)', current: currentSummary.avgStayMinutes, previous: previousSummary.avgStayMinutes },
      { label: 'Alertas', current: currentAlerts, previous: previousAlerts },
    ]
  })

  const trendTotals = computed(() => ({
    entries: trend.value.reduce((acc, item) => acc + item.entries, 0),
    exits: trend.value.reduce((acc, item) => acc + item.exits, 0),
  }))

  function setSelectedSummaryIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, SUMMARY_WINDOWS.length - 1))
    selectedSummaryIndex.value = clamped
  }

  return {
    summaries,
    selectedSummary,
    trend,
    comparison,
    rangeLabel,
    trendTotals,
    selectedSummaryIndex,
    summaryOptions,
    setSelectedSummaryIndex,
  }
})

function getCurrentRange(days: number) {
  const now = new Date()
  const start = startOfDay(addDays(now, -(days - 1)))
  return {
    start,
    end: now,
  }
}

function getPreviousRange(currentStart: Date, days: number) {
  const start = startOfDay(addDays(currentStart, -days))
  const end = new Date(currentStart.getTime() - 1)
  return {
    start,
    end,
  }
}

function startOfDay(date: Date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function filterRecordsByRange(records: AccessRecord[], start: Date, end: Date) {
  const startMs = start.getTime()
  const endMs = end.getTime()

  return records.filter((record) => {
    const timestamp = toDate(record.timestamp)
    if (!timestamp) return false
    const ms = timestamp.getTime()
    return ms >= startMs && ms <= endMs
  })
}

function countByEventType(records: AccessRecord[], eventType: AccessRecord['eventType']) {
  return records.reduce((total, record) => total + (record.eventType === eventType ? 1 : 0), 0)
}

function avgStayMinutes(records: AccessRecord[]) {
  const values = records
    .map((record) => record.stayMinutes)
    .filter((value): value is number => value !== null && Number.isFinite(value))

  if (!values.length) return 0

  const total = values.reduce((sum, value) => sum + value, 0)
  return Math.round(total / values.length)
}

function buildPeakHour(records: AccessRecord[]) {
  if (!records.length) return '-'

  const hourlyCount = new Map<number, number>()
  for (const record of records) {
    const timestamp = toDate(record.timestamp)
    if (!timestamp) continue
    const hour = timestamp.getHours()
    hourlyCount.set(hour, (hourlyCount.get(hour) ?? 0) + 1)
  }

  if (!hourlyCount.size) return '-'

  let peakHour = 0
  let peakCount = -1
  for (const [hour, count] of hourlyCount.entries()) {
    if (count > peakCount) {
      peakCount = count
      peakHour = hour
    }
  }

  const start = `${String(peakHour).padStart(2, '0')}:00`
  const end = `${String((peakHour + 1) % 24).padStart(2, '0')}:00`
  return `${start} - ${end}`
}

function buildSummary(records: AccessRecord[], occupancyPercent: number): DailySummary {
  return {
    totalEntries: countByEventType(records, 'ingreso'),
    totalExits: countByEventType(records, 'salida'),
    avgStayMinutes: avgStayMinutes(records),
    peakHour: buildPeakHour(records),
    occupancyRate: Number.isFinite(occupancyPercent) ? occupancyPercent : 0,
  }
}

function formatTrendDate(date: Date) {
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
  })
}

function buildTrend(records: AccessRecord[], start: Date, end: Date, days: number): DailyTrendPoint[] {
  const dayKeys: string[] = []
  const keyToDate = new Map<string, Date>()

  const startDay = startOfDay(start)
  for (let offset = 0; offset < days; offset += 1) {
    const day = addDays(startDay, offset)
    if (day.getTime() > end.getTime()) break
    const key = dateKey(day)
    dayKeys.push(key)
    keyToDate.set(key, day)
  }

  const bucket = new Map<string, { entries: number; exits: number }>()
  for (const key of dayKeys) {
    bucket.set(key, { entries: 0, exits: 0 })
  }

  for (const record of records) {
    const timestamp = toDate(record.timestamp)
    if (!timestamp) continue
    const ms = timestamp.getTime()
    if (ms < start.getTime() || ms > end.getTime()) continue

    const key = dateKey(startOfDay(timestamp))
    const point = bucket.get(key)
    if (!point) continue

    if (record.eventType === 'ingreso') point.entries += 1
    else if (record.eventType === 'salida') point.exits += 1
  }

  return dayKeys.map((key) => ({
    date: formatTrendDate(keyToDate.get(key) ?? new Date(key)),
    entries: bucket.get(key)?.entries ?? 0,
    exits: bucket.get(key)?.exits ?? 0,
  }))
}

function countAlertsInRange(alerts: Array<{ timestamp: string }>, start: Date, end: Date) {
  const startMs = start.getTime()
  const endMs = end.getTime()

  return alerts.reduce((count, alert) => {
    const timestamp = toDate(alert.timestamp)
    if (!timestamp) return count
    const ms = timestamp.getTime()
    return ms >= startMs && ms <= endMs ? count + 1 : count
  }, 0)
}
