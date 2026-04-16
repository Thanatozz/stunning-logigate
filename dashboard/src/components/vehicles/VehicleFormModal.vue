<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import {
  isValidPlate,
  normalizePlateInput,
  validateRequiredText,
} from '@/lib/field-validation'
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

const localError = ref('')

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

watch(
  () => props.open,
  (isOpen) => {
    localError.value = ''
    if (!isOpen || props.initial) return
    Object.assign(form, {
      plate: '',
      company: '',
      cargoType: '',
      category: 'carga_pesada',
      status: 'autorizado',
      active: true,
      createdAt: new Date().toISOString(),
    })
  },
)

const categoryOptions: Array<{ label: string; value: VehicleCategory }> = [
  { label: 'Carga pesada', value: 'carga_pesada' },
  { label: 'Carga liviana', value: 'carga_liviana' },
  { label: 'Refrigerado', value: 'refrigerado' },
  { label: 'Especial', value: 'especial' },
]

const statusOptions: Array<{ label: string; value: VehicleStatus }> = [
  { label: 'Autorizado', value: 'autorizado' },
  { label: 'Observacion', value: 'observacion' },
  { label: 'Bloqueado', value: 'bloqueado' },
]

function onPlateInput() {
  form.plate = normalizePlateInput(form.plate)
}

function submit() {
  localError.value = ''

  const plate = normalizePlateInput(form.plate)
  if (!isValidPlate(plate)) {
    localError.value =
      'La patente debe tener entre 5 y 8 caracteres alfanumericos (sin espacios ni simbolos).'
    return
  }

  const companyError = validateRequiredText(form.company, 'Empresa', { min: 2, max: 80 })
  if (companyError) {
    localError.value = companyError
    return
  }

  const cargoTypeError = validateRequiredText(form.cargoType, 'Tipo de carga', { min: 2, max: 80 })
  if (cargoTypeError) {
    localError.value = cargoTypeError
    return
  }

  emit('save', {
    ...form,
    plate,
    company: form.company.trim(),
    cargoType: form.cargoType.trim(),
  })
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
    <div class="w-full max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h3 class="text-lg font-semibold">{{ props.initial ? 'Editar vehiculo' : 'Nuevo vehiculo' }}</h3>
      <p class="mt-1 text-sm text-muted">Completa la informacion base de la flota autorizada.</p>

      <form class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="submit">
        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Patente</span>
          <input
            v-model="form.plate"
            required
            maxlength="8"
            placeholder="AB1234"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm uppercase outline-none ring-accent focus:ring-2"
            @input="onPlateInput"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Empresa</span>
          <input
            v-model="form.company"
            required
            maxlength="80"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Tipo de carga</span>
          <input
            v-model="form.cargoType"
            required
            maxlength="80"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Categoria</span>
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
            <option :value="true">Si</option>
            <option :value="false">No</option>
          </select>
        </label>

        <p
          v-if="localError"
          class="col-span-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ localError }}
        </p>

        <div class="col-span-full mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-2 text-sm"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button type="submit" class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
            Guardar vehiculo
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
