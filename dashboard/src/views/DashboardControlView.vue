<script setup lang="ts">
import { computed } from 'vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import DevicesStatusPanel from '@/components/dashboard/DevicesStatusPanel.vue'
import BarrierControlCard from '@/components/dashboard/BarrierControlCard.vue'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed.vue'
import { useDashboardPage } from '@/composables/useDashboardPage'
import { formatDateTime } from '@/composables/useKpi'

const {
  devices,
  barrier,
  commandLog,
  canControlBarrier,
  recentActivity,
  lastUpdated,
  error,
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
} = useDashboardPage()

const controlFeed = computed(() => recentActivity.value.slice(0, 10))
</script>

<template>
  <DashboardShell
    title="Control y estado IoT"
    :subtitle="`Ultima actualizacion: ${formatDateTime(lastUpdated)}`"
    :is-running="isRunning"
    :last-scenario-label="lastScenarioLabel"
    :last-run-label="lastRunAt ? formatDateTime(lastRunAt) : ''"
    :is-loading="isLoading"
    :error="error"
    @retry="retryRefresh"
    @toggle-demo="toggleIotSimulation"
    @trigger-event="triggerIotEvent"
  >
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
  </DashboardShell>
</template>