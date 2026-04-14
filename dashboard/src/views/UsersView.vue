<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import NoResultsState from '@/components/common/NoResultsState.vue'
import TableSkeleton from '@/components/common/TableSkeleton.vue'
import ListSkeleton from '@/components/common/ListSkeleton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import UsersTable from '@/components/users/UsersTable.vue'
import AuditLogList from '@/components/users/AuditLogList.vue'
import UserFormModal from '@/components/users/UserFormModal.vue'
import { useUsersStore, type CreateUserPayload } from '@/stores/users.store'
import type { UserAdminRow } from '@/data/mock/users'

const usersStore = useUsersStore()
const { filteredUsers, search, auditLog, isLoading, error } = storeToRefs(usersStore)

const openCreateModal = ref(false)
const confirmDeleteOpen = ref(false)
const targetDeleteId = ref('')
const formError = ref('')
const formNotice = ref('')

const searchModel = computed({
  get: () => search.value,
  set: (value: string) => {
    search.value = value
  },
})

async function onSetRole(id: string, role: UserAdminRow['role']) {
  const result = await usersStore.setRole(id, role)
  if (!result.ok) {
    formError.value = result.reason
    return
  }
  formError.value = ''
}

async function onToggleStatus(id: string) {
  const result = await usersStore.toggleStatus(id)
  if (!result.ok) {
    formError.value = result.reason
    return
  }
  formError.value = ''
}

async function onCreateUser(payload: CreateUserPayload) {
  const result = await usersStore.addUser(payload)
  if (!result.ok) {
    formError.value = result.reason
    return
  }
  formError.value = ''
  formNotice.value = result.notice ?? 'Usuario creado correctamente.'
  openCreateModal.value = false
}

function askDeleteUser(id: string) {
  targetDeleteId.value = id
  confirmDeleteOpen.value = true
}

async function confirmDeleteUser() {
  if (!targetDeleteId.value) return
  const result = await usersStore.removeUser(targetDeleteId.value)
  if (!result.ok) {
    formError.value = result.reason
    confirmDeleteOpen.value = false
    targetDeleteId.value = ''
    return
  }
  formError.value = ''
  formNotice.value = result.notice ?? 'Usuario eliminado.'
  targetDeleteId.value = ''
  confirmDeleteOpen.value = false
}

function cancelDeleteUser() {
  targetDeleteId.value = ''
  confirmDeleteOpen.value = false
}
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Usuarios y roles"
      subtitle="Gestion de permisos para administradores y supervisores."
    >
      <template #actions>
        <button
          type="button"
          class="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0849d6]"
          @click="openCreateModal = true"
        >
          Agregar usuario
        </button>
      </template>
    </AppSectionHeader>

    <section class="card-panel p-4">
      <SearchInput v-model="searchModel" placeholder="Buscar usuario por nombre o correo" />
      <p v-if="!isLoading && error" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {{ error }}
      </p>
      <p v-if="formError" class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ formError }}
      </p>
      <p v-if="formNotice" class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {{ formNotice }}
      </p>
    </section>

    <TableSkeleton v-if="isLoading" :columns="6" :rows="7" />

    <NoResultsState
      v-else-if="!filteredUsers.length"
      title="Sin usuarios"
      message="No se encontraron usuarios con ese filtro."
    />

    <UsersTable
      v-else
      :users="filteredUsers"
      @set-role="onSetRole"
      @toggle-status="onToggleStatus"
      @remove="askDeleteUser"
    />

    <ListSkeleton v-if="isLoading" title="Auditoria reciente" :items="5" />
    <AuditLogList v-else :rows="auditLog" />

    <UserFormModal
      :open="openCreateModal"
      @close="openCreateModal = false"
      @save="onCreateUser"
    />

    <ConfirmDialog
      :open="confirmDeleteOpen"
      title="Eliminar usuario"
      message="Esta accion eliminara el usuario de la base de datos e intentara eliminarlo tambien de Firebase Auth. No se permite borrar al ultimo administrador activo."
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      @confirm="confirmDeleteUser"
      @cancel="cancelDeleteUser"
    />
  </div>
</template>
