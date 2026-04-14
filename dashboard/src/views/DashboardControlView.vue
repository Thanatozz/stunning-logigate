<script setup lang="ts">
import { computed, ref } from 'vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import DevicesStatusPanel from '@/components/dashboard/DevicesStatusPanel.vue'
import BarrierControlCard from '@/components/dashboard/BarrierControlCard.vue'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed.vue'
import DeviceFormModal from '@/components/dashboard/DeviceFormModal.vue'
import { useDashboardPage } from '@/composables/useDashboardPage'
import { formatDateTime } from '@/composables/useKpi'
import { useDevicesStore } from '@/stores/devices.store'
import { useSettingsStore } from '@/stores/settings.store'

const {
  devices,
  barrier,
  commandLog,
  canControlBarrier,
  recentActivity,
  lastUpdated,
  error,
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
} = useDashboardPage()

const controlFeed = computed(() => recentActivity.value.slice(0, 10))
const devicesStore = useDevicesStore()
const settingsStore = useSettingsStore()
const isDeviceModalOpen = ref(false)

const activeAccessPoints = computed(() => {
  const active = settingsStore.settings.accessPoints
    .filter((point) => point.active)
    .map((point) => point.name)
  if (active.length) return active
  return ['Porton Norte', 'Porton Sur']
})

function openAddDeviceModal() {
  isDeviceModalOpen.value = true
}

function closeAddDeviceModal() {
  isDeviceModalOpen.value = false
}

function saveDevice(payload: Parameters<typeof devicesStore.addDevice>[0]) {
  devicesStore.addDevice(payload)
  isDeviceModalOpen.value = false
}
</script>

<template>
  <DashboardShell
    title="Control y estado IoT"
    :subtitle="`Ultima actualizacion: ${formatDateTime(lastUpdated)}`"
    :show-iot-demo-controls="showIotDemoControls"
    :is-running="isRunning"
    :last-scenario-label="lastScenarioLabel"
    :last-run-label="lastRunAt ? formatDateTime(lastRunAt) : ''"
    :is-loading="isLoading"
    :error="error"
    @retry="retryRefresh"
    @toggle-demo="toggleIotSimulation"
    @trigger-event="triggerIotEvent"
  >
    <section class="flex justify-end">
      <button
        type="button"
        class="btn-secondary px-3 py-2 text-sm font-medium"
        @click="openAddDeviceModal"
      >
        Agregar dispositivo IoT
      </button>
    </section>

    <section class="grid gap-4 xl:grid-cols-12">
      <div class="xl:col-span-6">
        <DevicesStatusPanel :devices="devices" />
      </div>
      <div class="xl:col-span-6">
        <BarrierControlCard
          :barrier="barrier"
          :can-control="canControlBarrier"
          :command-log="commandLog"
          @mode="onModeChange"
          @open="onOpenBarrier"
          @close="onCloseBarrier"
        />
      </div>
    </section>

    <section>
      <RecentActivityFeed :items="controlFeed" />
    </section>

    <DeviceFormModal
      :open="isDeviceModalOpen"
      :access-points="activeAccessPoints"
      @close="closeAddDeviceModal"
      @save="saveDevice"
    />
  </DashboardShell>
</template>
