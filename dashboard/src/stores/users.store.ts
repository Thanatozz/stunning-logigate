import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { get, onValue, ref as dbRef, remove, set, update, type Unsubscribe } from 'firebase/database'
import { getIdTokenResult } from 'firebase/auth'
import { isValidEmail, isValidPassword, validateRequiredText } from '@/lib/field-validation'
import { mockAuditRows, mockUserAdminRows, type UserAdminRow } from '@/data/mock/users'
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from '@/lib/firebase'

export interface CreateUserPayload {
  name: string
  email: string
  role: UserAdminRow['role']
  password: string
}

interface CreateAuthUserResult {
  localId: string
  idToken: string
}

type ManageUsersPermissionResult =
  | { ok: true }
  | {
      ok: false
      reason: string
    }

type ActionResult =
  | { ok: true; notice?: string }
  | { ok: false; reason: string }

const FIREBASE_API_KEY = String(import.meta.env.VITE_FIREBASE_API_KEY ?? '')
const AUTH_ADMIN_DELETE_URL = String(import.meta.env.VITE_AUTH_ADMIN_DELETE_URL ?? '').trim()

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function normalizeRole(value: unknown): UserAdminRow['role'] | null {
  if (value === 'admin' || value === 'supervisor') return value
  return null
}

function normalizeStatus(value: unknown): UserAdminRow['status'] {
  return value === 'suspendido' ? 'suspendido' : 'activo'
}

function parseUsersMap(value: unknown): UserAdminRow[] {
  const source = toObject(value)
  return Object.entries(source)
    .map(([uid, raw]) => {
      const item = toObject(raw)
      const email = String(item.email ?? '').trim().toLowerCase()
      if (!email) return null
      const role = normalizeRole(item.role)
      if (!role) return null

      return {
        id: uid,
        name: String(item.name ?? email.split('@')[0] ?? 'Usuario'),
        email,
        role,
        status: normalizeStatus(item.status),
        lastAccess: String(item.lastLoginAt ?? item.lastAccess ?? item.createdAt ?? new Date().toISOString()),
      } satisfies UserAdminRow
    })
    .filter((row): row is UserAdminRow => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
}

function mapAuthError(raw: string): string {
  if (raw.includes('EMAIL_EXISTS')) return 'El correo ya existe en Firebase Auth.'
  if (raw.includes('WEAK_PASSWORD')) return 'La contrasena es demasiado debil (usa minimo 8 caracteres).'
  if (raw.includes('INVALID_EMAIL')) return 'Correo invalido.'
  if (raw.includes('OPERATION_NOT_ALLOWED')) return 'Email/Password no esta habilitado en Firebase Auth.'
  return 'No se pudo crear el usuario en Firebase Auth.'
}

function mapAuthDeleteError(raw: string): string {
  if (raw.includes('INVALID_ID_TOKEN')) return 'Token invalido al intentar revertir usuario en Auth.'
  if (raw.includes('USER_NOT_FOUND')) return 'El usuario ya no existe en Auth.'
  return 'No se pudo revertir el usuario en Firebase Auth.'
}

async function createAuthUser(email: string, password: string): Promise<CreateAuthUserResult> {
  if (!FIREBASE_API_KEY) {
    throw new Error('Falta VITE_FIREBASE_API_KEY para crear usuarios en Firebase Auth.')
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  )

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(mapAuthError(raw))
  }

  const body = (await response.json()) as { localId?: string; idToken?: string }
  if (!body.localId || !body.idToken) {
    throw new Error('Firebase Auth no devolvio el UID del usuario.')
  }

  return { localId: body.localId, idToken: body.idToken }
}

async function deleteAuthUserWithIdToken(idToken: string) {
  if (!FIREBASE_API_KEY) {
    throw new Error('Falta VITE_FIREBASE_API_KEY para revertir usuarios en Firebase Auth.')
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(mapAuthDeleteError(raw))
  }
}

