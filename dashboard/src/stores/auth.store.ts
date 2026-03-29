import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockUsers } from '@/data/mock/session'
import type { Role, UserSession } from '@/types/domain'

const SESSION_KEY = 'logigate_session'

function restoreSession(): UserSession | null {
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as UserSession
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<UserSession | null>(restoreSession())

  const isAuthenticated = computed(() => Boolean(session.value))
  const currentRole = computed<Role | null>(() => session.value?.role ?? null)
  const currentUserName = computed(() => session.value?.name ?? 'Sin sesión')

  function login(email: string, _password: string): boolean {
    const user = mockUsers.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) return false
    session.value = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session.value))
    return true
  }

  function logout() {
    session.value = null
    localStorage.removeItem(SESSION_KEY)
  }

  function hasRole(roles: Role[]) {
    return session.value ? roles.includes(session.value.role) : false
  }

  const canControlBarrier = computed(() => hasRole(['admin', 'supervisor']))

  return {
    session,
    isAuthenticated,
    currentRole,
    currentUserName,
    canControlBarrier,
    login,
    logout,
    hasRole,
  }
})
