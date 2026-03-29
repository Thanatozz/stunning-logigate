<script setup lang="ts">
const props = defineProps<{
  severity: 'critical' | 'warning' | 'info'
}>()

const map = {
  critical: { label: 'Critica', classes: 'badge-danger' },
  warning: { label: 'Media', classes: 'badge-warning' },
  info: { label: 'Informativa', classes: 'badge-info' },
}
</script>

<template>
  <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="map[props.severity].classes">
    {{ map[props.severity].label }}
  </span>
</template>
