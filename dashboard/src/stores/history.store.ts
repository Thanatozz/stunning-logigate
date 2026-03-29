import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockAccessRecords } from '@/data/mock/records'
import type { AccessRecord } from '@/types/domain'

interface HistoryFilters {
  dateFrom: string
  dateTo: string
  plate: string
  company: string
  accessPoint: string
}

export const useHistoryStore = defineStore('history', () => {
  const records = ref<AccessRecord[]>([...mockAccessRecords])
  const filters = ref<HistoryFilters>({
    dateFrom: '',
    dateTo: '',
    plate: '',
    company: '',
    accessPoint: '',
  })

  const filteredRecords = computed(() => {
    return records.value.filter((record) => {
      const eventTime = new Date(record.timestamp).getTime()
      const fromMatch = filters.value.dateFrom
        ? eventTime >= new Date(`${filters.value.dateFrom}T00:00:00`).getTime()
        : true
      const toMatch = filters.value.dateTo
        ? eventTime <= new Date(`${filters.value.dateTo}T23:59:59`).getTime()
        : true
      const plateMatch = filters.value.plate
        ? record.plate.toLowerCase().includes(filters.value.plate.toLowerCase())
        : true
      const companyMatch = filters.value.company
        ? record.company.toLowerCase().includes(filters.value.company.toLowerCase())
        : true
      const accessPointMatch = filters.value.accessPoint
        ? record.accessPoint.toLowerCase().includes(filters.value.accessPoint.toLowerCase())
        : true

      return fromMatch && toMatch && plateMatch && companyMatch && accessPointMatch
    })
  })

  function updateFilters(payload: Partial<HistoryFilters>) {
    filters.value = { ...filters.value, ...payload }
  }

  function resetFilters() {
    filters.value = {
      dateFrom: '',
      dateTo: '',
      plate: '',
      company: '',
      accessPoint: '',
    }
  }

  return {
    records,
    filters,
    filteredRecords,
    updateFilters,
    resetFilters,
  }
})
