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
import type { ActivityByHourPoint } from '@/types/domain'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  data: ActivityByHourPoint[]
}>()

const chartData = computed(() => ({
  labels: props.data.map((point) => point.hour),
  datasets: [
    {
      label: 'Ingresos',
      data: props.data.map((point) => point.entries),
      backgroundColor: '#0f5bff',
      borderRadius: 6,
    },
    {
      label: 'Salidas',
      data: props.data.map((point) => point.exits),
      backgroundColor: '#1d9d5f',
      borderRadius: 6,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        useBorderRadius: true,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#e6eefb',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
}
</script>

<template>
  <AppCard>
    <h3 class="text-sm font-semibold">Actividad por hora</h3>
    <div class="mt-3 h-72">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </AppCard>
</template>
