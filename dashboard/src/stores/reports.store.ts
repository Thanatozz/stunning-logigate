import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockComparison, mockDailySummary, mockDailyTrend } from '@/data/mock/dashboard'
import { mockReportSummaries } from '@/data/mock/reports'
import type { ComparisonPoint, DailySummary, DailyTrendPoint } from '@/types/domain'

export const useReportsStore = defineStore('reports', () => {
  const summaries = ref<DailySummary[]>([...mockReportSummaries])
  const selectedSummary = ref<DailySummary>({ ...mockDailySummary })
  const trend = ref<DailyTrendPoint[]>([...mockDailyTrend])
  const comparison = ref<ComparisonPoint[]>([...mockComparison])
  const rangeLabel = ref('Últimos 7 días')

  const trendTotals = computed(() => ({
    entries: trend.value.reduce((acc, item) => acc + item.entries, 0),
    exits: trend.value.reduce((acc, item) => acc + item.exits, 0),
  }))

  return {
    summaries,
    selectedSummary,
    trend,
    comparison,
    rangeLabel,
    trendTotals,
  }
})
