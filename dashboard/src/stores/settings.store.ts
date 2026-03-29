import { ref } from 'vue'
import { defineStore } from 'pinia'
import { mockSettings } from '@/data/mock/settings'
import type { SystemSettings } from '@/types/domain'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SystemSettings>({
    ...mockSettings,
    accessPoints: [...mockSettings.accessPoints],
  })

  function patchSettings(payload: Partial<Omit<SystemSettings, 'accessPoints'>>) {
    settings.value = { ...settings.value, ...payload }
  }

  function toggleAccessPoint(id: string) {
    const point = settings.value.accessPoints.find((item) => item.id === id)
    if (!point) return
    point.active = !point.active
  }

  function addAccessPoint(name: string, location: string) {
    settings.value.accessPoints.push({
      id: `point-${Date.now()}`,
      name,
      location,
      active: true,
    })
  }

  return {
    settings,
    patchSettings,
    toggleAccessPoint,
    addAccessPoint,
  }
})
