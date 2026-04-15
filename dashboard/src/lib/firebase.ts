import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

declare global {
  interface Window {
    __LOGIGATE_CONFIG__?: Record<string, string | undefined>
  }
}

function toBooleanFlag(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return !['0', 'false', 'off', 'no'].includes(normalized)
}

function readConfigValue(name: string): string {
  if (typeof window !== 'undefined') {
    const runtimeValue = window.__LOGIGATE_CONFIG__?.[name]
    if (runtimeValue !== undefined && runtimeValue !== null && runtimeValue !== '') {
      return String(runtimeValue)
    }
  }
  return String(import.meta.env[name] ?? '')
}

function getDomainHost(domainOrUrl: string): string | null {
  const trimmed = domainOrUrl.trim()
  if (!trimmed) return null
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).host
    }
    return new URL(`https://${trimmed}`).host
  } catch {
    return null
  }
}

const shouldUseFirebase = toBooleanFlag(readConfigValue('VITE_USE_FIREBASE'), true)
const virtualGateEnabled = toBooleanFlag(readConfigValue('VITE_VIRTUAL_GATE'), false)

const firebaseConfig = {
  apiKey: readConfigValue('VITE_FIREBASE_API_KEY'),
  authDomain: readConfigValue('VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: readConfigValue('VITE_FIREBASE_DATABASE_URL'),
  projectId: readConfigValue('VITE_FIREBASE_PROJECT_ID'),
  appId: readConfigValue('VITE_FIREBASE_APP_ID'),
}

const hasRequiredFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

export const isFirebaseConfigured = shouldUseFirebase && hasRequiredFirebaseConfig
export const firebaseAccessPoint = readConfigValue('VITE_ACCESS_POINT') || 'porton_norte'
export const isVirtualGateEnabled = virtualGateEnabled

export let firebaseApp: FirebaseApp | null = null
export let firebaseAuth: Auth | null = null
export let firebaseDb: Database | null = null

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig)
  firebaseAuth = getAuth(firebaseApp)
  firebaseDb = getDatabase(firebaseApp)
}

export function getFirebaseDebugInfo() {
  const currentHost = typeof window !== 'undefined' ? window.location.host : ''
  return {
    mode: typeof window !== 'undefined' && window.__LOGIGATE_CONFIG__ ? 'runtime' : 'build',
    shouldUseFirebase,
    hasRequiredFirebaseConfig,
    isFirebaseConfigured,
    currentHost,
    authDomain: firebaseConfig.authDomain,
    authDomainHost: getDomainHost(firebaseConfig.authDomain),
    projectId: firebaseConfig.projectId,
    hasDatabaseURL: Boolean(firebaseConfig.databaseURL),
  }
}

if (typeof window !== 'undefined') {
  const debug = getFirebaseDebugInfo()
  console.info('[LogiGate][firebase] init', debug)

  if (debug.shouldUseFirebase && !debug.hasRequiredFirebaseConfig) {
    console.warn(
      '[LogiGate][firebase] Firebase esta habilitado pero faltan variables VITE_FIREBASE_*. Se usara modo demo.',
    )
  }

  if (debug.isFirebaseConfigured && debug.currentHost && debug.authDomainHost && debug.currentHost !== debug.authDomainHost) {
    console.warn(
      `[LogiGate][firebase] Host actual (${debug.currentHost}) distinto de authDomain (${debug.authDomainHost}). Revisa Authorized domains en Firebase Auth.`,
    )
  }
}
