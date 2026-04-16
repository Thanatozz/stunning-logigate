import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockSettings } from '@/data/mock/settings'
import { firebaseAccessPoint } from '@/lib/firebase'
import { formatAccessPointLabel, normalizeAccessPointKey } from '@/lib/access-point'
import { loadSystemSettings, saveSystemSettings } from '@/lib/firebase-writes'
import type { AccessPoint, SystemSettings } from '@/types/domain'

interface AccessPointOption {
  key: string
  label: string
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function deriveAccessPointKey(point: AccessPoint): string {
  const fromName = normalizeAccessPointKey(point.name)
  const fromId = normalizeAccessPointKey(point.id)

  if (fromId.includes('_')) return fromId
  return fromName || fromId || normalizeAccessPointKey(firebaseAccessPoint) || 'porton_norte'
}

function parseAccessPoints(raw: unknown, fallback: AccessPoint[]) {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw)
      : []

  const parsed = source
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const data = item as Partial<AccessPoint>
      const name = String(data.name ?? '').trim()
      const location = String(data.location ?? '').trim()
      if (!name || !location) return null

      return {
        id: String(data.id ?? `point-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        name,
        location,
        active: Boolean(data.active),
      } satisfies AccessPoint
    })
    .filter((item): item is AccessPoint => item !== null)

  return parsed.length ? parsed : fallback
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SystemSettings>({
    ...mockSettings,
    accessPoints: [...mockSettings.accessPoints],
  })
  const controlAccessPoint = ref(
    normalizeAccessPointKey(firebaseAccessPoint) || 'porton_norte',
  )
  const syncError = ref('')

  function getActiveOptions(): AccessPointOption[] {
    const options: AccessPointOption[] = []
    const seen = new Set<string>()

    for (const point of settings.value.accessPoints) {
      if (!point.active) continue
      const key = deriveAccessPointKey(point)
      if (!key || seen.has(key)) continue
      seen.add(key)
      options.push({ key, label: point.name })
    }

    return options
  }

  const activeAccessPointOptions = computed<AccessPointOption[]>(() => {
    const options = getActiveOptions()
    if (options.length) return options

    const fallbackKey = controlAccessPoint.value || normalizeAccessPointKey(firebaseAccessPoint) || 'porton_norte'
    return [{ key: fallbackKey, label: formatAccessPointLabel(fallbackKey) }]
  })

  function ensureSelectedAccessPoint() {
    const options = getActiveOptions()
    if (!options.length) {
      if (!controlAccessPoint.value) {
        controlAccessPoint.value =
          normalizeAccessPointKey(firebaseAccessPoint) || 'porton_norte'
      }
      return
    }

    const current = normalizeAccessPointKey(controlAccessPoint.value)
    if (options.some((option) => option.key === current)) {
      controlAccessPoint.value = current
      return
    }
    controlAccessPoint.value = options[0].key
  }

  async function persistSettings() {
    try {
      syncError.value = ''
      await saveSystemSettings(settings.value)
    } catch (error) {
      syncError.value =
        error instanceof Error ? error.message : 'No se pudo guardar configuracion'
    }
  }

  function patchSettings(payload: Partial<Omit<SystemSettings, 'accessPoints'>>) {
    settings.value = { ...settings.value, ...payload }
    ensureSelectedAccessPoint()
    void persistSettings()
  }

  function toggleAccessPoint(id: string) {
    const point = settings.value.accessPoints.find((item) => item.id === id)
    if (!point) return
    point.active = !point.active
    ensureSelectedAccessPoint()
    void persistSettings()
  }

  function addAccessPoint(name: string, location: string) {
    const normalizedName = name.trim()
    const normalizedLocation = location.trim()
    if (!normalizedName || !normalizedLocation) return

    const baseId = normalizeAccessPointKey(normalizedName) || `point-${Date.now()}`
    const uniqueId = settings.value.accessPoints.some(
      (item) =>
        normalizeAccessPointKey(item.id) === baseId ||
        deriveAccessPointKey(item) === baseId,
    )
      ? `${baseId}-${Date.now()}`
      : baseId

    settings.value.accessPoints.push({
      id: uniqueId,
      name: normalizedName,
      location: normalizedLocation,
      active: true,
    })
    ensureSelectedAccessPoint()
    void persistSettings()
  }

  function setSettings(payload: SystemSettings) {
    settings.value = {
      ...payload,
      accessPoints: [...payload.accessPoints],
    }
    ensureSelectedAccessPoint()
    void persistSettings()
  }

  function setControlAccessPoint(accessPoint: string) {
    const normalized = normalizeAccessPointKey(accessPoint)
    if (!normalized) return
    controlAccessPoint.value = normalized
  }

  async function loadSettingsFromFirebase() {
    try {
      syncError.value = ''
      const remote = await loadSystemSettings()
      if (!remote || typeof remote !== 'object') return
      const data = remote as Record<string, unknown>

      settings.value = {
        maxTrucks: Math.max(1, Math.floor(toNumber(data.maxTrucks, settings.value.maxTrucks))),
        maxStayMinutes: Math.max(
          1,
          Math.floor(toNumber(data.maxStayMinutes, settings.value.maxStayMinutes)),
        ),
        ocrConfidenceThreshold: Math.min(
          100,
          Math.max(
            1,
            Math.floor(
              toNumber(
                data.ocrConfidenceThreshold,
                settings.value.ocrConfidenceThreshold,
              ),
            ),
          ),
        ),
        captureIntervalSeconds: Math.max(
          1,
          Math.floor(
            toNumber(data.captureIntervalSeconds, settings.value.captureIntervalSeconds),
          ),
        ),
        barrierAutoCloseSeconds: Math.max(
          1,
          Math.floor(
            toNumber(data.barrierAutoCloseSeconds, settings.value.barrierAutoCloseSeconds),
          ),
        ),
        accessPoints: parseAccessPoints(data.accessPoints, settings.value.accessPoints),
      }

      ensureSelectedAccessPoint()
    } catch (error) {
      syncError.value =
        error instanceof Error ? error.message : 'No se pudo leer configuracion'
    }
  }

  return {
    settings,
    controlAccessPoint,
    activeAccessPointOptions,
    syncError,
    patchSettings,
    toggleAccessPoint,
    addAccessPoint,
    setSettings,
    setControlAccessPoint,
    loadSettingsFromFirebase,
  }
})
