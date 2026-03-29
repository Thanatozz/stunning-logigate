import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAlertsStore } from '@/stores/alerts.store'
import { useBarrierStore } from '@/stores/barrier.store'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useDevicesStore } from '@/stores/devices.store'

type IotScenario =
  | 'device_offline'
  | 'device_recovered'
  | 'device_degraded'
  | 'barrier_cycle'
  | 'unauthorized_plate'

const scenarioLabels: Record<IotScenario, string> = {
  device_offline: 'Dispositivo offline',
  device_recovered: 'Dispositivo recuperado',
  device_degraded: 'Senal degradada',
  barrier_cycle: 'Evento automatico de barrera',
  unauthorized_plate: 'Patente no autorizada',
}

export const useIotSimulatorStore = defineStore('iotSimulator', () => {
  const isRunning = ref(false)
  const intervalMs = ref(10000)
  const lastScenario = ref<IotScenario | null>(null)
  const lastRunAt = ref('')
  let timer: ReturnType<typeof setInterval> | null = null

  const lastScenarioLabel = computed(() => {
    if (!lastScenario.value) return 'Sin eventos recientes'
    return scenarioLabels[lastScenario.value]
  })

  function generatePlate() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const partA = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)]
    const partB = String(Math.floor(Math.random() * 9000) + 1000)
    return `${partA}-${partB}`
  }

  function chooseScenario(): IotScenario {
    const devicesStore = useDevicesStore()
    const hasOffline = Boolean(devicesStore.getRandomDeviceByStatus('offline'))
    if (hasOffline && Math.random() > 0.45) {
      return 'device_recovered'
    }
    const scenarios: IotScenario[] = [
      'device_offline',
      'device_degraded',
      'barrier_cycle',
      'unauthorized_plate',
    ]
    return scenarios[Math.floor(Math.random() * scenarios.length)]
  }

  function runCycle() {
    const alertsStore = useAlertsStore()
    const barrierStore = useBarrierStore()
    const dashboardStore = useDashboardStore()
    const devicesStore = useDevicesStore()
    const nowIso = new Date().toISOString()

    const scenario = chooseScenario()
    lastScenario.value = scenario
    lastRunAt.value = nowIso

    if (scenario === 'device_offline') {
      const target =
        devicesStore.getRandomDeviceByStatus('online') ??
        devicesStore.getRandomDeviceByStatus('degradado')
      if (!target) return

      devicesStore.setDeviceStatus(target.id, 'offline', 0)
      barrierStore.setMode('manual_remoto', 'Sistema IoT')
      barrierStore.setBarrierStatus(
        'cerrada',
        'Sistema IoT',
        `Cierre preventivo por falla en ${target.accessPoint}`,
      )
      alertsStore.createAlert({
        type: 'dispositivo_offline',
        description: `${target.name} sin conexion en ${target.accessPoint}.`,
        severity: 'critical',
        source: 'Monitor IoT',
      })
      dashboardStore.addRecentActivity({
        title: 'Dispositivo offline',
        detail: `${target.name} quedo fuera de linea`,
        level: 'critical',
      })
      return
    }

    if (scenario === 'device_recovered') {
      const target = devicesStore.getRandomDeviceByStatus('offline')
      if (!target) return

      devicesStore.setDeviceStatus(target.id, 'online', 82 + Math.floor(Math.random() * 14))
      barrierStore.setMode('automatico', 'Sistema IoT')
      alertsStore.resolveLatestActiveByType('dispositivo_offline')
      alertsStore.createAlert({
        type: 'dispositivo_offline',
        description: `${target.name} recupero conectividad.`,
        severity: 'info',
        status: 'resuelta',
        source: 'Monitor IoT',
      })
      dashboardStore.addRecentActivity({
        title: 'Dispositivo recuperado',
        detail: `${target.name} vuelve a operar normalmente`,
        level: 'info',
      })
      return
    }

    if (scenario === 'device_degraded') {
      const target = devicesStore.getRandomDeviceByStatus('online')
      if (!target) return

      devicesStore.setDeviceStatus(target.id, 'degradado', 45 + Math.floor(Math.random() * 21))
      alertsStore.createAlert({
        type: 'inconsistencia',
        description: `Lecturas intermitentes detectadas en ${target.name}.`,
        severity: 'warning',
        source: 'Diagnostico IoT',
      })
      dashboardStore.addRecentActivity({
        title: 'Sensor degradado',
        detail: `${target.name} reporta senal inestable`,
        level: 'warning',
      })
      return
    }

    if (scenario === 'barrier_cycle') {
      const isOpen = barrierStore.barrier.status === 'abierta'
      if (isOpen) {
        barrierStore.setBarrierStatus('en_transicion', 'Sistema IoT', 'Cierre automatico en curso')
        barrierStore.closeBarrier('Sistema IoT')
      } else {
        barrierStore.setBarrierStatus('en_transicion', 'Sistema IoT', 'Apertura automatica en curso')
        barrierStore.openBarrier('Sistema IoT')
      }
      dashboardStore.addRecentActivity({
        title: isOpen ? 'Cierre automatico' : 'Apertura automatica',
        detail: `${barrierStore.barrier.accessPoint} operada por sistema`,
        level: 'normal',
      })
      return
    }

    const plate = generatePlate()
    alertsStore.createAlert({
      type: 'vehiculo_no_autorizado',
      description: `Patente ${plate} no registrada en flota autorizada.`,
      severity: 'info',
      relatedPlate: plate,
      source: 'Filtro OCR',
    })
    dashboardStore.addRecentActivity({
      title: 'Patente no autorizada',
      detail: `Intento de acceso detectado: ${plate}`,
      level: 'info',
      timestamp: nowIso,
    })
  }

  function start(customIntervalMs?: number) {
    if (timer) return
    intervalMs.value = customIntervalMs ?? intervalMs.value
    isRunning.value = true
    timer = setInterval(() => {
      runCycle()
    }, intervalMs.value)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isRunning.value = false
  }

  function toggle() {
    if (isRunning.value) {
      stop()
    } else {
      start()
    }
  }

  function runOnce() {
    runCycle()
  }

  return {
    isRunning,
    intervalMs,
    lastScenario,
    lastRunAt,
    lastScenarioLabel,
    start,
    stop,
    toggle,
    runOnce,
  }
})
