<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AlertsFilters from '@/components/alerts/AlertsFilters.vue'
import AlertsTable from '@/components/alerts/AlertsTable.vue'
import { useAlertsStore } from '@/stores/alerts.store'
import type { AlertSeverity, AlertStatus, AlertType } from '@/types/domain'

const alertsStore = useAlertsStore()
const { filters, filteredAlerts } = storeToRefs(alertsStore)

const typeModel = computed({
  get: () => filters.value.type,
  set: (value: string) => alertsStore.updateFilters({ type: value as AlertType | '' }),
})

const severityModel = computed({
  get: () => filters.value.severity,
  set: (value: string) => alertsStore.updateFilters({ severity: value as AlertSeverity | '' }),
})

const statusModel = computed({
  get: () => filters.value.status,
  set: (value: string) => alertsStore.updateFilters({ status: value as AlertStatus | '' }),
})

function clearFilters() {
  alertsStore.updateFilters({ type: '', severity: '', status: '' })
}
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Alertas y notificaciones"
      subtitle="Gestiona eventos de severidad y su resolucion operativa."
    >
      <template #actions>
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
          @click="clearFilters"
        >
          Limpiar filtros
        </button>
      </template>
    </AppSectionHeader>

    <AlertsFilters
      v-model:type="typeModel"
      v-model:severity="severityModel"
      v-model:status="statusModel"
    />

    <EmptyState
      v-if="!filteredAlerts.length"
      title="No hay alertas para mostrar"
      message="Ajusta los filtros o espera nuevos eventos del sistema."
    />

    <AlertsTable
      v-else
      :alerts="filteredAlerts"
      @resolve="alertsStore.resolveAlert"
      @ignore="alertsStore.ignoreAlert"
    />
  </div>
</template>
