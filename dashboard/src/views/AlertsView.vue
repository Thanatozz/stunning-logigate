<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import NoResultsState from '@/components/common/NoResultsState.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import AlertsFilters from '@/components/alerts/AlertsFilters.vue'
import AlertsTable from '@/components/alerts/AlertsTable.vue'
import { useAlertsStore } from '@/stores/alerts.store'
import type { AlertSeverity, AlertStatus, AlertType } from '@/types/domain'

const alertsStore = useAlertsStore()
const { filters, filteredAlerts, isLoading } = storeToRefs(alertsStore)

const pageSize = 10
const currentPage = ref(1)

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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAlerts.value.length / pageSize)))

const paginatedAlerts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredAlerts.value.slice(start, start + pageSize)
})

const rangeStart = computed(() => {
  if (!filteredAlerts.value.length) return 0
  return (currentPage.value - 1) * pageSize + 1
})

const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, filteredAlerts.value.length))

function clearFilters() {
  alertsStore.updateFilters({ type: '', severity: '', status: '' })
}

function previousPage() {
  if (currentPage.value <= 1) return
  currentPage.value -= 1
}

function nextPage() {
  if (currentPage.value >= totalPages.value) return
  currentPage.value += 1
}

watch([typeModel, severityModel, statusModel], () => {
  currentPage.value = 1
})

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value
  }
})
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

    <TableSkeleton v-if="isLoading" :columns="6" :rows="8" />

    <NoResultsState
      v-else-if="!filteredAlerts.length"
      title="No hay alertas para mostrar"
      message="Ajusta los filtros o espera nuevos eventos del sistema."
    />

    <template v-else>
      <AlertsTable
        :alerts="paginatedAlerts"
        @resolve="alertsStore.resolveAlert"
        @ignore="alertsStore.ignoreAlert"
      />

      <section class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-xs text-muted">
        <p>Mostrando {{ rangeStart }}-{{ rangeEnd }} de {{ filteredAlerts.length }} alertas</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-line px-2 py-1 text-xs transition hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage <= 1"
            @click="previousPage"
          >
            Anterior
          </button>
          <span>Pagina {{ currentPage }} de {{ totalPages }}</span>
          <button
            type="button"
            class="rounded-lg border border-line px-2 py-1 text-xs transition hover:bg-line/30 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage >= totalPages"
            @click="nextPage"
          >
            Siguiente
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
