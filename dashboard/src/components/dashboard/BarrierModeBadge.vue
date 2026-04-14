<script setup lang="ts">
import { computed } from 'vue'
import type { BarrierMode } from '@/types/domain'

const props = defineProps<{
  mode: BarrierMode
}>()

const isAutomaticEnabled = computed(() => props.mode === 'automatico')
const label = computed(() => (isAutomaticEnabled.value ? 'Automatico activado' : 'Automatico desactivado'))
</script>

<template>
  <span
    class="rounded-full px-2.5 py-1 text-xs font-medium"
    :class="
      isAutomaticEnabled
        ? 'bg-success/15 text-success'
        : 'bg-slate-500/15 text-slate-300'
    "
  >
    {{ label }}
  </span>
</template>
