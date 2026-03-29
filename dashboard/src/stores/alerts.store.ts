import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockAlerts } from '@/data/mock/alerts'
import type { Alert, AlertSeverity, AlertStatus, AlertType } from '@/types/domain'

interface AlertFilters {
  type: AlertType | ''
  severity: AlertSeverity | ''
  status: AlertStatus | ''
}

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref<Alert[]>([...mockAlerts])
  const filters = ref<AlertFilters>({
    type: '',
    severity: '',
    status: '',
  })

  const filteredAlerts = computed(() =>
    alerts.value.filter((item) => {
      const byType = filters.value.type ? item.type === filters.value.type : true
      const bySeverity = filters.value.severity ? item.severity === filters.value.severity : true
      const byStatus = filters.value.status ? item.status === filters.value.status : true
      return byType && bySeverity && byStatus
    }),
  )

  const activeAlerts = computed(() => alerts.value.filter((item) => item.status === 'activa'))

  function updateFilters(payload: Partial<AlertFilters>) {
    filters.value = { ...filters.value, ...payload }
  }

  function resolveAlert(id: string) {
    const alert = alerts.value.find((item) => item.id === id)
    if (!alert) return
    alert.status = 'resuelta'
  }

  function ignoreAlert(id: string) {
    const alert = alerts.value.find((item) => item.id === id)
    if (!alert) return
    alert.status = 'ignorada'
  }

  return {
    alerts,
    filters,
    filteredAlerts,
    activeAlerts,
    updateFilters,
    resolveAlert,
    ignoreAlert,
  }
})