async function deleteAuthUserByAdmin(targetUid: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!AUTH_ADMIN_DELETE_URL) {
    return {
      ok: false,
      reason:
        'No se configuro VITE_AUTH_ADMIN_DELETE_URL. Se elimino en RTDB, pero falta backend para borrar en Firebase Auth.',
    }
  }
  if (!firebaseAuth?.currentUser) {
    return { ok: false, reason: 'No hay sesion para autorizar borrado en Firebase Auth.' }
  }

  let idToken = ''
  try {
    idToken = await firebaseAuth.currentUser.getIdToken(true)
  } catch {
    return { ok: false, reason: 'No se pudo obtener token de sesion para borrado en Firebase Auth.' }
  }

  try {
    const response = await fetch(AUTH_ADMIN_DELETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ uid: targetUid }),
    })

    if (!response.ok) {
      let reason = `HTTP ${response.status}`
      try {
        const body = (await response.json()) as { error?: string; reason?: string; message?: string }
        reason = body.reason || body.error || body.message || reason
      } catch {
        // Keep status text fallback.
      }
      return { ok: false, reason }
    }

    return { ok: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Fallo de red al llamar endpoint de borrado en Auth.'
    return { ok: false, reason }
  }
}

async function checkManageUsersPermission(): Promise<ManageUsersPermissionResult> {
  if (!firebaseAuth?.currentUser || !firebaseDb) {
    return { ok: false, reason: 'No hay sesion autenticada o Firebase no esta configurado.' }
  }

  const currentUser = firebaseAuth.currentUser

  try {
    const tokenResult = await getIdTokenResult(currentUser, true)
    if (tokenResult.claims.admin === true || tokenResult.claims.role === 'admin') {
      return { ok: true }
    }
  } catch {
    // Continue with database role checks.
  }

  try {
    const usersSnapshot = await get(dbRef(firebaseDb, 'users'))
    const usersRoot = toObject(usersSnapshot.val())

    const roleByUid = usersRoot[currentUser.uid]
    if (roleByUid && typeof roleByUid === 'object' && !Array.isArray(roleByUid)) {
      const role = String((roleByUid as Record<string, unknown>).role ?? '')
      if (role === 'admin') {
        return { ok: true }
      }
    }

    const normalizedEmail = String(currentUser.email ?? '')
      .trim()
      .toLowerCase()
    if (normalizedEmail) {
      for (const [uid, raw] of Object.entries(usersRoot)) {
        const item = toObject(raw)
        const email = String(item.email ?? '')
          .trim()
          .toLowerCase()
        const role = String(item.role ?? '')
        if (email === normalizedEmail && role === 'admin' && uid !== currentUser.uid) {
          return {
            ok: false,
            reason: `Tu usuario admin existe con otra clave en RTDB. Debe existir en users/${currentUser.uid} (actualmente esta en users/${uid}).`,
          }
        }
      }
    }
  } catch {
    return { ok: false, reason: 'No se pudo validar permisos en RTDB (/users).' }
  }

  return {
    ok: false,
    reason:
      'Tu sesion no tiene permisos de administrador para /users (ni claim admin=true ni rol admin en users/{uid_auth}).',
  }
}

