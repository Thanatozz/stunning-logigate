<script setup lang="ts">
import { computed } from 'vue'
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
import type { ComparisonPoint } from '@/types/domain'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  data: ComparisonPoint[]
}>()

const chartData = computed(() => ({
  labels: props.data.map((point) => point.label),
  datasets: [
    {
      label: 'Período actual',
      data: props.data.map((point) => point.current),
      backgroundColor: '#0f5bff',
    },
    {
      label: 'Período anterior',
      data: props.data.map((point) => point.previous),
      backgroundColor: '#8aaef7',
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
    <h3 class="text-sm font-semibold">Comparación entre períodos</h3>
    <div class="mt-3 h-72">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </AppCard>
</template>
