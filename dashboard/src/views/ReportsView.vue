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
          <ExportButton label="Exportar CSV" />
          <ExportButton label="Exportar PDF" />
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
