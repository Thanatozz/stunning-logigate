<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import AppCard from '@/components/common/AppCard.vue'
import { useThemeStore } from '@/stores/theme.store'
import type { ActivityByHourPoint } from '@/types/domain'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  data: ActivityByHourPoint[]
}>()

const themeStore = useThemeStore()
const { mode } = storeToRefs(themeStore)

function readThemeTriplet(styles: CSSStyleDeclaration, token: string, fallback: string) {
  return styles.getPropertyValue(`--${token}`).trim() || fallback
}

function asRgb(triplet: string, alpha = 1) {
  const parts = triplet.split(/\s+/).map((value) => Number.parseInt(value, 10))
  const [r, g, b] = parts.length === 3 ? parts : [15, 23, 42]
  if (alpha === 1) return `rgb(${r} ${g} ${b})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const visibleData = computed(() => props.data.slice(-5))

const chartPalette = computed(() => {
  mode.value
  const styles = getComputedStyle(document.documentElement)
  const accent = readThemeTriplet(styles, 'color-accent', '15 91 255')
  const success = readThemeTriplet(styles, 'color-success', '29 157 95')
  const muted = readThemeTriplet(styles, 'color-muted', '95 114 138')
  const line = readThemeTriplet(styles, 'color-line', '217 227 243')

  return {
    accent: asRgb(accent),
    success: asRgb(success),
    labels: asRgb(muted),
    grid: asRgb(line, 0.55),
  }
})

const chartData = computed(() => ({
  labels: visibleData.value.map((point) => point.hour),
  datasets: [
    {
      label: 'Ingresos',
      data: visibleData.value.map((point) => point.entries),
      backgroundColor: chartPalette.value.accent,
      borderRadius: 6,
    },
    {
      label: 'Salidas',
      data: visibleData.value.map((point) => point.exits),
      backgroundColor: chartPalette.value.success,
      borderRadius: 6,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        useBorderRadius: true,
        color: chartPalette.value.labels,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: chartPalette.value.labels,
      },
      grid: {
        color: chartPalette.value.grid,
      },
    },
    x: {
      ticks: {
        color: chartPalette.value.labels,
      },
      grid: {
        display: false,
      },
    },
  },
}))
</script>

<template>
  <AppCard class="flex h-full flex-col">
    <h3 class="text-sm font-semibold">Actividad por hora (ultimas 5 horas)</h3>
    <div class="mt-3 min-h-[18rem] flex-1">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </AppCard>
</template>
