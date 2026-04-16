<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { SystemSettings } from '@/types/domain'

const props = defineProps<{
  modelValue: SystemSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SystemSettings]
}>()

const form = reactive<SystemSettings>({
  ...props.modelValue,
  accessPoints: [...props.modelValue.accessPoints],
})

const fieldErrors = reactive<Record<string, string>>({
  maxTrucks: '',
  maxStayMinutes: '',
  ocrConfidenceThreshold: '',
  captureIntervalSeconds: '',
  barrierAutoCloseSeconds: '',
})
const localError = ref('')

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, value)
    form.accessPoints = [...value.accessPoints]
    localError.value = ''
    Object.keys(fieldErrors).forEach((key) => {
      fieldErrors[key] = ''
    })
  },
  { deep: true },
)

function sync() {
  emit('update:modelValue', {
    ...form,
    accessPoints: [...form.accessPoints],
  })
}

function validateNumberField(
  field: keyof Pick<
    SystemSettings,
    | 'maxTrucks'
    | 'maxStayMinutes'
    | 'ocrConfidenceThreshold'
    | 'captureIntervalSeconds'
    | 'barrierAutoCloseSeconds'
  >,
  min: number,
  max: number,
  label: string,
) {
  const rawValue = Number(form[field])
  if (!Number.isFinite(rawValue)) {
    form[field] = min
    fieldErrors[field] = `${label} debe ser un numero valido.`
    sync()
    return
  }

  if (rawValue < min || rawValue > max) {
    const next = Math.min(max, Math.max(min, Math.floor(rawValue)))
    form[field] = next
    fieldErrors[field] = `${label} debe estar entre ${min} y ${max}.`
    sync()
    return
  }

  form[field] = Math.floor(rawValue)
  fieldErrors[field] = ''
  sync()
}

function onMaxTrucksChange() {
  validateNumberField('maxTrucks', 1, 500, 'Max. camiones')
}

function onMaxStayMinutesChange() {
  validateNumberField('maxStayMinutes', 1, 10080, 'Tiempo max. permanencia')
}

function onOcrThresholdChange() {
  validateNumberField('ocrConfidenceThreshold', 1, 100, 'Umbral OCR')
}

function onCaptureIntervalChange() {
  validateNumberField('captureIntervalSeconds', 1, 300, 'Intervalo captura')
}

function onAutoCloseSecondsChange() {
  validateNumberField('barrierAutoCloseSeconds', 1, 120, 'Cierre automatico barrera')
}

function togglePoint(id: string) {
  const point = form.accessPoints.find((item) => item.id === id)
  if (!point) return

  if (point.active) {
    const activeCount = form.accessPoints.filter((item) => item.active).length
    if (activeCount <= 1) {
      localError.value = 'Debe quedar al menos un punto de acceso activo.'
      return
    }
  }

  point.active = !point.active
  localError.value = ''
  sync()
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 class="text-sm font-semibold">Parametros operativos</h3>
    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Max. camiones</span>
        <input
          v-model.number="form.maxTrucks"
          type="number"
          min="1"
          max="500"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="onMaxTrucksChange"
        />
        <p v-if="fieldErrors.maxTrucks" class="text-xs text-red-700">{{ fieldErrors.maxTrucks }}</p>
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Tiempo max. permanencia (min)</span>
        <input
          v-model.number="form.maxStayMinutes"
          type="number"
          min="1"
          max="10080"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="onMaxStayMinutesChange"
        />
        <p v-if="fieldErrors.maxStayMinutes" class="text-xs text-red-700">{{ fieldErrors.maxStayMinutes }}</p>
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Umbral OCR (%)</span>
        <input
          v-model.number="form.ocrConfidenceThreshold"
          type="number"
          min="1"
          max="100"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="onOcrThresholdChange"
        />
        <p v-if="fieldErrors.ocrConfidenceThreshold" class="text-xs text-red-700">
          {{ fieldErrors.ocrConfidenceThreshold }}
        </p>
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Intervalo captura (seg)</span>
        <input
          v-model.number="form.captureIntervalSeconds"
          type="number"
          min="1"
          max="300"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="onCaptureIntervalChange"
        />
        <p v-if="fieldErrors.captureIntervalSeconds" class="text-xs text-red-700">
          {{ fieldErrors.captureIntervalSeconds }}
        </p>
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Cierre automatico barrera (seg)</span>
        <input
          v-model.number="form.barrierAutoCloseSeconds"
          type="number"
          min="1"
          max="120"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="onAutoCloseSecondsChange"
        />
        <p v-if="fieldErrors.barrierAutoCloseSeconds" class="text-xs text-red-700">
          {{ fieldErrors.barrierAutoCloseSeconds }}
        </p>
      </label>
    </div>

    <div class="mt-6 border-t border-line pt-4">
      <h4 class="text-sm font-semibold">Puntos de acceso</h4>
      <p v-if="localError" class="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ localError }}
      </p>
      <div class="mt-2 space-y-2">
        <article
          v-for="point in form.accessPoints"
          :key="point.id"
          class="flex items-center justify-between rounded-xl border border-line bg-slate-50 px-3 py-2 text-sm"
        >
          <div>
            <p class="font-medium text-ink">{{ point.name }}</p>
            <p class="text-xs text-muted">{{ point.location }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg px-3 py-1 text-xs font-medium"
            :class="point.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'"
            @click="togglePoint(point.id)"
          >
            {{ point.active ? 'Activo' : 'Inactivo' }}
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

