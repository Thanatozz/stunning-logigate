<script setup lang="ts">
import { computed } from 'vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import TrucksInsideTable from '@/components/dashboard/TrucksInsideTable.vue'
import AlertsPanel from '@/components/dashboard/AlertsPanel.vue'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed.vue'
import { useDashboardPage } from '@/composables/useDashboardPage'
import { formatDateTime } from '@/composables/useKpi'

const {
  plantState,
  recentActivity,
  lastUpdated,
  error,
  isRunning,
  showIotDemoControls,
  lastScenarioLabel,
  lastRunAt,
  isLoading,
  latestAlerts,
  retryRefresh,
  toggleIotSimulation,
  triggerIotEvent,
} = useDashboardPage()

const accessFeed = computed(() => recentActivity.value.slice(0, 10))
</script>

<template>
  <DashboardShell
    title="Dashboard de accesos"
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
    <section class="grid gap-4 xl:grid-cols-12">
      <div class="xl:col-span-8">
        <TrucksInsideTable :trucks="plantState.trucksInside" />
      </div>
      <div class="xl:col-span-4">
        <AlertsPanel :alerts="latestAlerts" />
      </div>
    </section>

    <section>
      <RecentActivityFeed :items="accessFeed" />
    </section>
  </DashboardShell>
</template>
