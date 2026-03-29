<script setup lang="ts">
import type { BarrierMode } from '@/types/domain'

const props = defineProps<{
  mode: BarrierMode
}>()

const labels: Record<BarrierMode, string> = {
  automatico: 'Automático',
  manual_remoto: 'Manual remoto',
  manual_fisico: 'Manual físico',
}
</script>

<template>
  <span class="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
    {{ labels[props.mode] }}
  </span>
</template>
