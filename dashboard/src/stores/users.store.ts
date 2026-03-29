import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockAuditRows, mockUserAdminRows, type UserAdminRow } from '@/data/mock/users'

export const useUsersStore = defineStore('users', () => {
  const users = ref<UserAdminRow[]>([...mockUserAdminRows])
  const auditLog = ref([...mockAuditRows])
  const search = ref('')

  const filteredUsers = computed(() => {
    if (!search.value.trim()) return users.value
    const keyword = search.value.trim().toLowerCase()
    return users.value.filter(
      (user) => user.name.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword),
    )
  })

  function setRole(id: string, role: UserAdminRow['role']) {
    const user = users.value.find((item) => item.id === id)
    if (!user) return
    user.role = role
  }

  function toggleStatus(id: string) {
    const user = users.value.find((item) => item.id === id)
    if (!user) return
    user.status = user.status === 'activo' ? 'suspendido' : 'activo'
  }

  return {
    users,
    auditLog,
    search,
    filteredUsers,
    setRole,
    toggleStatus,
  }
})
