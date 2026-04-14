<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import ExportButton from '@/components/common/ExportButton.vue'
import DailySummaryCards from '@/components/reports/DailySummaryCards.vue'
import TrendChart from '@/components/reports/TrendChart.vue'
import ComparisonChart from '@/components/reports/ComparisonChart.vue'
import ExportOptionsModal from '@/components/reports/ExportOptionsModal.vue'
import { useAlertsStore } from '@/stores/alerts.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useHistoryStore } from '@/stores/history.store'
import { useReportsStore } from '@/stores/reports.store'
import type { AccessRecord, ComparisonPoint, DailySummary, DailyTrendPoint } from '@/types/domain'
import type { ReportsExportRequest } from '@/types/reports-export'

interface DatedRecord {
  record: AccessRecord
  parsedDate: Date
}

interface RangeContext {
  label: string
  start: Date
  end: Date
  previousStart: Date | null
  previousEnd: Date | null
}

interface ExportSnapshot {
  rangeLabel: string
  summary: DailySummary
  trend: DailyTrendPoint[]
  comparison: ComparisonPoint[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_DAYS_BY_INDEX = [1, 7, 30] as const

const alertsStore = useAlertsStore()
const dashboardStore = useDashboardStore()
const historyStore = useHistoryStore()
const reportsStore = useReportsStore()

const {
  selectedSummary,
  trend,
  comparison,
  rangeLabel,
  trendTotals,
  selectedSummaryIndex,
  summaryOptions,
} = storeToRefs(reportsStore)

const isExportModalOpen = ref(false)

function openExportModal() {
  isExportModalOpen.value = true
}

function closeExportModal() {
  isExportModalOpen.value = false
}

function buildTimestamp() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${yyyy}${mm}${dd}-${hh}${min}`
}

function downloadBlob(content: BlobPart, type: string, fileName: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: string | number) {
  const normalized = String(value).replace(/\r?\n/g, ' ').replace(/"/g, '""')
  return `"${normalized}"`
}

function csvRow(values: Array<string | number>) {
  return values.map(csvCell).join(',')
}

function numberDelta(current: number, previous: number) {
  const diff = current - previous
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff}`
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return '0%'
    return 'N/A'
  }

