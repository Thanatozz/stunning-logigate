import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getIdTokenResult, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { get, onValue, ref as dbRef, type Unsubscribe } from 'firebase/database'
import { mockUsers } from '@/data/mock/session'
import { firebaseAuth, firebaseDb, getFirebaseDebugInfo, isFirebaseConfigured } from '@/lib/firebase'
import type { Role, UserSession } from '@/types/domain'

const SESSION_KEY = 'logigate_session'
let listenerInitialized = false
let stopSelfUserListener: Unsubscribe | null = null

function normalizeRole(value: unknown): Role | null {
  if (value === 'admin' || value === 'supervisor') return value
  return null
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function findUserRecordFromUsersRoot(
  usersRoot: unknown,
  authUid: string,
  authEmail: string | null,
): Record<string, unknown> | null {
  if (!usersRoot || typeof usersRoot !== 'object' || Array.isArray(usersRoot)) return null
  const usersMap = usersRoot as Record<string, unknown>

  const byUid = usersMap[authUid]
  if (byUid && typeof byUid === 'object' && !Array.isArray(byUid)) {
    return byUid as Record<string, unknown>
  }

  const normalizedEmail = normalizeString(authEmail)?.toLowerCase()
  if (!normalizedEmail) return null

  for (const rawUser of Object.values(usersMap)) {
    if (!rawUser || typeof rawUser !== 'object' || Array.isArray(rawUser)) continue
    const record = rawUser as Record<string, unknown>
    const email = normalizeString(record.email)?.toLowerCase()
    if (email === normalizedEmail) return record
  }

  return null
}

async function resolveProfileFromDatabase(user: User): Promise<{
  role: Role | null
  name: string | null
  lastLoginAt: string | null
}> {
  if (!firebaseDb) {
    return { role: null, name: null, lastLoginAt: null }
  }
  const db = firebaseDb

  const byUid = async () => {
    const snapshot = await get(dbRef(db, `users/${user.uid}`))
    const value = snapshot.val()
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    return {
      role: normalizeRole(record.role),
      name: normalizeString(record.name),
      lastLoginAt: normalizeString(record.lastLoginAt),
    }
  }

  const byEmail = async () => {
    if (!user.email) return null
    const normalizedEmail = user.email.toLowerCase()
    const usersSnapshot = await get(dbRef(db, 'users'))
    const usersValue = usersSnapshot.val()
    if (!usersValue || typeof usersValue !== 'object' || Array.isArray(usersValue)) return null

    for (const rawUser of Object.values(usersValue as Record<string, unknown>)) {
      if (!rawUser || typeof rawUser !== 'object' || Array.isArray(rawUser)) continue
      const userRecord = rawUser as Record<string, unknown>
      const email = normalizeString(userRecord.email)?.toLowerCase()
      if (email !== normalizedEmail) continue
      return {
        role: normalizeRole(userRecord.role),
        name: normalizeString(userRecord.name),
        lastLoginAt: normalizeString(userRecord.lastLoginAt),
      }
    }

    return null
  }

  try {
    const fromUid = await byUid()
    if (fromUid?.role || fromUid?.name || fromUid?.lastLoginAt) {
      return {
        role: fromUid.role ?? null,
        name: fromUid.name ?? null,
        lastLoginAt: fromUid.lastLoginAt ?? null,
      }
    }
  } catch {
    // Continue with email fallback.
  }

  try {
    const fromEmail = await byEmail()
    if (fromEmail) {
      return {
        role: fromEmail.role ?? null,
        name: fromEmail.name ?? null,
        lastLoginAt: fromEmail.lastLoginAt ?? null,
      }
    }
  } catch {
    // Ignore DB lookup failures and fall back to token/email-derived values.
  }

  return { role: null, name: null, lastLoginAt: null }
}

function restoreSession(): UserSession | null {
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as UserSession
  } catch {
    return null
  }
}

function persistSession(session: UserSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function extractErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown'
  const raw = (error as { code?: unknown }).code
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : 'unknown'
}

function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Sin detalle'
  const raw = (error as { message?: unknown }).message
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : 'Sin detalle'
}

function mapFirebaseLoginError(error: unknown): string {
  const code = extractErrorCode(error)

  if (code === 'auth/unauthorized-domain') {
    return 'Dominio no autorizado en Firebase Auth. Agrega este host en Authentication > Settings > Authorized domains.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password no esta habilitado en Firebase Authentication.'
  }
  if (code === 'auth/invalid-api-key') {
    return 'API key invalida. Revisa VITE_FIREBASE_API_KEY.'
  }
  if (code === 'auth/app-not-authorized') {
    return 'App no autorizada para Firebase Auth. Revisa API key, authDomain y dominio autorizado.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Fallo de red al contactar Firebase.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos. Espera un momento e intenta nuevamente.'
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/invalid-login-credentials' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password'
  ) {
    return 'Credenciales invalidas.'
  }

  return `Error de autenticacion (${code}).`
}

function stopSelfUserSync() {
  if (!stopSelfUserListener) return
  stopSelfUserListener()
  stopSelfUserListener = null
}

