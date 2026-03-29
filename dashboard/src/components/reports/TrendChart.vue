<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import AppCard from '@/components/common/AppCard.vue'
import type { DailyTrendPoint } from '@/types/domain'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps<{
  data: DailyTrendPoint[]
}>()

const chartData = computed(() => ({
  labels: props.data.map((point) => point.date),
  datasets: [
    {
      label: 'Ingresos',
      data: props.data.map((point) => point.entries),
      borderColor: '#0f5bff',
      backgroundColor: '#0f5bff22',
      tension: 0.35,
      fill: true,
    },
    {
      label: 'Salidas',
      data: props.data.map((point) => point.exits),
      borderColor: '#1d9d5f',
      backgroundColor: '#1d9d5f22',
      tension: 0.35,
      fill: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
  },
  scales: {
    y: { beginAtZero: true, grid: { color: '#e6eefb' } },
    x: { grid: { display: false } },
  },
}
</script>

<template>
  <AppCard>
    <h3 class="text-sm font-semibold">Tendencia de actividad</h3>
    <div class="mt-3 h-72">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </AppCard>
</template>
