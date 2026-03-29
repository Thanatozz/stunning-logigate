<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import UsersTable from '@/components/users/UsersTable.vue'
import AuditLogList from '@/components/users/AuditLogList.vue'
import { useUsersStore } from '@/stores/users.store'
import type { UserAdminRow } from '@/data/mock/users'

const usersStore = useUsersStore()
const { filteredUsers, search, auditLog } = storeToRefs(usersStore)

const searchModel = computed({
  get: () => search.value,
  set: (value: string) => {
    search.value = value
  },
})

function onSetRole(id: string, role: UserAdminRow['role']) {
  usersStore.setRole(id, role)
}

function onToggleStatus(id: string) {
  usersStore.toggleStatus(id)
}
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Usuarios y roles"
      subtitle="Gestion de permisos para administradores y supervisores."
    />

    <section class="card-panel p-4">
      <SearchInput v-model="searchModel" placeholder="Buscar usuario por nombre o correo" />
    </section>

    <EmptyState
      v-if="!filteredUsers.length"
      title="Sin usuarios"
      message="No se encontraron usuarios con ese filtro."
    />

    <UsersTable
      v-else
      :users="filteredUsers"
      @set-role="onSetRole"
      @toggle-status="onToggleStatus"
    />

    <AuditLogList :rows="auditLog" />
  </div>
</template>
