<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatDateTime } from '@/composables/useKpi'
import type { Device } from '@/types/domain'

const props = defineProps<{
  open: boolean
  device: Device | null
}>()

const emit = defineEmits<{
  close: []
}>()

const telemetry = computed(() => props.device?.telemetry)

function closeModal() {
  emit('close')
}

function formatDistance(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return `${value.toFixed(1)} cm`
}

function formatUptime(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'

  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatCrossingLabel(value: string | undefined) {
  if (!value || value === 'none') return 'sin cruce'
  return value
}

function formatCrossingState(value: string | undefined) {
  if (!value) return '--'
  return value
}

function formatBarrierStatus(value: string | undefined) {
  if (!value) return '--'
  return value
}

function sensorBadgeClass(active: boolean | undefined) {
  return active ? 'badge-success' : 'badge-neutral'
}

function sensorBadgeLabel(active: boolean | undefined) {
  return active ? 'Activo' : 'Inactivo'
}
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[2px]"
    @click.self="closeModal"
  >
    <div class="card-panel w-full max-w-4xl overflow-hidden">
      <header class="border-b border-line/60 bg-surface-elevated/75 px-5 py-4 sm:px-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-default">Telemetria del dispositivo</h3>
              <span class="inline-flex items-center gap-1 rounded-full bg-success/18 px-2 py-0.5 text-[11px] font-semibold text-success">
                <span class="h-1.5 w-1.5 rounded-full bg-success" />
                En vivo
              </span>
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ props.device?.name ?? 'Dispositivo no disponible' }}
            </p>
            <p v-if="props.device" class="mt-1 text-xs text-muted">
              {{ props.device.id }} - {{ props.device.accessPoint }}
            </p>
          </div>

          <button
            type="button"
            class="btn-secondary px-3 py-1.5 text-sm"
            @click="closeModal"
          >
            Cerrar
          </button>
        </div>
      </header>

      <div class="p-5 sm:p-6">
        <div v-if="props.device" class="grid gap-3 sm:grid-cols-3">
          <article class="panel-soft p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Estado</p>
            <div class="mt-2">
              <StatusBadge :value="props.device.status" />
            </div>
          </article>

          <article class="panel-soft p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Senal</p>
            <p class="mt-2 text-2xl font-semibold text-default">{{ props.device.signal }}%</p>
          </article>

          <article class="panel-soft p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Ultimo update</p>
            <p class="mt-2 text-sm font-semibold text-default">
              {{ formatDateTime(props.device.lastSeen) }}
            </p>
          </article>
        </div>

        <div v-if="telemetry && props.device" class="mt-4 grid gap-3 sm:grid-cols-2">
          <article class="panel-soft p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Barrera</p>
            <div class="mt-2">
              <StatusBadge :value="formatBarrierStatus(telemetry.barrierStatus)" />
            </div>
          </article>

          <article class="panel-soft p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Cruce detectado</p>
            <p class="mt-2 text-sm font-semibold text-default">
              {{ formatCrossingLabel(telemetry.crossingDirection) }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Estado: {{ formatCrossingState(telemetry.crossingState) }}
            </p>
          </article>

          <article class="panel-soft p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Sensor entrada</p>
            <p class="mt-2 text-sm font-semibold text-default">
              Distancia: {{ formatDistance(telemetry.entryDistanceCm) }}
            </p>
            <div class="mt-1">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="sensorBadgeClass(telemetry.entrySensorActive)"
              >
                {{ sensorBadgeLabel(telemetry.entrySensorActive) }}
              </span>
            </div>
          </article>

          <article class="panel-soft p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Sensor salida</p>
            <p class="mt-2 text-sm font-semibold text-default">
              Distancia: {{ formatDistance(telemetry.exitDistanceCm) }}
            </p>
            <div class="mt-1">
              <span
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="sensorBadgeClass(telemetry.exitSensorActive)"
              >
                {{ sensorBadgeLabel(telemetry.exitSensorActive) }}
              </span>
            </div>
          </article>

          <article class="panel-soft p-3 sm:col-span-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Uptime</p>
            <p class="mt-2 text-sm font-semibold text-default">
              {{ formatUptime(telemetry.uptimeMs) }}
            </p>
          </article>
        </div>

        <p
          v-else
          class="panel-soft mt-4 px-3 py-2 text-sm text-muted"
        >
          Este dispositivo aun no reporta telemetria.
        </p>

        <p class="mt-4 text-xs text-muted">
          Actualizacion en vivo: el modal se refresca automaticamente con cada evento del ESP32.
        </p>
      </div>
    </div>
  </div>
</template>
