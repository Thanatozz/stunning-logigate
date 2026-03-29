import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockAuditRows, mockUserAdminRows, type UserAdminRow } from '@/data/mock/users'

export interface CreateUserPayload {
  name: string
  email: string
  role: UserAdminRow['role']
}

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

  function appendAudit(action: string, target: string, actor = 'Administrador local') {
    auditLog.value.unshift({
      id: `aud-${Math.random().toString(36).slice(2, 10)}`,
      action,
      actor,
      target,
      timestamp: new Date().toISOString(),
    })
    if (auditLog.value.length > 25) {
      auditLog.value = auditLog.value.slice(0, 25)
    }
  }

  function setRole(id: string, role: UserAdminRow['role']) {
    const user = users.value.find((item) => item.id === id)
    if (!user) return
    const previousRole = user.role
    user.role = role
    if (previousRole !== role) {
      appendAudit('Cambio de rol', `${user.email}: ${previousRole} -> ${role}`)
    }
  }

  function toggleStatus(id: string) {
    const user = users.value.find((item) => item.id === id)
    if (!user) return
    user.status = user.status === 'activo' ? 'suspendido' : 'activo'
    appendAudit(user.status === 'activo' ? 'Reactivacion de usuario' : 'Suspension de usuario', user.email)
  }

  function addUser(payload: CreateUserPayload) {
    const cleanName = payload.name.trim()
    const cleanEmail = payload.email.trim().toLowerCase()
    if (!cleanName || !cleanEmail) {
      return { ok: false as const, reason: 'Datos incompletos' }
    }

    const exists = users.value.some((user) => user.email.toLowerCase() === cleanEmail)
    if (exists) {
      return { ok: false as const, reason: 'El correo ya existe' }
    }

    const newUser: UserAdminRow = {
      id: `usr-${Math.random().toString(36).slice(2, 8)}`,
      name: cleanName,
      email: cleanEmail,
      role: payload.role,
      status: 'activo',
      lastAccess: new Date().toISOString(),
    }

    users.value.unshift(newUser)
    appendAudit('Alta de usuario', cleanEmail)
    return { ok: true as const }
  }

  function removeUser(id: string) {
    const index = users.value.findIndex((item) => item.id === id)
    if (index === -1) return
    const target = users.value[index]
    users.value.splice(index, 1)
    appendAudit('Baja de usuario', target.email)
  }

  return {
    users,
    auditLog,
    search,
    filteredUsers,
    setRole,
    toggleStatus,
    addUser,
    removeUser,
  }
})
