<script setup lang="ts">
defineProps<{
  title?: string
  message?: string
}>()
</script>

<template>
  <div class="rounded-xl border border-dashed border-line bg-surface-elevated p-6 text-center">
    <h3 class="font-medium text-ink">{{ title ?? 'Sin resultados' }}</h3>
    <p class="mt-2 text-sm text-muted">
      {{ message ?? 'No se encontraron coincidencias para los filtros seleccionados.' }}
    </p>
  </div>
</template>
