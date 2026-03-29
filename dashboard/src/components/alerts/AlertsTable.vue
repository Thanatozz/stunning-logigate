<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import SeverityBadge from '@/components/common/SeverityBadge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ActionMenu from '@/components/common/ActionMenu.vue'
import type { Alert } from '@/types/domain'
import { formatDateTime } from '@/composables/useKpi'

defineProps<{
  alerts: Alert[]
}>()

const emit = defineEmits<{
  resolve: [id: string]
  ignore: [id: string]
}>()

function toAlert(row: object) {
  return row as Alert
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <DataTable
      :columns="[
        { key: 'timestamp', label: 'Fecha y hora' },
        { key: 'type', label: 'Tipo' },
        { key: 'description', label: 'Descripcion' },
        { key: 'severity', label: 'Severidad' },
        { key: 'status', label: 'Estado' },
        { key: 'actions', label: 'Acciones' },
      ]"
      :rows="alerts"
      row-key="id"
    >
      <template #cell-timestamp="{ row }">
        {{ formatDateTime(toAlert(row).timestamp) }}
      </template>
      <template #cell-severity="{ row }">
        <SeverityBadge :severity="toAlert(row).severity" />
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :value="toAlert(row).status" />
      </template>
      <template #cell-actions="{ row }">
        <ActionMenu
          :actions="[
            { label: 'Marcar resuelta', value: 'resolve' },
            { label: 'Ignorar', value: 'ignore' },
          ]"
          @select="(value) => (value === 'resolve' ? emit('resolve', toAlert(row).id) : emit('ignore', toAlert(row).id))"
        />
      </template>
    </DataTable>
  </section>
</template>
