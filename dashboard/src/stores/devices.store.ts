import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
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
    const status = payload.status ?? 'online'
    const signal =
      payload.signal ??
      (status === 'offline' ? 0 : status === 'degradado' ? 55 : 88)

    const next: Device = {
      id: `DEV-${Date.now()}`,
      name: payload.name.trim(),
      type: payload.type,
      accessPoint: payload.accessPoint.trim(),
      status,
      signal,
      firmware: (payload.firmware || 'v1.0.0').trim(),
      lastSeen: new Date().toISOString(),
    }

    devices.value.unshift(next)
    return next.id
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
  }
})
