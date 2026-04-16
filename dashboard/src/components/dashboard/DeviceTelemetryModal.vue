<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatDateTime } from '@/composables/useKpi'
import { inferDeviceStatusFromHeartbeat } from '@/lib/device-health'
import type { Device, DeviceStatus } from '@/types/domain'

const props = defineProps<{
  open: boolean
  device: Device | null
}>()

const emit = defineEmits<{
  close: []
}>()

const nowMs = ref(Date.now())
let liveClock: ReturnType<typeof setInterval> | null = null

const telemetry = computed(() => props.device?.telemetry)
const effectiveStatus = computed<DeviceStatus>(() => {
  if (!props.device) return 'offline'
  return inferDeviceStatusFromHeartbeat(props.device.status, props.device.lastSeen, nowMs.value)
})
const isDeviceOnline = computed(() => effectiveStatus.value === 'online')
const signalPercent = computed(() => (isDeviceOnline.value ? clampPercent(props.device?.signal) : 0))
const disconnectedMs = computed(() => {
  if (!props.device || isDeviceOnline.value) return null
  const lastSeenMs = Date.parse(props.device.lastSeen)
  if (!Number.isFinite(lastSeenMs)) return null
  return Math.max(0, nowMs.value - lastSeenMs)
})
const disconnectedLabel = computed(() => {
  if (disconnectedMs.value === null) return '--'
  return formatDuration(disconnectedMs.value)
})

const headerStateClass = computed(() =>
  isDeviceOnline.value ? 'bg-success/16 text-success' : 'bg-danger/16 text-danger',
)
const headerDotClass = computed(() =>
  isDeviceOnline.value ? 'bg-success live-dot' : 'bg-danger offline-dot',
)

const connectionCardClasses = computed(() => [
  'telemetry-card p-3 sm:col-span-2',
  isDeviceOnline.value ? '' : 'telemetry-card-offline',
])
const connectionValueClass = computed(() => (isDeviceOnline.value ? 'text-ink' : 'text-danger'))
const connectionMetaClass = computed(() => (isDeviceOnline.value ? 'text-muted' : 'text-danger'))

type SensorUiState = 'activo' | 'inactivo' | 'desactivado'

function closeModal() {
  emit('close')
}

function startLiveClock() {
  if (liveClock) return
  liveClock = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
}

function stopLiveClock() {
  if (!liveClock) return
  clearInterval(liveClock)
  liveClock = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nowMs.value = Date.now()
      startLiveClock()
      return
    }
    stopLiveClock()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopLiveClock()
})

function formatDistance(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return `${value.toFixed(1)} cm`
}

function clampPercent(value: number | null | undefined) {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(100, Math.round(raw)))
}

function formatUptime(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'

  return formatDuration(value)
}

