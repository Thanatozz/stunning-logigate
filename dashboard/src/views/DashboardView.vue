<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import TrafficLightWidget from '@/components/dashboard/TrafficLightWidget.vue'
import ActivityChart from '@/components/dashboard/ActivityChart.vue'
import TrucksInsideTable from '@/components/dashboard/TrucksInsideTable.vue'
import AlertsPanel from '@/components/dashboard/AlertsPanel.vue'
import DevicesStatusPanel from '@/components/dashboard/DevicesStatusPanel.vue'
import BarrierControlCard from '@/components/dashboard/BarrierControlCard.vue'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed.vue'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useAlertsStore } from '@/stores/alerts.store'
import { useDevicesStore } from '@/stores/devices.store'
import { useBarrierStore } from '@/stores/barrier.store'
import { useAuthStore } from '@/stores/auth.store'
import { useIotSimulatorStore } from '@/stores/iot-simulator.store'
import { formatDateTime, formatMinutes } from '@/composables/useKpi'
import type { BarrierMode } from '@/types/domain'

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
  setTimeout(() => {
    isLoading.value = false
  }, 450)

  refreshTimer = setInterval(() => {
    dashboardStore.refreshSnapshot()
  }, 12000)

  iotSimulatorStore.start(9000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  iotSimulatorStore.stop()
})
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Dashboard operativo"
      :subtitle="`Ultima actualizacion: ${formatDateTime(lastUpdated)}`"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full px-2 py-1 text-xs font-medium" :class="isRunning ? 'badge-success' : 'badge-neutral'">
            {{ isRunning ? 'Modo demo IoT activo' : 'Modo demo IoT detenido' }}
          </span>
          <button
            type="button"
            class="btn-secondary px-2.5 py-1.5 text-xs font-medium"
            @click="toggleIotSimulation"
          >
            {{ isRunning ? 'Pausar demo' : 'Activar demo' }}
          </button>
          <button
            type="button"
            class="btn-secondary px-2.5 py-1.5 text-xs font-medium"
            @click="triggerIotEvent"
          >
            Simular evento
          </button>
        </div>
      </template>
    </AppSectionHeader>

    <section class="panel-soft px-3 py-2 text-xs text-muted">
      Ultimo evento IoT: {{ lastScenarioLabel }}<span v-if="lastRunAt"> · {{ formatDateTime(lastRunAt) }}</span>
    </section>

    <section v-if="isLoading" class="card-panel p-5">
      <LoadingState />
    </section>

    <template v-else>
      <section v-if="error" class="card-panel p-5">
        <ErrorState
          title="Fallo de actualizacion"
          :message="error"
          action-text="Reintentar sincronizacion"
          @retry="retryRefresh"
        />
      </section>

      <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Camiones en planta" :value="kpi.trucksInPlant" detail="Ocupacion en tiempo real" />
        <KpiCard title="Ingresos de hoy" :value="kpi.todayEntries" detail="Eventos confirmados" />
        <KpiCard title="Salidas de hoy" :value="kpi.todayExits" detail="Eventos confirmados" />
        <KpiCard title="Tiempo promedio" :value="formatMinutes(kpi.avgStayMinutes)" detail="Permanencia actual" />
      </section>

      <section class="grid gap-4 xl:grid-cols-12">
        <div class="xl:col-span-4">
          <TrafficLightWidget :level="plantState.occupancyLevel" :percent="dashboardStore.occupancyPercent" />
        </div>
        <div class="xl:col-span-8">
          <ActivityChart :data="chartSeries.activityByHour" />
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-12">
        <div class="xl:col-span-8">
          <TrucksInsideTable :trucks="plantState.trucksInside" />
        </div>
        <div class="xl:col-span-4">
          <AlertsPanel :alerts="latestAlerts" />
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-12">
        <div class="xl:col-span-4">
          <DevicesStatusPanel :devices="devices" />
        </div>
        <div class="xl:col-span-4">
          <BarrierControlCard
            :barrier="barrier"
            :can-control="canControlBarrier"
            :command-log="commandLog"
            @mode="onModeChange"
            @open="onOpenBarrier"
            @close="onCloseBarrier"
          />
        </div>
        <div class="xl:col-span-4">
          <RecentActivityFeed :items="recentActivity" />
        </div>
      </section>
      </template>
    </template>
  </div>
</template>
