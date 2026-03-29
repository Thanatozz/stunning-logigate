import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  mockActivityByHour,
  mockComparison,
  mockDailySummary,
  mockDailyTrend,
  mockKpiSummary,
  mockPlantState,
  mockRecentActivity,
} from '@/data/mock/dashboard'
import type { ChartSeries, DailySummary, KpiSummary, PlantState, RecentActivityItem } from '@/types/domain'

export const useDashboardStore = defineStore('dashboard', () => {
  const kpi = ref<KpiSummary>({ ...mockKpiSummary })
  const plantState = ref<PlantState>({ ...mockPlantState, trucksInside: [...mockPlantState.trucksInside] })
  const chartSeries = ref<ChartSeries>({
    activityByHour: [...mockActivityByHour],
    trend: [...mockDailyTrend],
    comparison: [...mockComparison],
  })
  const recentActivity = ref<RecentActivityItem[]>([...mockRecentActivity])
  const dailySummary = ref<DailySummary>({ ...mockDailySummary })
  const lastUpdated = ref(new Date().toISOString())

  const occupancyPercent = computed(() =>
    Math.round((plantState.value.currentCount / plantState.value.maxCapacity) * 100),
  )

  function refreshSnapshot() {
    lastUpdated.value = new Date().toISOString()
  }

  return {
    kpi,
    plantState,
    chartSeries,
    recentActivity,
    dailySummary,
    lastUpdated,
    occupancyPercent,
    refreshSnapshot,
  }
})