async function resolveRoleFromUser(user: User): Promise<Role | null> {
  const tokenResult = await getIdTokenResult(user, true)
  const claims = tokenResult.claims
  if (claims.admin === true || claims.role === 'admin') return 'admin'
  if (claims.supervisor === true || claims.role === 'supervisor') return 'supervisor'

  const profile = await resolveProfileFromDatabase(user)
  if (profile.role) return profile.role

  return null
}

async function buildSessionFromFirebaseUser(user: User): Promise<UserSession | null> {
  const role = await resolveRoleFromUser(user)
  if (!role) return null

  const profile = await resolveProfileFromDatabase(user)
  const resolvedName = profile.name || user.displayName || user.email?.split('@')[0] || 'Usuario'
  const resolvedLastLoginAt = profile.lastLoginAt || new Date().toISOString()

  return {
    id: user.uid,
    name: resolvedName,
    email: user.email || '',
    role,
    lastLoginAt: resolvedLastLoginAt,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<UserSession | null>(restoreSession())
  const lastLoginError = ref('')

  async function forceFirebaseLogout() {
    session.value = null
    lastLoginError.value = ''
    persistSession(null)
    stopSelfUserSync()
    if (firebaseAuth) {
      try {
        await signOut(firebaseAuth)
      } catch {
        // Ignore sign-out cleanup failures.
      }
    }
  }

  function startSelfUserSync(user: User) {
    if (!firebaseDb) return
    stopSelfUserSync()

    stopSelfUserListener = onValue(
      dbRef(firebaseDb, 'users'),
      (snapshot) => {
        const record = findUserRecordFromUsersRoot(snapshot.val(), user.uid, user.email)
        if (!record) return
        const status = normalizeString(record.status) ?? 'activo'
        if (status === 'suspendido') {
          void forceFirebaseLogout()
          return
        }

        if (!session.value) return

        const nextName = normalizeString(record.name) ?? session.value.name
        const nextRole = normalizeRole(record.role) ?? session.value.role
        const nextLastLoginAt = normalizeString(record.lastLoginAt) ?? session.value.lastLoginAt

        if (
          nextName !== session.value.name ||
          nextRole !== session.value.role ||
          nextLastLoginAt !== session.value.lastLoginAt
        ) {
          session.value = {
            ...session.value,
            name: nextName,
            role: nextRole,
            lastLoginAt: nextLastLoginAt,
          }
          persistSession(session.value)
        }
      },
      () => {
        // Keep current session and let existing auth guards handle API failures.
      },
    )
  }

  const isAuthenticated = computed(() => Boolean(session.value))
  const currentRole = computed<Role | null>(() => session.value?.role ?? null)
  const currentUserName = computed(() => session.value?.name ?? 'Sin sesion')
  const usingFirebaseAuth = computed(() => isFirebaseConfigured && Boolean(firebaseAuth))

  if (usingFirebaseAuth.value && firebaseAuth && !listenerInitialized) {
    listenerInitialized = true
    onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        stopSelfUserSync()
        session.value = null
        persistSession(null)
        return
      }
      try {
        const nextSession = await buildSessionFromFirebaseUser(user)
        session.value = nextSession
        persistSession(nextSession)
        if (nextSession) {
          startSelfUserSync(user)
        } else {
          stopSelfUserSync()
        }
      } catch {
        stopSelfUserSync()
        session.value = null
        persistSession(null)
      }
    })
  }

  async function login(email: string, password: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase()
    lastLoginError.value = ''

    if (usingFirebaseAuth.value && firebaseAuth) {
      try {
        const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password)
        const nextSession = await buildSessionFromFirebaseUser(credential.user)
        if (!nextSession) {
          await signOut(firebaseAuth)
          session.value = null
          lastLoginError.value = 'Usuario autenticado sin rol autorizado (admin/supervisor).'
          persistSession(null)
          return false
        }

        session.value = nextSession
        lastLoginError.value = ''
        persistSession(nextSession)
        startSelfUserSync(credential.user)
        return true
      } catch (error) {
        lastLoginError.value = mapFirebaseLoginError(error)
        console.error('[LogiGate][auth] Firebase login failed', {
          email: normalizedEmail,
          errorCode: extractErrorCode(error),
          errorMessage: extractErrorMessage(error),
          debug: getFirebaseDebugInfo(),
        })
        return false
      }
    }

    const user = mockUsers.find((item) => item.email.toLowerCase() === normalizedEmail)
    if (!user) {
      lastLoginError.value = 'Usuario demo no encontrado. Prueba con admin@logigate.cl o supervisor@logigate.cl.'
      console.warn('[LogiGate][auth] Demo login failed', {
        email: normalizedEmail,
        debug: getFirebaseDebugInfo(),
      })
      return false
    }

    session.value = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    }
    lastLoginError.value = ''
    persistSession(session.value)
    return true
  }

  function logout() {
    session.value = null
    lastLoginError.value = ''
    persistSession(null)
    stopSelfUserSync()
    if (usingFirebaseAuth.value && firebaseAuth) {
      void signOut(firebaseAuth)
    }
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
    usingFirebaseAuth,
    lastLoginError,
    login,
    logout,
    hasRole,
  }
})
