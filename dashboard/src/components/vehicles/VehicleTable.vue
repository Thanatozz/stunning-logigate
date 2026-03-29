<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ActionMenu from '@/components/common/ActionMenu.vue'
import type { Vehicle } from '@/types/domain'

defineProps<{
  vehicles: Vehicle[]
}>()

const emit = defineEmits<{
  edit: [vehicle: Vehicle]
  remove: [plate: string]
}>()

function toVehicle(row: object) {
  return row as Vehicle
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <DataTable
      :columns="[
        { key: 'plate', label: 'Patente' },
        { key: 'company', label: 'Empresa' },
        { key: 'cargoType', label: 'Tipo de carga' },
        { key: 'category', label: 'Categoria' },
        { key: 'status', label: 'Estado' },
        { key: 'actions', label: 'Acciones' },
      ]"
      :rows="vehicles"
      row-key="plate"
    >
      <template #cell-status="{ row }">
        <StatusBadge :value="toVehicle(row).status" />
      </template>
      <template #cell-actions="{ row }">
        <ActionMenu
          :actions="[
            { label: 'Editar', value: 'edit' },
            { label: 'Eliminar', value: 'delete' },
          ]"
          @select="(value) => (value === 'edit' ? emit('edit', toVehicle(row)) : emit('remove', toVehicle(row).plate))"
        />
      </template>
    </DataTable>
  </section>
</template>
