<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import VehicleTable from '@/components/vehicles/VehicleTable.vue'
import VehicleFormModal from '@/components/vehicles/VehicleFormModal.vue'
import { useVehiclesStore } from '@/stores/vehicles.store'
import type { Vehicle } from '@/types/domain'

const vehiclesStore = useVehiclesStore()
const { filteredVehicles, search } = storeToRefs(vehiclesStore)

const openForm = ref(false)
const editingVehicle = ref<Vehicle | null>(null)

const searchModel = computed({
  get: () => search.value,
  set: (value: string) => vehiclesStore.setSearch(value),
})

function createVehicle() {
  editingVehicle.value = null
  openForm.value = true
}

function editVehicle(vehicle: Vehicle) {
  editingVehicle.value = vehicle
  openForm.value = true
}

function saveVehicle(vehicle: Vehicle) {
  vehiclesStore.upsertVehicle(vehicle)
  openForm.value = false
}

function removeVehicle(plate: string) {
  if (!window.confirm(`Se eliminara el vehiculo ${plate}. ¿Deseas continuar?`)) {
    return
  }
  vehiclesStore.removeVehicle(plate)
}
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Gestion de vehiculos"
      subtitle="Administra la flota autorizada para ingresos y salidas de planta."
    >
      <template #actions>
        <button
          type="button"
          class="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0849d6]"
          @click="createVehicle"
        >
          Agregar vehiculo
        </button>
      </template>
    </AppSectionHeader>

    <section class="card-panel p-4">
      <SearchInput v-model="searchModel" placeholder="Buscar por patente, empresa o carga" />
    </section>

    <EmptyState
      v-if="!filteredVehicles.length"
      title="Sin vehiculos"
      message="No hay coincidencias con el filtro actual."
    />

    <VehicleTable
      v-else
      :vehicles="filteredVehicles"
      @edit="editVehicle"
      @remove="removeVehicle"
    />

    <VehicleFormModal
      :open="openForm"
      :initial="editingVehicle"
      @close="openForm = false"
      @save="saveVehicle"
    />
  </div>
</template>
