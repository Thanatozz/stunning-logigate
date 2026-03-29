<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { AccessRecord } from '@/types/domain'
import { formatDateTime, formatMinutes } from '@/composables/useKpi'

defineProps<{
  records: AccessRecord[]
}>()

function toRecord(row: object) {
  return row as AccessRecord
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <DataTable
      :columns="[
        { key: 'timestamp', label: 'Fecha y hora' },
        { key: 'plate', label: 'Patente' },
        { key: 'company', label: 'Empresa' },
        { key: 'eventType', label: 'Evento' },
        { key: 'accessPoint', label: 'Punto de acceso' },
        { key: 'stayMinutes', label: 'Permanencia' },
      ]"
      :rows="records"
      row-key="id"
    >
      <template #cell-timestamp="{ row }">
        {{ formatDateTime(toRecord(row).timestamp) }}
      </template>
      <template #cell-eventType="{ row }">
        <StatusBadge :value="toRecord(row).eventType" />
      </template>
      <template #cell-stayMinutes="{ row }">
        {{ toRecord(row).stayMinutes ? formatMinutes(toRecord(row).stayMinutes as number) : 'En planta' }}
      </template>
    </DataTable>
  </section>
</template>
