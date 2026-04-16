import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useAlertsStore } from '@/stores/alerts.store'
import { useDevicesStore } from '@/stores/devices.store'
import { useBarrierStore } from '@/stores/barrier.store'
import { useAuthStore } from '@/stores/auth.store'
import { useIotSimulatorStore } from '@/stores/iot-simulator.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useHistoryStore } from '@/stores/history.store'
import { isFirebaseConfigured } from '@/lib/firebase'
import { setRealtimeSyncAccessPoint } from '@/lib/firebase-sync'
import { sendBarrierCommand } from '@/lib/firebase-writes'
import type { BarrierMode } from '@/types/domain'

export function useDashboardPage() {
  const dashboardStore = useDashboardStore()
  const alertsStore = useAlertsStore()
  const devicesStore = useDevicesStore()
  const barrierStore = useBarrierStore()
  const authStore = useAuthStore()
  const iotSimulatorStore = useIotSimulatorStore()
  const settingsStore = useSettingsStore()
  const historyStore = useHistoryStore()

  const { kpi, plantState, chartSeries, recentActivity, lastUpdated, error } =
    storeToRefs(dashboardStore)
  const { activeAlerts } = storeToRefs(alertsStore)
  const { devices } = storeToRefs(devicesStore)
  const { barrier, commandLog } = storeToRefs(barrierStore)
  const { canControlBarrier, currentUserName } = storeToRefs(authStore)
  const { isRunning, lastScenarioLabel, lastRunAt } =
    storeToRefs(iotSimulatorStore)
  const { controlAccessPoint } = storeToRefs(settingsStore)
  const { records: historyRecords } = storeToRefs(historyStore)

  const isLoading = ref(true)
  const showIotDemoControls = !isFirebaseConfigured
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let stopAccessPointWatch: (() => void) | null = null

  const latestAlerts = computed(() => activeAlerts.value.slice(0, 3))

  function getActorName() {
    return currentUserName.value || 'Operador'
  }

  async function onModeChange(mode: BarrierMode) {
    const actor = getActorName()
    const targetAccessPoint = controlAccessPoint.value
    barrierStore.setBarrierSnapshot({ accessPoint: targetAccessPoint })
    barrierStore.setMode(mode, actor)
    barrierStore.addCommandLog(
      `Modo ${mode} solicitado para ${targetAccessPoint} por ${actor}`,
    )

    if (!isFirebaseConfigured) return

    try {
      await sendBarrierCommand({
        mode,
        action: 'none',
        updatedBy: actor,
        accessPoint: targetAccessPoint,
        reason: `Cambio de modo a ${mode}`,
      })
      dashboardStore.setError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'error desconocido'
      const isPermissionDenied = message
        .toLowerCase()
        .includes('permission_denied')
      dashboardStore.setError(
        isPermissionDenied
          ? 'Sin permisos para operar barrera. Revisa reglas RTDB (commands/barrier) y que users/{auth.uid}/role sea admin o supervisor.'
          : `No se pudo actualizar estado de automatico: ${message}`,
      )
    }
  }

  async function onOpenBarrier() {
    const actor = getActorName()
    const targetAccessPoint = controlAccessPoint.value
    const isAutomatic = barrier.value.mode === 'automatico'

    barrierStore.setBarrierSnapshot({ accessPoint: targetAccessPoint })

    if (isAutomatic) {
      barrierStore.setBarrierStatus(
        'en_transicion',
        actor,
        `Apertura automatica solicitada (${targetAccessPoint})`,
      )
    } else {
      barrierStore.setBarrierStatus(
        'abierta',
        actor,
        `Apertura manual remota (${targetAccessPoint})`,
      )
    }

    if (!isFirebaseConfigured) return

    try {
      const windowSeconds = Math.max(
        1,
        Math.floor(settingsStore.settings.barrierAutoCloseSeconds || 10),
      )
      const autoOpenUntil = Date.now() + windowSeconds * 1000

      await sendBarrierCommand({
        mode: barrier.value.mode,
        action: 'abrir',
        autoOpenUntil: isAutomatic ? autoOpenUntil : 0,
        updatedBy: actor,
        accessPoint: targetAccessPoint,
        reason: isAutomatic
          ? `Apertura solicitada en modo automatico (${targetAccessPoint})`
          : `Apertura manual remota (${targetAccessPoint})`,
      })

      if (isAutomatic) {
        dashboardStore.addRecentActivity({
          title: 'Apertura automatica solicitada',
          detail: `${targetAccessPoint} · ventana ${windowSeconds}s`,
          level: 'info',
        })
      } else {
        dashboardStore.addRecentActivity({
          title: 'Apertura manual remota',
          detail: `${targetAccessPoint} solicitada por ${actor}`,
          level: 'normal',
        })
      }

      dashboardStore.setError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'error desconocido'
      const isPermissionDenied = message
        .toLowerCase()
        .includes('permission_denied')
      dashboardStore.setError(
        isPermissionDenied
          ? 'Sin permisos para abrir barrera. Revisa reglas RTDB (commands/barrier) y que users/{auth.uid}/role sea admin o supervisor.'
          : `No se pudo enviar comando de apertura (${targetAccessPoint}): ${message}`,
      )
    }
  }

  async function onCloseBarrier() {
    const actor = getActorName()
    const targetAccessPoint = controlAccessPoint.value
    barrierStore.setBarrierSnapshot({ accessPoint: targetAccessPoint })
    barrierStore.setBarrierStatus(
      'cerrada',
      actor,
      `Cierre manual remoto (${targetAccessPoint})`,
    )

    if (!isFirebaseConfigured) return

    try {
      await sendBarrierCommand({
        mode: barrier.value.mode,
        action: 'cerrar',
        updatedBy: actor,
        accessPoint: targetAccessPoint,
        reason: `Cierre manual remoto (${targetAccessPoint})`,
      })
      dashboardStore.addRecentActivity({
        title: 'Cierre manual remoto',
        detail: `${targetAccessPoint} solicitado por ${actor}`,
        level: 'normal',
      })
      dashboardStore.setError('')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'error desconocido'
      const isPermissionDenied = message
        .toLowerCase()
        .includes('permission_denied')
      dashboardStore.setError(
        isPermissionDenied
          ? 'Sin permisos para cerrar barrera. Revisa reglas RTDB (commands/barrier) y que users/{auth.uid}/role sea admin o supervisor.'
          : `No se pudo enviar comando de cierre: ${message}`,
      )
    }
  }

  function retryRefresh() {
    if (!isFirebaseConfigured) {
      dashboardStore.refreshSnapshot()
    }
  }

  function toggleIotSimulation() {
    if (isFirebaseConfigured) return
    iotSimulatorStore.toggle()
  }

  function triggerIotEvent() {
    if (isFirebaseConfigured) return
    iotSimulatorStore.runOnce()
  }

  onMounted(() => {
    if (isFirebaseConfigured) {
      void settingsStore.loadSettingsFromFirebase()
    }

    if (isFirebaseConfigured) {
      stopAccessPointWatch = watch(
        controlAccessPoint,
        (nextValue) => {
          setRealtimeSyncAccessPoint(nextValue)
          barrierStore.setBarrierSnapshot({ accessPoint: nextValue })
          barrierStore.setCommandLog([])
          barrierStore.addCommandLog(`Control activo en ${nextValue}`)
        },
        { immediate: true },
      )
    }

    if (isLoading.value) {
      setTimeout(() => {
        isLoading.value = false
      }, 450)
    }

    if (!isFirebaseConfigured) {
      refreshTimer = setInterval(() => {
        dashboardStore.refreshSnapshot()
      }, 12000)

      iotSimulatorStore.start(9000)
    }
  })

  onBeforeUnmount(() => {
    if (stopAccessPointWatch) {
      stopAccessPointWatch()
      stopAccessPointWatch = null
    }

    if (refreshTimer) clearInterval(refreshTimer)
    if (!isFirebaseConfigured) {
      iotSimulatorStore.stop()
    }
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
    showIotDemoControls,
    lastScenarioLabel,
    lastRunAt,
    isLoading,
    onModeChange,
    onOpenBarrier,
    onCloseBarrier,
    retryRefresh,
    toggleIotSimulation,
    triggerIotEvent,
    historyRecords,
  }
}
