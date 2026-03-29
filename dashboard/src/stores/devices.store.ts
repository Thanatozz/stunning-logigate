import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockDevices } from '@/data/mock/devices'
import type { Device } from '@/types/domain'

export const useDevicesStore = defineStore('devices', () => {
  const devices = ref<Device[]>([...mockDevices])

  const connectedCount = computed(() => devices.value.filter((device) => device.status === 'online').length)
  const degradedCount = computed(
    () => devices.value.filter((device) => device.status === 'degradado').length,
  )
  const offlineCount = computed(() => devices.value.filter((device) => device.status === 'offline').length)

  return {
    devices,
    connectedCount,
    degradedCount,
    offlineCount,
  }
})
