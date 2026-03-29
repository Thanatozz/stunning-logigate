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
import type {
  ChartSeries,
  DailySummary,
  KpiSummary,
  OccupancyLevel,
  PlantState,
  RecentActivityItem,
  TruckInside,
} from '@/types/domain'

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
  const error = ref('')

  const occupancyPercent = computed(() =>
    Math.round((plantState.value.currentCount / plantState.value.maxCapacity) * 100),
  )

  function generatePlate() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const partA = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)]
    const partB = String(Math.floor(Math.random() * 9000) + 1000)
    return `${partA}-${partB}`
  }

  function resolveOccupancyLevel(percent: number): OccupancyLevel {
    if (percent >= 85) return 'alto'
    if (percent >= 50) return 'medio'
    return 'bajo'
  }

  function recalcAvgStay() {
    if (!plantState.value.trucksInside.length) {
      kpi.value.avgStayMinutes = 0
      dailySummary.value.avgStayMinutes = 0
      return
    }
    const total = plantState.value.trucksInside.reduce((sum, truck) => sum + truck.accumulatedMinutes, 0)
    const avg = Math.round(total / plantState.value.trucksInside.length)
    kpi.value.avgStayMinutes = avg
    dailySummary.value.avgStayMinutes = avg
  }

  function pushRecentActivity(item: RecentActivityItem) {
    recentActivity.value.unshift(item)
    if (recentActivity.value.length > 12) {
      recentActivity.value = recentActivity.value.slice(0, 12)
    }
  }

  function registerEntry(nowIso: string) {
    const companies = ['Transportes Andes', 'Trans Cordillera', 'Carga Metropolitana', 'Frio Express']
    const accessPoints = ['Porton Norte', 'Porton Sur']
    const newTruck: TruckInside = {
      plate: generatePlate(),
      company: companies[Math.floor(Math.random() * companies.length)],
      enteredAt: nowIso,
      accumulatedMinutes: 0,
      accessPoint: accessPoints[Math.floor(Math.random() * accessPoints.length)],
    }

    plantState.value.trucksInside.unshift(newTruck)
    kpi.value.todayEntries += 1
    dailySummary.value.totalEntries += 1
    chartSeries.value.activityByHour[chartSeries.value.activityByHour.length - 1].entries += 1

    pushRecentActivity({
      id: `act-${Math.random().toString(36).slice(2, 10)}`,
      title: 'Ingreso registrado',
      detail: `Patente ${newTruck.plate} por ${newTruck.accessPoint}`,
      timestamp: nowIso,
      level: 'normal',
    })
  }

  function registerExit(nowIso: string) {
    if (!plantState.value.trucksInside.length) return
    const outIndex = Math.floor(Math.random() * plantState.value.trucksInside.length)
    const [truck] = plantState.value.trucksInside.splice(outIndex, 1)
    if (!truck) return

    kpi.value.todayExits += 1
    dailySummary.value.totalExits += 1
    chartSeries.value.activityByHour[chartSeries.value.activityByHour.length - 1].exits += 1

    pushRecentActivity({
      id: `act-${Math.random().toString(36).slice(2, 10)}`,
      title: 'Salida confirmada',
      detail: `Patente ${truck.plate}, permanencia ${truck.accumulatedMinutes} minutos`,
      timestamp: nowIso,
      level: 'normal',
    })
  }

  function refreshSnapshot() {
    const now = new Date()
    const nowIso = now.toISOString()

    if (Math.random() < 0.08) {
      error.value = 'Se perdio la sincronizacion temporal con la capa IoT.'
      lastUpdated.value = nowIso
      return
    }
    error.value = ''

    for (const truck of plantState.value.trucksInside) {
      truck.accumulatedMinutes += Math.floor(Math.random() * 5) + 2
    }

    const shouldRegisterEntry = !plantState.value.trucksInside.length || Math.random() > 0.45
    if (shouldRegisterEntry && plantState.value.trucksInside.length < plantState.value.maxCapacity) {
      registerEntry(nowIso)
    } else {
      registerExit(nowIso)
    }

    plantState.value.currentCount = plantState.value.trucksInside.length
    kpi.value.trucksInPlant = plantState.value.currentCount

    const percent = Math.round((plantState.value.currentCount / plantState.value.maxCapacity) * 100)
    plantState.value.occupancyLevel = resolveOccupancyLevel(percent)

    recalcAvgStay()
    lastUpdated.value = nowIso
  }

  function addRecentActivity(item: Omit<RecentActivityItem, 'id' | 'timestamp'> & Partial<Pick<RecentActivityItem, 'id' | 'timestamp'>>) {
    pushRecentActivity({
      id: item.id ?? `act-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: item.timestamp ?? new Date().toISOString(),
      title: item.title,
      detail: item.detail,
      level: item.level,
    })
  }

  return {
    kpi,
    plantState,
    chartSeries,
    recentActivity,
    dailySummary,
    lastUpdated,
    error,
    occupancyPercent,
    refreshSnapshot,
    addRecentActivity,
  }
})
