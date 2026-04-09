<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import ExportButton from '@/components/common/ExportButton.vue'
import DailySummaryCards from '@/components/reports/DailySummaryCards.vue'
import TrendChart from '@/components/reports/TrendChart.vue'
import ComparisonChart from '@/components/reports/ComparisonChart.vue'
import { useReportsStore } from '@/stores/reports.store'

const reportsStore = useReportsStore()
const { summaries, selectedSummary, trend, comparison, rangeLabel, trendTotals } = storeToRefs(reportsStore)

const selectedIndex = ref(0)

const summaryOptions = computed(() =>
  summaries.value.map((_, index) => ({
    label: `Resumen ${index + 1}`,
    value: String(index),
  })),
)

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
  const normalized = String(value).replace(/"/g, '""')
  return `"${normalized}"`
}

function exportCsv() {
  const lines: string[] = []
  lines.push('LogiGate - Reporte operativo')
  lines.push(`Ventana,${rangeLabel.value}`)
  lines.push('')
  lines.push('Resumen diario')
  lines.push('campo,valor')
  lines.push(`total_ingresos,${selectedSummary.value.totalEntries}`)
  lines.push(`total_salidas,${selectedSummary.value.totalExits}`)
  lines.push(`tiempo_promedio_min,${selectedSummary.value.avgStayMinutes}`)
  lines.push(`hora_peak,${csvCell(selectedSummary.value.peakHour)}`)
  lines.push(`ocupacion_pct,${selectedSummary.value.occupancyRate}`)
  lines.push('')
  lines.push('Tendencia')
  lines.push('dia,ingresos,salidas')
  for (const item of trend.value) {
    lines.push([csvCell(item.date), item.entries, item.exits].join(','))
  }
  lines.push('')
  lines.push('Comparativo')
  lines.push('metrica,actual,anterior')
  for (const item of comparison.value) {
    lines.push([csvCell(item.label), item.current, item.previous].join(','))
  }

  const csvContent = `\uFEFF${lines.join('\n')}`
  const fileName = `reporte-logigate-${buildTimestamp()}.csv`
  downloadBlob(csvContent, 'text/csv;charset=utf-8', fileName)
}

function exportPdf() {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760')
  if (!printWindow) return

  const trendRows = trend.value
    .map(
      (item) =>
        `<tr><td>${item.date}</td><td>${item.entries}</td><td>${item.exits}</td></tr>`,
    )
    .join('')

  const comparisonRows = comparison.value
    .map(
      (item) =>
        `<tr><td>${item.label}</td><td>${item.current}</td><td>${item.previous}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Reporte LogiGate</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 20px 0 8px; }
    p { margin: 2px 0; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f3f4f6; }
    .meta { margin-top: 8px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .card strong { display: block; font-size: 18px; margin-top: 6px; }
  </style>
</head>
<body>
  <h1>LogiGate - Reporte operativo</h1>
  <p class="meta">Ventana de analisis: ${rangeLabel.value}</p>
  <p class="meta">Generado: ${new Date().toLocaleString('es-CL')}</p>

  <h2>Resumen diario</h2>
  <div class="grid">
    <div class="card">Ingresos totales<strong>${selectedSummary.value.totalEntries}</strong></div>
    <div class="card">Salidas totales<strong>${selectedSummary.value.totalExits}</strong></div>
    <div class="card">Tiempo promedio (min)<strong>${selectedSummary.value.avgStayMinutes}</strong></div>
    <div class="card">Ocupacion (%)<strong>${selectedSummary.value.occupancyRate}</strong></div>
  </div>
  <p class="meta">Hora peak: ${selectedSummary.value.peakHour}</p>

  <h2>Tendencia</h2>
  <table>
    <thead><tr><th>Dia</th><th>Ingresos</th><th>Salidas</th></tr></thead>
    <tbody>${trendRows}</tbody>
  </table>

  <h2>Comparativo</h2>
  <table>
    <thead><tr><th>Metrica</th><th>Actual</th><th>Anterior</th></tr></thead>
    <tbody>${comparisonRows}</tbody>
  </table>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.onafterprint = () => {
    printWindow.close()
  }
  setTimeout(() => {
    printWindow.print()
  }, 300)
}

watch(
  selectedIndex,
  (value) => {
    selectedSummary.value = summaries.value[value] ?? summaries.value[0]
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Reportes y analitica"
      :subtitle="`Ventana de analisis: ${rangeLabel}`"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <ExportButton label="Exportar CSV" @click="exportCsv" />
          <ExportButton label="Exportar PDF" @click="exportPdf" />
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
          <span class="text-xs font-semibold uppercase tracking-wide text-muted">Escenario</span>
          <select
            v-model.number="selectedIndex"
            class="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option v-for="(option, index) in summaryOptions" :key="option.value" :value="index">
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
  </div>
</template>
