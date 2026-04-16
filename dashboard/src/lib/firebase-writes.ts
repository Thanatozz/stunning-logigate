import { get, ref as dbRef, set, update } from 'firebase/database'
import { firebaseAccessPoint, firebaseDb, isFirebaseConfigured, isVirtualGateEnabled } from '@/lib/firebase'
import { normalizeAccessPointKey } from '@/lib/access-point'
import type { AlertStatus, BarrierMode, SystemSettings } from '@/types/domain'

interface BarrierCommandInput {
  mode: BarrierMode
  action: 'none' | 'abrir' | 'cerrar'
  updatedBy: string
  accessPoint?: string
  autoOpenUntil?: number
  reason?: string
}

function resolveAccessPoint(accessPoint?: string) {
  return (
    normalizeAccessPointKey(accessPoint) ||
    normalizeAccessPointKey(firebaseAccessPoint) ||
    'porton_norte'
  )
}

function asFiniteNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function sendBarrierCommand(input: BarrierCommandInput) {
  if (!isFirebaseConfigured || !firebaseDb) {
    throw new Error('Firebase no esta configurado en el dashboard')
  }

  const targetAccessPoint = resolveAccessPoint(input.accessPoint)
  const requestId = `cmd-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`
  const updatedAt = new Date().toISOString()

  const payload = {
    requestId,
    mode: input.mode,
    action: input.action,
    autoOpenUntil: Math.max(0, Math.floor(asFiniteNumber(input.autoOpenUntil, 0))),
    updatedBy: input.updatedBy,
    updatedAt,
  }

  await update(dbRef(firebaseDb, `commands/${targetAccessPoint}`), payload)

  try {
    await set(dbRef(firebaseDb, `commandAudit/${targetAccessPoint}/${requestId}`), {
      ...payload,
      accessPoint: targetAccessPoint,
      source: 'dashboard',
      reason: input.reason ?? '',
    })
  } catch (error) {
    console.warn('[LogiGate][commandAudit] No se pudo guardar auditoria de comando', error)
  }

  if (isVirtualGateEnabled) {
    const barrierPatch: Record<string, unknown> = {
      mode: input.mode,
      lastActionAt: updatedAt,
      lastActionBy: input.updatedBy,
    }

    if (input.action === 'abrir') barrierPatch.status = 'abierta'
    if (input.action === 'cerrar') barrierPatch.status = 'cerrada'

    await update(dbRef(firebaseDb, `barrier/${targetAccessPoint}`), barrierPatch)
  }

  return requestId
}

export async function updateAlertStatus(input: {
  id: string
  status: AlertStatus
  updatedBy?: string
}) {
  if (!isFirebaseConfigured || !firebaseDb) {
    throw new Error('Firebase no esta configurado en el dashboard')
  }

  const alertId = String(input.id).trim()
  if (!alertId) {
    throw new Error('Id de alerta invalido')
  }

  await update(dbRef(firebaseDb, `alerts/${alertId}`), {
    status: input.status,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? 'dashboard',
  })
}

export async function saveSystemSettings(settings: SystemSettings) {
  if (!isFirebaseConfigured || !firebaseDb) {
    return
  }

  const payload: SystemSettings = {
    maxTrucks: Math.max(1, Math.floor(asFiniteNumber(settings.maxTrucks, 20))),
    maxStayMinutes: Math.max(1, Math.floor(asFiniteNumber(settings.maxStayMinutes, 480))),
    ocrConfidenceThreshold: Math.min(
      100,
      Math.max(1, Math.floor(asFiniteNumber(settings.ocrConfidenceThreshold, 80))),
    ),
    captureIntervalSeconds: Math.max(1, Math.floor(asFiniteNumber(settings.captureIntervalSeconds, 5))),
    barrierAutoCloseSeconds: Math.max(
      1,
      Math.floor(asFiniteNumber(settings.barrierAutoCloseSeconds, 10)),
    ),
    accessPoints: settings.accessPoints.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      location: String(item.location),
      active: Boolean(item.active),
    })),
  }

  await set(dbRef(firebaseDb, 'settings'), payload)
}

export async function loadSystemSettings() {
  if (!isFirebaseConfigured || !firebaseDb) {
    return null
  }
  const snapshot = await get(dbRef(firebaseDb, 'settings'))
  return snapshot.exists() ? snapshot.val() : null
}
