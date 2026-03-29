import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useAlertsStore } from '@/stores/alerts.store'
import { useDevicesStore } from '@/stores/devices.store'
import { useBarrierStore } from '@/stores/barrier.store'
import { useAuthStore } from '@/stores/auth.store'
import { useIotSimulatorStore } from '@/stores/iot-simulator.store'
import type { BarrierMode } from '@/types/domain'

export function useDashboardPage() {
  const dashboardStore = useDashboardStore()
  const alertsStore = useAlertsStore()
  const devicesStore = useDevicesStore()
  const barrierStore = useBarrierStore()
  const authStore = useAuthStore()
  const iotSimulatorStore = useIotSimulatorStore()

  const { kpi, plantState, chartSeries, recentActivity, lastUpdated, error } = storeToRefs(dashboardStore)
  const { activeAlerts } = storeToRefs(alertsStore)
  const { devices } = storeToRefs(devicesStore)
  const { barrier, commandLog } = storeToRefs(barrierStore)
  const { canControlBarrier, currentUserName } = storeToRefs(authStore)
  const { isRunning, lastScenarioLabel, lastRunAt } = storeToRefs(iotSimulatorStore)

  const isLoading = ref(true)
  let refreshTimer: ReturnType<typeof setInterval> | null = null

  const latestAlerts = computed(() => activeAlerts.value.slice(0, 3))

  function getActorName() {
    return currentUserName.value || 'Operador'
  }

  function onModeChange(mode: BarrierMode) {
    barrierStore.setMode(mode, getActorName())
  }

  function onOpenBarrier() {
    barrierStore.openBarrier(getActorName())
  }

  function onCloseBarrier() {
    barrierStore.closeBarrier(getActorName())
  }

  function retryRefresh() {
    dashboardStore.refreshSnapshot()
  }

  function toggleIotSimulation() {
    iotSimulatorStore.toggle()
  }

  function triggerIotEvent() {
    iotSimulatorStore.runOnce()
  }

  onMounted(() => {
    if (isLoading.value) {
      setTimeout(() => {
        isLoading.value = false
      }, 450)
    }

    refreshTimer = setInterval(() => {
      dashboardStore.refreshSnapshot()
    }, 12000)

    iotSimulatorStore.start(9000)
  })

  onBeforeUnmount(() => {
    if (refreshTimer) clearInterval(refreshTimer)
    iotSimulatorStore.stop()
  })

  return {
    dashboardStore,
    kpi,
    plantState,
    chartSeries,
    recentActivity,
    lastUpdated,
    error,
    latestAlerts,
    devices,
    barrier,
    commandLog,
    canControlBarrier,
    isRunning,
    lastScenarioLabel,
    lastRunAt,
    isLoading,
    onModeChange,
    onOpenBarrier,
    onCloseBarrier,
    retryRefresh,
    toggleIotSimulation,
    triggerIotEvent,
  }
}