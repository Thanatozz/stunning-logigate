<script setup lang="ts">
import { reactive, watch } from 'vue'
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

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, value)
    form.accessPoints = [...value.accessPoints]
  },
  { deep: true },
)

function sync() {
  emit('update:modelValue', {
    ...form,
    accessPoints: [...form.accessPoints],
  })
}

function togglePoint(id: string) {
  const point = form.accessPoints.find((item) => item.id === id)
  if (!point) return
  point.active = !point.active
  sync()
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 class="text-sm font-semibold">Parámetros operativos</h3>
    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Máx. camiones</span>
        <input
          v-model.number="form.maxTrucks"
          type="number"
          min="1"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="sync"
        />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Tiempo máx. permanencia (min)</span>
        <input
          v-model.number="form.maxStayMinutes"
          type="number"
          min="1"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="sync"
        />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Umbral OCR (%)</span>
        <input
          v-model.number="form.ocrConfidenceThreshold"
          type="number"
          min="1"
          max="100"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="sync"
        />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Intervalo captura (seg)</span>
        <input
          v-model.number="form.captureIntervalSeconds"
          type="number"
          min="1"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="sync"
        />
      </label>
      <label class="space-y-1">
        <span class="text-xs font-semibold uppercase text-muted">Cierre automático barrera (seg)</span>
        <input
          v-model.number="form.barrierAutoCloseSeconds"
          type="number"
          min="1"
          class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          @change="sync"
        />
      </label>
    </div>

    <div class="mt-6 border-t border-line pt-4">
      <h4 class="text-sm font-semibold">Puntos de acceso</h4>
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
