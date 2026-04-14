import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

function toBooleanFlag(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return !['0', 'false', 'off', 'no'].includes(normalized)
}

const shouldUseFirebase = toBooleanFlag(import.meta.env.VITE_USE_FIREBASE, true)
const virtualGateEnabled = toBooleanFlag(import.meta.env.VITE_VIRTUAL_GATE, false)

const firebaseConfig = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY ?? ''),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? ''),
  databaseURL: String(import.meta.env.VITE_FIREBASE_DATABASE_URL ?? ''),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? ''),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID ?? ''),
}

const hasRequiredFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

export const isFirebaseConfigured = shouldUseFirebase && hasRequiredFirebaseConfig
export const firebaseAccessPoint = String(import.meta.env.VITE_ACCESS_POINT ?? 'porton_norte')
export const isVirtualGateEnabled = virtualGateEnabled

export let firebaseApp: FirebaseApp | null = null
export let firebaseAuth: Auth | null = null
export let firebaseDb: Database | null = null

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig)
  firebaseAuth = getAuth(firebaseApp)
  firebaseDb = getDatabase(firebaseApp)
}
