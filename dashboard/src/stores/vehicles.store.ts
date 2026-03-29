import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockVehicles } from '@/data/mock/vehicles'
import type { Vehicle } from '@/types/domain'

export const useVehiclesStore = defineStore('vehicles', () => {
  const vehicles = ref<Vehicle[]>([...mockVehicles])
  const search = ref('')

  const filteredVehicles = computed(() => {
    const keyword = search.value.trim().toLowerCase()
    if (!keyword) return vehicles.value
    return vehicles.value.filter(
      (vehicle) =>
        vehicle.plate.toLowerCase().includes(keyword) ||
        vehicle.company.toLowerCase().includes(keyword) ||
        vehicle.cargoType.toLowerCase().includes(keyword),
    )
  })

  function setSearch(value: string) {
    search.value = value
  }

  function upsertVehicle(payload: Vehicle) {
    const index = vehicles.value.findIndex((item) => item.plate === payload.plate)
    if (index >= 0) {
      vehicles.value[index] = { ...payload }
      return
    }
    vehicles.value.unshift({ ...payload })
  }

  function removeVehicle(plate: string) {
    vehicles.value = vehicles.value.filter((item) => item.plate !== plate)
  }

  return {
    vehicles,
    search,
    filteredVehicles,
    setSearch,
    upsertVehicle,
    removeVehicle,
  }
})