  const delta = ((current - previous) / previous) * 100
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}%`
}

function toValidDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function addDays(date: Date, days: number) {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getAllValidRecords() {
  return historyStore.records
    .map((record) => ({ record, parsedDate: toValidDate(record.timestamp) }))
    .filter((item): item is DatedRecord => item.parsedDate !== null)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
}

function filterDatedRecordsByRange(records: DatedRecord[], start: Date, end: Date) {
  const startMs = start.getTime()
  const endMs = end.getTime()
  return records.filter((item) => {
    const ms = item.parsedDate.getTime()
    return ms >= startMs && ms <= endMs
  })
}

function countByEventType(records: AccessRecord[], eventType: AccessRecord['eventType']) {
  return records.reduce((count, record) => count + (record.eventType === eventType ? 1 : 0), 0)
}

function avgStayForRecords(records: AccessRecord[]) {
  const valid = records
    .map((record) => record.stayMinutes)
    .filter((value): value is number => value !== null && Number.isFinite(value))

  if (!valid.length) return 0

  const total = valid.reduce((sum, value) => sum + value, 0)
  return Math.round(total / valid.length)
}

function buildPeakHour(records: AccessRecord[]) {
  if (!records.length) return '-'

  const hourlyCount = new Map<number, number>()
  for (const record of records) {
    const parsed = toValidDate(record.timestamp)
    if (!parsed) continue
    const hour = parsed.getHours()
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

  const from = `${String(peakHour).padStart(2, '0')}:00`
  const to = `${String((peakHour + 1) % 24).padStart(2, '0')}:00`
  return `${from} - ${to}`
}

function buildSummaryFromRecords(records: AccessRecord[]): DailySummary {
  return {
    totalEntries: countByEventType(records, 'ingreso'),
    totalExits: countByEventType(records, 'salida'),
    avgStayMinutes: avgStayForRecords(records),
    peakHour: buildPeakHour(records),
    occupancyRate: Number.isFinite(dashboardStore.occupancyPercent) ? dashboardStore.occupancyPercent : 0,
  }
}

function formatTrendDate(date: Date) {
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
  })
}

function buildDailyTrend(records: AccessRecord[], start: Date, end: Date) {
  const bucket = new Map<string, { entries: number; exits: number; date: Date }>()
  const firstDay = startOfDay(start)
  const days = Math.max(1, Math.floor((endOfDay(end).getTime() - firstDay.getTime()) / DAY_MS) + 1)

  for (let index = 0; index < days; index += 1) {
    const date = addDays(firstDay, index)
    const key = dateKey(date)
    bucket.set(key, { entries: 0, exits: 0, date })
  }

  for (const record of records) {
    const parsed = toValidDate(record.timestamp)
    if (!parsed) continue
    const key = dateKey(startOfDay(parsed))
    const point = bucket.get(key)
    if (!point) continue
    if (record.eventType === 'ingreso') point.entries += 1
    if (record.eventType === 'salida') point.exits += 1
  }

  return [...bucket.values()].map((point) => ({
    date: formatTrendDate(point.date),
    entries: point.entries,
    exits: point.exits,
  }))
}

function buildMonthlyTrend(records: AccessRecord[]) {
  const bucket = new Map<string, { entries: number; exits: number }>()

  for (const record of records) {
    const parsed = toValidDate(record.timestamp)
    if (!parsed) continue
    const key = monthKey(parsed)
    const point = bucket.get(key) ?? { entries: 0, exits: 0 }
    if (record.eventType === 'ingreso') point.entries += 1
    if (record.eventType === 'salida') point.exits += 1
    bucket.set(key, point)
  }

  return [...bucket.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, point]) => ({
      date: key,
      entries: point.entries,
      exits: point.exits,
    }))
}

function buildTrendFromRecords(records: AccessRecord[], start: Date, end: Date) {
  const totalDays = Math.max(1, Math.floor((endOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS) + 1)
  if (totalDays > 120) {
    return buildMonthlyTrend(records)
  }
  return buildDailyTrend(records, start, end)
}

function countAlertsInRange(start: Date, end: Date) {
  const startMs = start.getTime()
  const endMs = end.getTime()

  return alertsStore.alerts.reduce((count, alert) => {
    const parsed = toValidDate(alert.timestamp)
    if (!parsed) return count
    const ms = parsed.getTime()
    return ms >= startMs && ms <= endMs ? count + 1 : count
  }, 0)
}

function buildComparison(
  currentRecords: AccessRecord[],
  previousRecords: AccessRecord[],
  context: RangeContext,
): ComparisonPoint[] {
  const currentSummary = buildSummaryFromRecords(currentRecords)
  const previousSummary = buildSummaryFromRecords(previousRecords)

  const currentAlerts = countAlertsInRange(context.start, context.end)
  const previousAlerts = context.previousStart && context.previousEnd
    ? countAlertsInRange(context.previousStart, context.previousEnd)
    : 0

  return [
    { label: 'Ingresos', current: currentSummary.totalEntries, previous: previousSummary.totalEntries },
    { label: 'Salidas', current: currentSummary.totalExits, previous: previousSummary.totalExits },
    { label: 'Tiempo promedio (min)', current: currentSummary.avgStayMinutes, previous: previousSummary.avgStayMinutes },
    { label: 'Alertas', current: currentAlerts, previous: previousAlerts },
  ]
}

function buildContextByDays(days: number, label: string): RangeContext {
  const end = new Date()
  const start = startOfDay(addDays(end, -(days - 1)))
  const previousStart = startOfDay(addDays(start, -days))
  const previousEnd = new Date(start.getTime() - 1)
  return { label, start, end, previousStart, previousEnd }
}

function buildCustomContext(dateFrom: string, dateTo: string): RangeContext {
  const start = startOfDay(new Date(`${dateFrom}T00:00:00`))
  const end = endOfDay(new Date(`${dateTo}T00:00:00`))
  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1)
  const previousStart = startOfDay(addDays(start, -days))
  const previousEnd = new Date(start.getTime() - 1)
  return {
    label: `${dateFrom} a ${dateTo}`,
    start,
    end,
    previousStart,
    previousEnd,
  }
}

function buildAllContext(records: DatedRecord[]): RangeContext {
  const now = new Date()
  if (!records.length) {
    return {
      label: 'Historial completo (sin datos)',
      start: startOfDay(now),
      end: endOfDay(now),
      previousStart: null,
      previousEnd: null,
    }
  }

  return {
    label: 'Historial completo',
    start: startOfDay(records[0].parsedDate),
    end: endOfDay(records[records.length - 1].parsedDate),
    previousStart: null,
    previousEnd: null,
  }
}

function buildRangeContext(request: ReportsExportRequest, records: DatedRecord[]): RangeContext {
  if (request.rangePreset === 'selected') {
    const selectedDays = RANGE_DAYS_BY_INDEX[selectedSummaryIndex.value] ?? 7
    return buildContextByDays(selectedDays, rangeLabel.value)
  }

  if (request.rangePreset === 'today') return buildContextByDays(1, 'Hoy')
  if (request.rangePreset === 'last7') return buildContextByDays(7, 'Últimos 7 días')
  if (request.rangePreset === 'last30') return buildContextByDays(30, 'Últimos 30 días')
  if (request.rangePreset === 'custom') return buildCustomContext(request.dateFrom, request.dateTo)
  return buildAllContext(records)
}

function buildSnapshot(context: RangeContext, allRecords: DatedRecord[]): ExportSnapshot {
  const currentDated = filterDatedRecordsByRange(allRecords, context.start, context.end)
  const currentRecords = currentDated.map((item) => item.record)
  const previousRecords = context.previousStart && context.previousEnd
    ? filterDatedRecordsByRange(allRecords, context.previousStart, context.previousEnd).map((item) => item.record)
    : []

  return {
    rangeLabel: context.label,
    summary: buildSummaryFromRecords(currentRecords),
    trend: buildTrendFromRecords(currentRecords, context.start, context.end),
    comparison: buildComparison(currentRecords, previousRecords, context),
  }
}

function exportCsvAnalytics(snapshot: ExportSnapshot) {
  const lines: string[] = []
  lines.push(csvRow(['LogiGate - Reporte operativo']))
  lines.push(csvRow(['Generado', new Date().toLocaleString('es-CL')]))
  lines.push(csvRow(['Rango analizado', snapshot.rangeLabel]))
  lines.push('')
  lines.push(csvRow(['Resumen general']))
  lines.push(csvRow(['Indicador', 'Valor']))
  lines.push(csvRow(['Ingresos totales', snapshot.summary.totalEntries]))
  lines.push(csvRow(['Salidas totales', snapshot.summary.totalExits]))
  lines.push(csvRow(['Tiempo promedio (min)', snapshot.summary.avgStayMinutes]))
  lines.push(csvRow(['Hora pico', snapshot.summary.peakHour]))
  lines.push(csvRow(['Ocupación (%)', snapshot.summary.occupancyRate]))
  lines.push('')
  lines.push(csvRow(['Tendencia']))
  lines.push(csvRow(['Fecha', 'Ingresos', 'Salidas', 'Balance']))
  for (const item of snapshot.trend) {
    lines.push(csvRow([item.date, item.entries, item.exits, item.entries - item.exits]))
  }
  lines.push('')
  lines.push(csvRow(['Comparativo vs período anterior']))
  lines.push(csvRow(['Métrica', 'Actual', 'Anterior', 'Delta', 'Delta %']))
  for (const item of snapshot.comparison) {
    lines.push(
      csvRow([
        item.label,
        item.current,
        item.previous,
        numberDelta(item.current, item.previous),
        percentDelta(item.current, item.previous),
      ]),
    )
  }

  const csvContent = `\uFEFF${lines.join('\n')}`
  const fileName = `reporte-logigate-${buildTimestamp()}.csv`
  downloadBlob(csvContent, 'text/csv;charset=utf-8', fileName)
}

function exportCsvFullData(
  rangeLabelValue: string,
  records: DatedRecord[],
  options: Pick<ReportsExportRequest, 'includeYearly' | 'includeMonthly' | 'includeDetail'>,
) {
  const yearlyGroups = new Map<string, AccessRecord[]>()
  const monthlyGroups = new Map<string, AccessRecord[]>()

  for (const item of records) {
    const year = String(item.parsedDate.getFullYear())
    const month = monthKey(item.parsedDate)

    const yearBucket = yearlyGroups.get(year) ?? []
    yearBucket.push(item.record)
    yearlyGroups.set(year, yearBucket)

    const monthBucket = monthlyGroups.get(month) ?? []
    monthBucket.push(item.record)
    monthlyGroups.set(month, monthBucket)
  }

  const lines: string[] = []
  lines.push(csvRow(['LogiGate - Exportación completa']))
  lines.push(csvRow(['Generado', new Date().toLocaleString('es-CL')]))
  lines.push(csvRow(['Rango analizado', rangeLabelValue]))
  lines.push(csvRow(['Total de eventos exportados', records.length]))
  lines.push('')

  if (options.includeYearly) {
    lines.push(csvRow(['Resumen anual']))
    lines.push(csvRow(['Año', 'Ingresos', 'Salidas', 'Total eventos', 'Tiempo promedio (min)']))
    for (const key of [...yearlyGroups.keys()].sort()) {
      const bucket = yearlyGroups.get(key) ?? []
      lines.push(
        csvRow([
          key,
          countByEventType(bucket, 'ingreso'),
          countByEventType(bucket, 'salida'),
          bucket.length,
          avgStayForRecords(bucket),
        ]),
      )
    }
    lines.push('')
  }

  if (options.includeMonthly) {
    lines.push(csvRow(['Resumen mensual']))
    lines.push(csvRow(['Período (AAAA-MM)', 'Ingresos', 'Salidas', 'Total eventos', 'Tiempo promedio (min)']))
    for (const key of [...monthlyGroups.keys()].sort()) {
      const bucket = monthlyGroups.get(key) ?? []
      lines.push(
        csvRow([
          key,
          countByEventType(bucket, 'ingreso'),
          countByEventType(bucket, 'salida'),
          bucket.length,
          avgStayForRecords(bucket),
        ]),
      )
    }
    lines.push('')
  }

  if (options.includeDetail) {
    lines.push(csvRow(['Detalle completo de eventos']))
    lines.push(
      csvRow([
        'ID',
        'Timestamp',
        'Fecha local',
        'Año',
        'Mes',
        'Tipo evento',
        'Patente',
        'Empresa',
        'Punto acceso',
        'Dispositivo',
        'Confianza OCR',
        'Permanencia (min)',
        'Modo barrera',
      ]),
    )
    for (const item of records) {
      lines.push(
        csvRow([
          item.record.id,
          item.record.timestamp,
          item.parsedDate.toLocaleString('es-CL'),
          item.parsedDate.getFullYear(),
          String(item.parsedDate.getMonth() + 1).padStart(2, '0'),
          item.record.eventType,
          item.record.plate,
          item.record.company,
          item.record.accessPoint,
          item.record.deviceId,
          item.record.ocrConfidence,
          item.record.stayMinutes ?? '',
          item.record.barrierMode,
        ]),
      )
    }
  }

  const csvContent = `\uFEFF${lines.join('\n')}`
  const fileName = `reporte-logigate-completo-${buildTimestamp()}.csv`
  downloadBlob(csvContent, 'text/csv;charset=utf-8', fileName)
}

async function exportPdf(snapshot: ExportSnapshot) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const autoTable = autoTableModule.default
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  let cursorY = 42

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('LogiGate - Reporte operativo', 40, cursorY)
  cursorY += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Rango analizado: ${snapshot.rangeLabel}`, 40, cursorY)
  cursorY += 14
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 40, cursorY)
  cursorY += 22

  autoTable(doc, {
    startY: cursorY,
    head: [['Resumen general', 'Valor']],
    body: [
      ['Ingresos totales', snapshot.summary.totalEntries],
      ['Salidas totales', snapshot.summary.totalExits],
      ['Tiempo promedio (min)', snapshot.summary.avgStayMinutes],
      ['Hora pico', snapshot.summary.peakHour],
      ['Ocupación (%)', snapshot.summary.occupancyRate],
    ],
    margin: { left: 40, right: 40 },
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59] },
  })

  const withLastTable = doc as InstanceType<typeof jsPDF> & { lastAutoTable?: { finalY: number } }
  cursorY = (withLastTable.lastAutoTable?.finalY ?? cursorY) + 18

  autoTable(doc, {
    startY: cursorY,
    head: [['Tendencia', 'Ingresos', 'Salidas', 'Balance']],
    body: snapshot.trend.map((item) => [item.date, item.entries, item.exits, item.entries - item.exits]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59] },
  })

  cursorY = (withLastTable.lastAutoTable?.finalY ?? cursorY) + 18

  autoTable(doc, {
    startY: cursorY,
    head: [['Comparativo', 'Actual', 'Anterior', 'Delta', 'Delta %']],
    body: snapshot.comparison.map((item) => [
      item.label,
      item.current,
      item.previous,
      numberDelta(item.current, item.previous),
      percentDelta(item.current, item.previous),
    ]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: pageWidth * 0.34 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  })

  doc.save(`reporte-logigate-${buildTimestamp()}.pdf`)
}

