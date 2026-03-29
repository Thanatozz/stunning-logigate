<script setup lang="ts">
const props = defineProps<{
  severity: 'critical' | 'warning' | 'info'
}>()

const map = {
  critical: { label: 'Crítica', classes: 'bg-red-100 text-red-700' },
  warning: { label: 'Media', classes: 'bg-amber-100 text-amber-800' },
  info: { label: 'Informativa', classes: 'bg-sky-100 text-sky-700' },
}
</script>

<template>
  <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="map[props.severity].classes">
    {{ map[props.severity].label }}
  </span>
</template>
