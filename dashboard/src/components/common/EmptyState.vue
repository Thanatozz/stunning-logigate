<script setup lang="ts">
defineProps<{
  title: string
  message: string
}>()
</script>

<template>
  <div class="rounded-xl border border-dashed border-line bg-slate-50 p-6 text-center">
    <h3 class="font-medium text-ink">{{ title }}</h3>
    <p class="mt-2 text-sm text-muted">{{ message }}</p>
  </div>
</template>
