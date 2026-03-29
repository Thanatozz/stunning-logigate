<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import type { TruckInside } from '@/types/domain'
import { formatDateTime, formatMinutes } from '@/composables/useKpi'

defineProps<{
  trucks: TruckInside[]
}>()

function toTruck(row: object) {
  return row as TruckInside
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 class="mb-3 text-sm font-semibold">Camiones actualmente en planta</h3>
    <DataTable
      :columns="[
        { key: 'plate', label: 'Patente' },
        { key: 'company', label: 'Empresa' },
        { key: 'enteredAt', label: 'Hora ingreso' },
        { key: 'accumulatedMinutes', label: 'Tiempo acumulado' },
        { key: 'accessPoint', label: 'Punto acceso' },
      ]"
      :rows="trucks"
      row-key="plate"
    >
      <template #cell-enteredAt="{ row }">
        {{ formatDateTime(toTruck(row).enteredAt) }}
      </template>
      <template #cell-accumulatedMinutes="{ row }">
        {{ formatMinutes(toTruck(row).accumulatedMinutes) }}
      </template>
    </DataTable>
  </section>
</template>
