<script setup lang="ts">
import { computed } from 'vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import TrafficLightWidget from '@/components/dashboard/TrafficLightWidget.vue'
import FreeSlotsCard from '@/components/dashboard/FreeSlotsCard.vue'
import ActivityChart from '@/components/dashboard/ActivityChart.vue'
import AlertsPanel from '@/components/dashboard/AlertsPanel.vue'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed.vue'
import { useDashboardPage } from '@/composables/useDashboardPage'
import { formatDateTime, formatMinutes } from '@/composables/useKpi'

const {
  dashboardStore,
  kpi,
  plantState,
  chartSeries,
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

const summaryFeed = computed(() => recentActivity.value.slice(0, 8))
</script>

<template>
  <DashboardShell
    title="Dashboard operativo"
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
    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Camiones en planta" :value="kpi.trucksInPlant" detail="Ocupacion en tiempo real" />
      <KpiCard title="Ingresos de hoy" :value="kpi.todayEntries" detail="Eventos confirmados" />
      <KpiCard title="Salidas de hoy" :value="kpi.todayExits" detail="Eventos confirmados" />
      <KpiCard title="Tiempo promedio" :value="formatMinutes(kpi.avgStayMinutes)" detail="Permanencia actual" />
    </section>

    <section class="grid gap-4 xl:grid-cols-12">
      <div class="xl:col-span-3 self-start flex flex-col gap-4">
        <TrafficLightWidget :level="plantState.occupancyLevel" :percent="dashboardStore.occupancyPercent" />
        <FreeSlotsCard
          :current-count="plantState.currentCount"
          :max-capacity="plantState.maxCapacity"
        />
      </div>
      <div class="xl:col-span-3">
        <AlertsPanel :alerts="latestAlerts" />
      </div>
      <div class="xl:col-span-6">
        <ActivityChart class="h-full" :data="chartSeries.activityByHour" />
      </div>
    </section>

    <section>
      <RecentActivityFeed :items="summaryFeed" />
    </section>
  </DashboardShell>
</template>
