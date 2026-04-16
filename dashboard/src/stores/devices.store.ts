import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { isValidFirmware, validateRequiredText } from '@/lib/field-validation'
import { mockDevices } from '@/data/mock/devices'
import type { Device, DeviceStatus } from '@/types/domain'

export interface CreateDevicePayload {
  name: string
  type: Device['type']
  accessPoint: string
  status?: DeviceStatus
  signal?: number
  firmware?: string
}

export const useDevicesStore = defineStore('devices', () => {
  const devices = ref<Device[]>([...mockDevices])

  const connectedCount = computed(() => devices.value.filter((device) => device.status === 'online').length)
  const degradedCount = computed(
    () => devices.value.filter((device) => device.status === 'degradado').length,
  )
  const offlineCount = computed(() => devices.value.filter((device) => device.status === 'offline').length)

  function setDeviceStatus(id: string, status: DeviceStatus, signal?: number) {
    const device = devices.value.find((item) => item.id === id)
    if (!device) return
    device.status = status
    device.signal =
      signal ?? (status === 'offline' ? 0 : status === 'degradado' ? Math.max(35, device.signal - 20) : 85)
    device.lastSeen = new Date().toISOString()
  }

  function setDeviceStatusByAccessPoint(
    accessPoint: string,
    status: DeviceStatus,
    options?: { onlyType?: Device['type']; signal?: number },
  ) {
    const matches = devices.value.filter((item) => {
      if (item.accessPoint !== accessPoint) return false
      if (options?.onlyType && item.type !== options.onlyType) return false
      return true
    })
    for (const item of matches) {
      setDeviceStatus(item.id, status, options?.signal)
    }
  }

  function getRandomDeviceByStatus(status: DeviceStatus) {
    const matches = devices.value.filter((item) => item.status === status)
    if (!matches.length) return null
    return matches[Math.floor(Math.random() * matches.length)]
  }

  function addDevice(payload: CreateDevicePayload) {
    const cleanName = payload.name.trim()
    const cleanAccessPoint = payload.accessPoint.trim()
    const nameError = validateRequiredText(cleanName, 'Nombre del dispositivo', { min: 3, max: 80 })
    const accessPointError = validateRequiredText(cleanAccessPoint, 'Punto de acceso', { min: 2, max: 80 })
    if (nameError || accessPointError) {
      return null
    }

    const status = payload.status ?? 'online'
    const rawSignal = Number(
      payload.signal ?? (status === 'offline' ? 0 : status === 'degradado' ? 55 : 88),
    )
    const signal = Number.isFinite(rawSignal)
      ? Math.max(0, Math.min(100, rawSignal))
      : status === 'offline'
        ? 0
        : status === 'degradado'
          ? 55
          : 88
    const firmware = (payload.firmware || 'v1.0.0').trim()
    const safeFirmware = isValidFirmware(firmware) ? firmware : 'v1.0.0'

    const next: Device = {
      id: `DEV-${Date.now()}`,
      name: cleanName,
      type: payload.type,
      accessPoint: cleanAccessPoint,
      status,
      signal,
      firmware: safeFirmware,
      lastSeen: new Date().toISOString(),
    }

    devices.value.unshift(next)
    return next.id
  }

  function setDevices(payload: Device[]) {
    devices.value = [...payload]
  }

  return {
    devices,
    connectedCount,
    degradedCount,
    offlineCount,
    setDeviceStatus,
    setDeviceStatusByAccessPoint,
    getRandomDeviceByStatus,
    addDevice,
    setDevices,
  }
})