function formatDuration(value: number | null | undefined) {
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

function isSensorDisabled(distanceCm: number | null | undefined) {
  if (distanceCm === null || distanceCm === undefined || !Number.isFinite(distanceCm)) return false
  return distanceCm >= 998.5
}

function getSensorState(active: boolean | undefined, distanceCm: number | null | undefined): SensorUiState {
  if (isSensorDisabled(distanceCm)) return 'desactivado'
  return active ? 'activo' : 'inactivo'
}

function sensorBadgeLabel(state: SensorUiState) {
  if (state === 'activo') return 'Activo'
  if (state === 'desactivado') return 'Desactivado'
  return 'Inactivo'
}

function sensorStatusTextClass(state: SensorUiState) {
  if (state === 'activo') return 'text-success'
  if (state === 'desactivado') return 'text-warning'
  return 'text-muted'
}

function formatSensorDistance(state: SensorUiState, distanceCm: number | null | undefined) {
  if (state === 'desactivado') return '--'
  return formatDistance(distanceCm)
}

function signalToneClass(signal: number | null | undefined) {
  const percent = clampPercent(signal)
  if (percent >= 70) return 'text-success'
  if (percent >= 40) return 'text-warning'
  return 'text-danger'
}

function signalBarClass(signal: number | null | undefined) {
  const percent = clampPercent(signal)
  if (percent >= 70) return 'bg-success'
  if (percent >= 40) return 'bg-warning'
  return 'bg-danger'
}
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[3px]"
    @click.self="closeModal"
  >
    <div class="card-panel relative w-full max-w-5xl overflow-hidden">
      <div class="pointer-events-none absolute inset-0 gadget-glow opacity-70" />
      <header class="relative border-b border-line/60 bg-surface-elevated/70 px-5 py-4 sm:px-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-default">Telemetria del dispositivo</h3>
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="headerStateClass"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="headerDotClass" />
                {{ isDeviceOnline ? 'En vivo' : 'Sin conexion' }}
              </span>
            </div>
            <p class="mt-1 text-sm text-muted">
              {{ props.device?.name ?? 'Dispositivo no disponible' }}
            </p>
            <p v-if="props.device" class="mt-1 font-mono text-xs tracking-wide text-muted">
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

      <div class="relative p-5 sm:p-6">
        <div v-if="props.device" class="grid gap-3 sm:grid-cols-3">
          <article class="telemetry-card p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Estado</p>
            <div class="mt-2">
              <StatusBadge :value="effectiveStatus" />
            </div>
          </article>

          <article class="telemetry-card p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Senal</p>
            <p class="mt-2 font-mono text-2xl font-semibold" :class="signalToneClass(signalPercent)">
              {{ signalPercent }}%
            </p>
            <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line/45">
              <span
                class="block h-full rounded-full transition-all duration-700 ease-out"
                :class="signalBarClass(signalPercent)"
                :style="{ width: `${signalPercent}%` }"
              />
            </div>
          </article>

          <article class="telemetry-card p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Ultima actualizacion</p>
            <p class="mt-2 font-mono text-sm font-semibold text-default">
              {{ formatDateTime(props.device.lastSeen) }}
            </p>
          </article>
        </div>

        <div v-if="telemetry && props.device" class="mt-4 grid gap-3 sm:grid-cols-2">
          <article class="telemetry-card p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Barrera</p>
            <div class="mt-2">
              <StatusBadge :value="formatBarrierStatus(telemetry.barrierStatus)" />
            </div>
          </article>

          <article class="telemetry-card p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Cruce detectado</p>
            <p class="mt-2 text-sm font-semibold text-default">
              {{ formatCrossingLabel(telemetry.crossingDirection) }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Estado: {{ formatCrossingState(telemetry.crossingState) }}
            </p>
          </article>

          <article class="telemetry-card p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Sensor entrada</p>
            <p class="mt-2 font-mono text-lg font-semibold text-default">
              Distancia:
              {{
                formatSensorDistance(
                  getSensorState(telemetry.entrySensorActive, telemetry.entryDistanceCm),
                  telemetry.entryDistanceCm,
                )
              }}
            </p>
            <p
              class="mt-2 text-xs font-semibold uppercase tracking-wide"
              :class="sensorStatusTextClass(getSensorState(telemetry.entrySensorActive, telemetry.entryDistanceCm))"
            >
              {{ sensorBadgeLabel(getSensorState(telemetry.entrySensorActive, telemetry.entryDistanceCm)) }}
            </p>
          </article>

          <article class="telemetry-card p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Sensor salida</p>
            <p class="mt-2 font-mono text-lg font-semibold text-default">
              Distancia:
              {{
                formatSensorDistance(
                  getSensorState(telemetry.exitSensorActive, telemetry.exitDistanceCm),
                  telemetry.exitDistanceCm,
                )
              }}
            </p>
            <p
              class="mt-2 text-xs font-semibold uppercase tracking-wide"
              :class="sensorStatusTextClass(getSensorState(telemetry.exitSensorActive, telemetry.exitDistanceCm))"
            >
              {{ sensorBadgeLabel(getSensorState(telemetry.exitSensorActive, telemetry.exitDistanceCm)) }}
            </p>
          </article>

          <article :class="connectionCardClasses">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">
              {{ isDeviceOnline ? 'Tiempo activo' : 'Ultima conexion (hace)' }}
            </p>
            <p class="mt-2 font-mono text-xl font-semibold" :class="connectionValueClass">
              {{ isDeviceOnline ? formatUptime(telemetry.uptimeMs) : disconnectedLabel }}
            </p>
            <p class="mt-2 text-xs" :class="connectionMetaClass">
              {{
                isDeviceOnline
                  ? 'Conectado y transmitiendo telemetria en tiempo real.'
                  : `Tiempo activo antes de desconectar: ${formatUptime(telemetry.uptimeMs)}`
              }}
            </p>
          </article>
        </div>

        <p
          v-else
          class="telemetry-card mt-4 px-3 py-2 text-sm text-muted"
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

<style scoped>
.gadget-glow {
  background:
    radial-gradient(circle at 88% 12%, rgb(74 189 138 / 0.18), transparent 34%),
    radial-gradient(circle at 12% 0%, rgb(102 132 186 / 0.25), transparent 44%);
}

.telemetry-card {
  border-radius: 0.9rem;
  border: 1px solid rgb(var(--color-line) / 0.72);
  background: linear-gradient(
    160deg,
    rgb(var(--color-surface-elevated) / 0.95) 0%,
    rgb(var(--color-panel) / 0.9) 100%
  );
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.1),
    0 10px 18px rgb(2 6 23 / 0.1);
}

.live-dot {
  box-shadow: 0 0 0 0 rgb(74 189 138 / 0.55);
  animation: live-pulse 1.8s ease-out infinite;
}

.offline-dot {
  box-shadow: 0 0 0 0 rgb(223 107 116 / 0.58);
  animation: offline-pulse 1.8s ease-out infinite;
}

.telemetry-card-offline {
  border-color: rgb(var(--color-danger) / 0.56);
  background: linear-gradient(
    160deg,
    rgb(var(--color-danger) / 0.1) 0%,
    rgb(var(--color-panel) / 0.94) 100%
  );
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.06),
    0 14px 24px rgb(159 18 57 / 0.16);
}

.dark .telemetry-card {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.06),
    0 14px 24px rgb(0 0 0 / 0.38);
}

.dark .telemetry-card-offline {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.06),
    0 16px 26px rgb(136 19 55 / 0.35);
}

@keyframes live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(74 189 138 / 0.5);
  }
  80% {
    box-shadow: 0 0 0 8px rgb(74 189 138 / 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgb(74 189 138 / 0);
  }
}

@keyframes offline-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(223 107 116 / 0.48);
  }
  80% {
    box-shadow: 0 0 0 8px rgb(223 107 116 / 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgb(223 107 116 / 0);
  }
}
</style>