export const useUsersStore = defineStore('users', () => {
  const users = ref<UserAdminRow[]>(isFirebaseConfigured ? [] : [...mockUserAdminRows])
  const auditLog = ref([...mockAuditRows])
  const search = ref('')
  const isLoading = ref(false)
  const error = ref('')
  let stopUsersListener: Unsubscribe | null = null
  let backfillInFlight = false

  const filteredUsers = computed(() => {
    if (!search.value.trim()) return users.value
    const keyword = search.value.trim().toLowerCase()
    return users.value.filter(
      (user) => user.name.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword),
    )
  })

  const activeAdminCount = computed(
    () => users.value.filter((user) => user.role === 'admin' && user.status === 'activo').length,
  )

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

  function canDemoteOrDeleteAdmin(userId: string) {
    const remainingAdmins = users.value.filter(
      (user) => user.role === 'admin' && user.status === 'activo' && user.id !== userId,
    )
    return remainingAdmins.length > 0
  }

  async function backfillMissingUsersFields(rawUsers: Record<string, unknown>) {
    if (!isFirebaseConfigured || !firebaseDb || backfillInFlight) return

    const updatesMap: Record<string, string> = {}

    for (const [uid, raw] of Object.entries(rawUsers)) {
      const item = toObject(raw)
      if (!item.id) {
        updatesMap[`users/${uid}/id`] = uid
      }
      if (item.status !== 'activo' && item.status !== 'suspendido') {
        updatesMap[`users/${uid}/status`] = 'activo'
      }
    }

    if (!Object.keys(updatesMap).length) return

    const permission = await checkManageUsersPermission()
    if (!permission.ok) return

    backfillInFlight = true
    try {
      await update(dbRef(firebaseDb), updatesMap)
    } catch {
      // Ignore backfill failures; UI already defaults missing status to "activo".
    } finally {
      backfillInFlight = false
    }
  }

  function startFirebaseUsersSync() {
    if (!isFirebaseConfigured || !firebaseDb || stopUsersListener) return

    isLoading.value = true
    stopUsersListener = onValue(
      dbRef(firebaseDb, 'users'),
      (snapshot) => {
        const rawUsers = toObject(snapshot.val())
        users.value = parseUsersMap(rawUsers)
        error.value = ''
        isLoading.value = false
        void backfillMissingUsersFields(rawUsers)
      },
      (err) => {
        const rawMessage = String(err?.message ?? '')
        if (rawMessage.toLowerCase().includes('permission_denied')) {
          error.value =
            'Sin permisos para leer /users. Tu sesion no tiene claim admin=true o las reglas de RTDB no permiten listar usuarios por rol en base de datos.'
        } else {
          error.value = `No se pudo leer users desde Firebase: ${rawMessage}`
        }
        isLoading.value = false
      },
    )
  }

  async function setRole(id: string, role: UserAdminRow['role']): Promise<ActionResult> {
    const user = users.value.find((item) => item.id === id)
    if (!user) return { ok: false, reason: 'Usuario no encontrado.' }
    if (user.role === role) return { ok: true }

    if (user.role === 'admin' && user.status === 'activo' && role !== 'admin' && !canDemoteOrDeleteAdmin(user.id)) {
      return { ok: false, reason: 'No puedes quitar el rol al ultimo administrador activo.' }
    }

    const previousRole = user.role

    if (isFirebaseConfigured && firebaseDb) {
      try {
        await update(dbRef(firebaseDb, `users/${user.id}`), { role })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        return { ok: false, reason: `No se pudo actualizar rol en Firebase: ${message}` }
      }
    } else {
      user.role = role
    }

    appendAudit('Cambio de rol', `${user.email}: ${previousRole} -> ${role}`)
    return { ok: true }
  }

  async function toggleStatus(id: string): Promise<ActionResult> {
    const user = users.value.find((item) => item.id === id)
    if (!user) return { ok: false, reason: 'Usuario no encontrado.' }

    const nextStatus: UserAdminRow['status'] = user.status === 'activo' ? 'suspendido' : 'activo'
    if (
      user.role === 'admin' &&
      user.status === 'activo' &&
      nextStatus === 'suspendido' &&
      !canDemoteOrDeleteAdmin(user.id)
    ) {
      return { ok: false, reason: 'No puedes suspender al ultimo administrador activo.' }
    }

    if (isFirebaseConfigured && firebaseDb) {
      try {
        await update(dbRef(firebaseDb, `users/${user.id}`), { status: nextStatus })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        return { ok: false, reason: `No se pudo cambiar estado en Firebase: ${message}` }
      }
    } else {
      user.status = nextStatus
    }

    appendAudit(nextStatus === 'activo' ? 'Reactivacion de usuario' : 'Suspension de usuario', user.email)
    return { ok: true }
  }

  async function addUser(payload: CreateUserPayload): Promise<ActionResult> {
    const cleanName = payload.name.trim()
    const cleanEmail = payload.email.trim().toLowerCase()
    const password = payload.password.trim()

    const nameError = validateRequiredText(cleanName, 'Nombre', { min: 3, max: 80 })
    if (nameError) {
      return { ok: false, reason: nameError }
    }
    if (!isValidEmail(cleanEmail)) {
      return { ok: false, reason: 'Ingresa un correo valido.' }
    }
    if (!password) {
      return { ok: false, reason: 'Datos incompletos.' }
    }
    if (!isValidPassword(password)) {
      return {
        ok: false,
        reason:
          'La contrasena debe tener entre 8 y 72 caracteres, incluyendo al menos una letra y un numero.',
      }
    }

    const exists = users.value.some((user) => user.email.toLowerCase() === cleanEmail)
    if (exists) {
      return { ok: false, reason: 'El correo ya existe en la base de datos.' }
    }

    if (isFirebaseConfigured && firebaseDb) {
      const permission = await checkManageUsersPermission()
      if (!permission.ok) {
        return {
          ok: false,
          reason: permission.reason,
        }
      }

      let createdAuth: CreateAuthUserResult | null = null
      try {
        createdAuth = await createAuthUser(cleanEmail, password)
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : 'No se pudo crear usuario en Auth.' }
      }

      try {
        await set(dbRef(firebaseDb, `users/${createdAuth.localId}`), {
          id: createdAuth.localId,
          name: cleanName,
          email: cleanEmail,
          role: payload.role,
          status: 'activo',
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        try {
          if (createdAuth?.idToken) {
            await deleteAuthUserWithIdToken(createdAuth.idToken)
          }
          return {
            ok: false,
            reason: `No se pudo guardar en DB: ${message}. Se revirtio automaticamente el usuario creado en Auth.`,
          }
        } catch (rollbackError) {
          const rollbackMessage =
            rollbackError instanceof Error ? rollbackError.message : 'Error desconocido al revertir Auth.'
          return {
            ok: false,
            reason: `Usuario creado en Auth, pero fallo guardado en DB: ${message}. Ademas fallo la reversion en Auth: ${rollbackMessage}`,
          }
        }
      }

      appendAudit('Alta de usuario', cleanEmail)
      return { ok: true }
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
    return { ok: true }
  }

  async function removeUser(id: string): Promise<ActionResult> {
    const index = users.value.findIndex((item) => item.id === id)
    if (index === -1) return { ok: false, reason: 'Usuario no encontrado.' }
    const target = users.value[index]

    if (target.role === 'admin' && target.status === 'activo' && !canDemoteOrDeleteAdmin(target.id)) {
      return { ok: false, reason: 'No puedes borrar al ultimo administrador activo.' }
    }

    if (isFirebaseConfigured && firebaseDb) {
      try {
        await remove(dbRef(firebaseDb, `users/${target.id}`))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        return { ok: false, reason: `No se pudo eliminar en Firebase: ${message}` }
      }

      const authDeleteResult = await deleteAuthUserByAdmin(target.id)
      if (!authDeleteResult.ok) {
        appendAudit('Baja de usuario (solo DB)', `${target.email} | Auth pendiente`)
        return {
          ok: true,
          notice: `Usuario eliminado de la base de datos, pero no de Firebase Auth: ${authDeleteResult.reason}`,
        }
      }
    } else {
      users.value.splice(index, 1)
    }

    appendAudit('Baja de usuario', target.email)
    return { ok: true }
  }

  startFirebaseUsersSync()

  function stopSync() {
    if (!stopUsersListener) return
    stopUsersListener()
    stopUsersListener = null
  }

  return {
    users,
    auditLog,
    search,
    isLoading,
    error,
    activeAdminCount,
    filteredUsers,
    setRole,
    toggleStatus,
    addUser,
    removeUser,
    stopSync,
  }
})
