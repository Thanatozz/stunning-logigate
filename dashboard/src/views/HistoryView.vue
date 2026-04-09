<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import NoResultsState from '@/components/common/NoResultsState.vue'
import HistoryFilters from '@/components/history/HistoryFilters.vue'
import RecordsTable from '@/components/history/RecordsTable.vue'
import { useHistoryStore } from '@/stores/history.store'

const historyStore = useHistoryStore()
const { records, filters, filteredRecords } = storeToRefs(historyStore)

const page = ref(1)
const pageSize = 10

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize)))

const pagedRecords = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredRecords.value.slice(start, start + pageSize)
})

const companyOptions = computed(() => {
  return Array.from(new Set(records.value.map((record) => record.company))).map((item) => ({
    label: item,
    value: item,
  }))
})

const pointOptions = computed(() => {
  return Array.from(new Set(records.value.map((record) => record.accessPoint))).map((item) => ({
    label: item,
    value: item,
  }))
})

const plateModel = computed({
  get: () => filters.value.plate,
  set: (value: string) => {
    historyStore.updateFilters({ plate: value })
    page.value = 1
  },
})

const companyModel = computed({
  get: () => filters.value.company,
  set: (value: string) => {
    historyStore.updateFilters({ company: value })
    page.value = 1
  },
})

const accessPointModel = computed({
  get: () => filters.value.accessPoint,
  set: (value: string) => {
    historyStore.updateFilters({ accessPoint: value })
    page.value = 1
  },
})

const dateFromModel = computed({
  get: () => filters.value.dateFrom,
  set: (value: string) => {
    historyStore.updateFilters({ dateFrom: value })
    page.value = 1
  },
})

const dateToModel = computed({
  get: () => filters.value.dateTo,
  set: (value: string) => {
    historyStore.updateFilters({ dateTo: value })
    page.value = 1
  },
})

function resetFilters() {
  historyStore.resetFilters()
  page.value = 1
}

function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1)
}

function prevPage() {
  page.value = Math.max(1, page.value - 1)
}
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Historial de accesos"
      subtitle="Consulta eventos por fecha, patente, empresa o punto de acceso."
    >
      <template #actions>
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
          @click="resetFilters"
        >
          Limpiar filtros
        </button>
      </template>
    </AppSectionHeader>

    <HistoryFilters
      v-model:plate="plateModel"
      v-model:company="companyModel"
      v-model:access-point="accessPointModel"
      v-model:date-from="dateFromModel"
      v-model:date-to="dateToModel"
      :company-options="companyOptions"
      :point-options="pointOptions"
    />

    <NoResultsState
      v-if="!filteredRecords.length"
      title="Sin resultados"
      message="No existen registros para los filtros seleccionados."
    />

    <template v-else>
      <RecordsTable :records="pagedRecords" />

      <section class="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2 text-sm">
        <p class="text-muted">
          Pagina {{ page }} de {{ totalPages }} · {{ filteredRecords.length }} registros
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-1.5 disabled:opacity-50"
            :disabled="page <= 1"
            @click="prevPage"
          >
            Anterior
          </button>
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-1.5 disabled:opacity-50"
            :disabled="page >= totalPages"
            @click="nextPage"
          >
            Siguiente
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
