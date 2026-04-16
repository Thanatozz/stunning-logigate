<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import BarrierModeBadge from '@/components/dashboard/BarrierModeBadge.vue'
import type { BarrierMode, BarrierState } from '@/types/domain'
import { formatDateTime } from '@/composables/useKpi'

const props = defineProps<{
  barrier: BarrierState
  canControl: boolean
  commandLog: string[]
  targetAccessPointKey: string
  targetAccessPointLabel: string
}>()

const emit = defineEmits<{
  mode: [mode: BarrierMode]
  open: []
  close: []
}>()

const modeOptions: Array<{ label: string; value: BarrierMode }> = [
  { label: 'Automatico activado', value: 'automatico' },
  { label: 'Automatico desactivado', value: 'manual_remoto' },
]

const isAutomaticEnabled = computed(() => props.barrier.mode === 'automatico')

function isModeSelected(optionMode: BarrierMode) {
  if (optionMode === 'automatico') return isAutomaticEnabled.value
  return !isAutomaticEnabled.value
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold">
        Control de barrera
        <span class="text-muted">· {{ props.targetAccessPointLabel }}</span>
      </h3>
      <div class="flex items-center gap-2">
        <StatusBadge :value="props.barrier.status" />
        <BarrierModeBadge :mode="props.barrier.mode" />
      </div>
    </div>

    <p class="mt-2 text-xs text-muted">
      Ultima accion: {{ formatDateTime(props.barrier.lastActionAt) }} · {{ props.barrier.lastActionBy }}
    </p>
    <p class="mt-1 text-xs text-muted">
      Barrera objetivo: {{ props.targetAccessPointKey }}
    </p>

    <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        v-for="option in modeOptions"
        :key="option.value"
        type="button"
        class="rounded-lg border px-3 py-2 text-sm transition"
        :class="
          isModeSelected(option.value)
            ? 'border-accent bg-accent text-white'
            : 'btn-secondary'
        "
        :disabled="!props.canControl"
        @click="emit('mode', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg bg-success px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!props.canControl"
        @click="emit('open')"
      >
        Abrir {{ props.targetAccessPointLabel }}
      </button>
      <button
        type="button"
        class="btn-secondary px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!props.canControl"
        @click="emit('close')"
      >
        Cerrar {{ props.targetAccessPointLabel }}
      </button>
    </div>

    <div class="mt-4 border-t border-line pt-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Bitacora de comandos</p>
      <ul class="mt-2 space-y-1">
        <li
          v-for="(entry, index) in props.commandLog.slice(0, 6)"
          :key="`${entry}-${index}`"
          class="text-xs text-muted"
        >
          {{ entry }}
        </li>
      </ul>
    </div>
  </section>
</template>
