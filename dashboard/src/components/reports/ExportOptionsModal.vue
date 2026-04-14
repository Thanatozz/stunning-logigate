<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { ReportsExportRequest } from '@/types/reports-export'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [payload: ReportsExportRequest]
}>()

const form = reactive<ReportsExportRequest>({
  format: 'csv',
  rangePreset: 'selected',
  dateFrom: '',
  dateTo: '',
  csvMode: 'analytics',
  includeYearly: true,
  includeMonthly: true,
  includeDetail: true,
})

const localError = ref('')

function onClose() {
  localError.value = ''
  emit('close')
}

function onConfirm() {
  localError.value = ''

  if (form.rangePreset === 'custom') {
    if (!form.dateFrom || !form.dateTo) {
      localError.value = 'Debes seleccionar fecha desde y fecha hasta.'
      return
    }
    if (new Date(form.dateFrom).getTime() > new Date(form.dateTo).getTime()) {
      localError.value = 'La fecha desde no puede ser mayor que la fecha hasta.'
      return
    }
  }

  if (form.format === 'pdf' && form.rangePreset === 'all') {
    localError.value = 'Para historial completo usa CSV. PDF admite rangos acotados.'
    return
  }

  if (form.format === 'csv' && form.csvMode === 'full' && !form.includeYearly && !form.includeMonthly && !form.includeDetail) {
    localError.value = 'Selecciona al menos una seccion del CSV completo.'
    return
  }

  emit('confirm', { ...form })
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
    <div class="w-full max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h3 class="text-base font-semibold">Exportar reporte</h3>
      <p class="mt-1 text-sm text-muted">Configura formato, rango y nivel de detalle antes de descargar.</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Formato</span>
          <select
            v-model="form.format"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Rango</span>
          <select
            v-model="form.rangePreset"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option value="selected">Rango seleccionado en pantalla</option>
            <option value="today">Hoy</option>
            <option value="last7">Últimos 7 días</option>
            <option value="last30">Últimos 30 días</option>
            <option value="custom">Rango personalizado</option>
            <option value="all">Historial completo</option>
          </select>
        </label>
      </div>

      <div v-if="form.rangePreset === 'custom'" class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Fecha desde</span>
          <input
            v-model="form.dateFrom"
            type="date"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>
        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Fecha hasta</span>
          <input
            v-model="form.dateTo"
            type="date"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </label>
      </div>

      <div v-if="form.format === 'csv'" class="mt-4 rounded-xl border border-line bg-muted/20 p-3">
        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Tipo CSV</span>
          <select
            v-model="form.csvMode"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option value="analytics">Analitico (resumen, tendencia, comparativo)</option>
            <option value="full">Completo (anual, mensual, detalle)</option>
          </select>
        </label>

        <div v-if="form.csvMode === 'full'" class="mt-3 grid gap-2 sm:grid-cols-3">
          <label class="flex items-center gap-2 text-sm text-ink">
            <input v-model="form.includeYearly" type="checkbox" class="h-4 w-4 rounded border-line" />
            Resumen anual
          </label>
          <label class="flex items-center gap-2 text-sm text-ink">
            <input v-model="form.includeMonthly" type="checkbox" class="h-4 w-4 rounded border-line" />
            Resumen mensual
          </label>
          <label class="flex items-center gap-2 text-sm text-ink">
            <input v-model="form.includeDetail" type="checkbox" class="h-4 w-4 rounded border-line" />
            Detalle eventos
          </label>
        </div>
      </div>

      <p v-if="localError" class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ localError }}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-2 text-sm"
          @click="onClose"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white"
          @click="onConfirm"
        >
          Exportar
        </button>
      </div>
    </div>
  </div>
</template>
