import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockAlerts } from '@/data/mock/alerts'
import { isFirebaseConfigured } from '@/lib/firebase'
import type { Alert, AlertSeverity, AlertStatus, AlertType } from '@/types/domain'

interface AlertFilters {
  type: AlertType | ''
  severity: AlertSeverity | ''
  status: AlertStatus | ''
}

export interface CreateAlertPayload {
  type: AlertType
  description: string
  severity: AlertSeverity
  source: string
  relatedPlate?: string
  status?: AlertStatus
}

export const useAlertsStore = defineStore('alerts', () => {
  const alerts = ref<Alert[]>(isFirebaseConfigured ? [] : [...mockAlerts])
  const isLoading = ref(isFirebaseConfigured)
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

  function createAlert(payload: CreateAlertPayload) {
    const newAlert: Alert = {
      id: `al-${Math.random().toString(36).slice(2, 10)}`,
      type: payload.type,
      description: payload.description,
      severity: payload.severity,
      status: payload.status ?? 'activa',
      timestamp: new Date().toISOString(),
      relatedPlate: payload.relatedPlate,
      source: payload.source,
    }
    alerts.value.unshift(newAlert)
    if (alerts.value.length > 60) {
      alerts.value = alerts.value.slice(0, 60)
    }
    return newAlert.id
  }

  function resolveLatestActiveByType(type: AlertType) {
    const active = alerts.value.find((item) => item.type === type && item.status === 'activa')
    if (!active) return
    active.status = 'resuelta'
  }

  function setAlerts(payload: Alert[]) {
    alerts.value = [...payload]
    isLoading.value = false
  }

  return {
    alerts,
    isLoading,
    filters,
    filteredAlerts,
    activeAlerts,
    updateFilters,
    resolveAlert,
    ignoreAlert,
    createAlert,
    resolveLatestActiveByType,
    setAlerts,
  }
})
