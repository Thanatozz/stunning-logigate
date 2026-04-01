<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { DeviceStatus, DeviceType } from '@/types/domain'
import type { CreateDevicePayload } from '@/stores/devices.store'

const props = defineProps<{
  open: boolean
  accessPoints: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [payload: CreateDevicePayload]
}>()

const form = reactive<CreateDevicePayload>({
  name: '',
  type: 'esp32_cam',
  accessPoint: '',
  status: 'online',
  signal: 88,
  firmware: 'v1.0.0',
})

const localError = ref('')

const typeOptions: Array<{ label: string; value: DeviceType }> = [
  { label: 'ESP32 CAM', value: 'esp32_cam' },
  { label: 'Sensor IR', value: 'sensor_ir' },
  { label: 'Barrera servo', value: 'barrera_servo' },
]

const statusOptions: Array<{ label: string; value: DeviceStatus }> = [
  { label: 'Online', value: 'online' },
  { label: 'Degradado', value: 'degradado' },
  { label: 'Offline', value: 'offline' },
]

const fallbackAccessPoint = computed(() => props.accessPoints[0] ?? '')

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.name = ''
    form.type = 'esp32_cam'
    form.accessPoint = fallbackAccessPoint.value
    form.status = 'online'
    form.signal = 88
    form.firmware = 'v1.0.0'
    localError.value = ''
  },
  { immediate: true },
)

watch(
  () => form.status,
  (status) => {
    if (status === 'offline') {
      form.signal = 0
      return
    }
    if (status === 'degradado' && (form.signal ?? 0) < 35) {
      form.signal = 55
      return
    }
    if (status === 'online' && (form.signal ?? 0) < 70) {
      form.signal = 88
    }
  },
)

function onClose() {
  emit('close')
}

function onSubmit() {
  if (!form.name.trim()) {
    localError.value = 'Ingresa un nombre para el dispositivo.'
    return
  }
  if (!form.accessPoint.trim()) {
    localError.value = 'Selecciona un punto de acceso.'
    return
  }
  if ((form.signal ?? 0) < 0 || (form.signal ?? 0) > 100) {
    localError.value = 'La senal debe estar entre 0 y 100.'
    return
  }

  emit('save', {
    name: form.name.trim(),
    type: form.type,
    accessPoint: form.accessPoint.trim(),
    status: form.status,
    signal: Number(form.signal),
    firmware: form.firmware?.trim() || 'v1.0.0',
  })
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
    <div class="w-full max-w-xl rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h3 class="text-lg font-semibold">Agregar dispositivo IoT</h3>
      <p class="mt-1 text-sm text-muted">Registra un sensor o camara para monitoreo en tiempo real.</p>

      <form class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="onSubmit">
        <label class="space-y-1 sm:col-span-2">
          <span class="text-xs font-semibold uppercase text-muted">Nombre</span>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            placeholder="ESP32-CAM Porton Norte"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Tipo</span>
          <select
            v-model="form.type"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option v-for="item in typeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Punto de acceso</span>
          <select
            v-model="form.accessPoint"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option v-for="point in accessPoints" :key="point" :value="point">
              {{ point }}
            </option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Estado inicial</span>
          <select
            v-model="form.status"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Senal (%)</span>
          <input
            v-model.number="form.signal"
            type="number"
            min="0"
            max="100"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>

        <label class="space-y-1 sm:col-span-2">
          <span class="text-xs font-semibold uppercase text-muted">Firmware</span>
          <input
            v-model="form.firmware"
            type="text"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            placeholder="v1.0.0"
          />
        </label>

        <p
          v-if="localError"
          class="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ localError }}
        </p>

        <div class="sm:col-span-2 mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-2 text-sm"
            @click="onClose"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white"
          >
            Guardar dispositivo
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