async function onExportConfirm(request: ReportsExportRequest) {
  const allRecords = getAllValidRecords()
  const context = buildRangeContext(request, allRecords)
  const scopedRecords = filterDatedRecordsByRange(allRecords, context.start, context.end)

  if (request.format === 'csv') {
    if (request.csvMode === 'full') {
      exportCsvFullData(context.label, scopedRecords, {
        includeYearly: request.includeYearly,
        includeMonthly: request.includeMonthly,
        includeDetail: request.includeDetail,
      })
    } else {
      const snapshot = buildSnapshot(context, allRecords)
      exportCsvAnalytics(snapshot)
    }
    closeExportModal()
    return
  }

  const snapshot = buildSnapshot(context, allRecords)
  await exportPdf(snapshot)
  closeExportModal()
}
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Reportes y analítica"
      :subtitle="`Ventana de análisis: ${rangeLabel}`"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <ExportButton label="Exportar reporte" @click="openExportModal" />
        </div>
      </template>
    </AppSectionHeader>

    <section class="card-panel p-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <article class="rounded-xl border border-line bg-white p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Ingresos acumulados</p>
          <p class="mt-2 text-xl font-semibold text-ink">{{ trendTotals.entries }}</p>
        </article>
        <article class="rounded-xl border border-line bg-white p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Salidas acumuladas</p>
          <p class="mt-2 text-xl font-semibold text-ink">{{ trendTotals.exits }}</p>
        </article>
        <label class="rounded-xl border border-line bg-white p-3">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted">Rango</span>
          <select
            v-model.number="selectedSummaryIndex"
            class="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option v-for="option in summaryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </section>

    <DailySummaryCards :summary="selectedSummary" />

    <section class="grid gap-4 xl:grid-cols-2">
      <TrendChart :data="trend" />
      <ComparisonChart :data="comparison" />
    </section>

    <ExportOptionsModal
      :open="isExportModalOpen"
      @close="closeExportModal"
      @confirm="onExportConfirm"
    />
  </div>
</template>
