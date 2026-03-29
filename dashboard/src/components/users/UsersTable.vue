<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { UserAdminRow } from '@/data/mock/users'
import { formatDateTime } from '@/composables/useKpi'

defineProps<{
  users: UserAdminRow[]
}>()

const emit = defineEmits<{
  setRole: [id: string, role: UserAdminRow['role']]
  toggleStatus: [id: string]
  remove: [id: string]
}>()

function toUser(row: object) {
  return row as UserAdminRow
}

function onRoleChange(id: string, event: Event) {
  const role = (event.target as HTMLSelectElement).value as UserAdminRow['role']
  emit('setRole', id, role)
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <DataTable
      :columns="[
        { key: 'name', label: 'Nombre' },
        { key: 'email', label: 'Correo' },
        { key: 'role', label: 'Rol' },
        { key: 'status', label: 'Estado' },
        { key: 'lastAccess', label: 'Ultimo acceso' },
        { key: 'actions', label: 'Acciones' },
      ]"
      :rows="users"
      row-key="id"
    >
      <template #cell-role="{ row }">
        <select
          :value="toUser(row).role"
          class="rounded-lg border border-line bg-white px-2 py-1 text-xs"
          @change="onRoleChange(toUser(row).id, $event)"
        >
          <option value="admin">Administrador</option>
          <option value="supervisor">Supervisor</option>
        </select>
      </template>

      <template #cell-status="{ row }">
        <StatusBadge :value="toUser(row).status" />
      </template>

      <template #cell-lastAccess="{ row }">
        {{ formatDateTime(toUser(row).lastAccess) }}
      </template>

      <template #cell-actions="{ row }">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium transition hover:bg-slate-50"
            @click="emit('toggleStatus', toUser(row).id)"
          >
            {{ toUser(row).status === 'activo' ? 'Suspender' : 'Reactivar' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
            @click="emit('remove', toUser(row).id)"
          >
            Eliminar
          </button>
        </div>
      </template>
    </DataTable>
  </section>
</template>
