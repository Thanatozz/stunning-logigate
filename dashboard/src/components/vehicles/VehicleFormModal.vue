<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Vehicle, VehicleCategory, VehicleStatus } from '@/types/domain'

const props = defineProps<{
  open: boolean
  initial?: Vehicle | null
}>()

const emit = defineEmits<{
  close: []
  save: [vehicle: Vehicle]
}>()

const form = reactive<Vehicle>({
  plate: '',
  company: '',
  cargoType: '',
  category: 'carga_pesada',
  status: 'autorizado',
  active: true,
  createdAt: new Date().toISOString(),
})

watch(
  () => props.initial,
  (value) => {
    if (!value) {
      Object.assign(form, {
        plate: '',
        company: '',
        cargoType: '',
        category: 'carga_pesada',
        status: 'autorizado',
        active: true,
        createdAt: new Date().toISOString(),
      })
      return
    }
    Object.assign(form, value)
  },
  { immediate: true },
)

const categoryOptions: Array<{ label: string; value: VehicleCategory }> = [
  { label: 'Carga pesada', value: 'carga_pesada' },
  { label: 'Carga liviana', value: 'carga_liviana' },
  { label: 'Refrigerado', value: 'refrigerado' },
  { label: 'Especial', value: 'especial' },
]

const statusOptions: Array<{ label: string; value: VehicleStatus }> = [
  { label: 'Autorizado', value: 'autorizado' },
  { label: 'Observación', value: 'observacion' },
  { label: 'Bloqueado', value: 'bloqueado' },
]

function submit() {
  emit('save', { ...form, plate: form.plate.toUpperCase() })
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
    <div class="w-full max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h3 class="text-lg font-semibold">{{ props.initial ? 'Editar vehículo' : 'Nuevo vehículo' }}</h3>
      <p class="mt-1 text-sm text-muted">Completa la información base de la flota autorizada.</p>

      <form class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="submit">
        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Patente</span>
          <input
            v-model="form.plate"
            required
            placeholder="AB-1234"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Empresa</span>
          <input
            v-model="form.company"
            required
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Tipo de carga</span>
          <input
            v-model="form.cargoType"
            required
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Categoría</span>
          <select
            v-model="form.category"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Estado</span>
          <select
            v-model="form.status"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Activo</span>
          <select
            v-model="form.active"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option :value="true">Sí</option>
            <option :value="false">No</option>
          </select>
        </label>

        <div class="col-span-full mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-2 text-sm"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button type="submit" class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
            Guardar vehículo
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
