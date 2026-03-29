<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <button
    type="button"
    class="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
  >
    {{ label }}
  </button>
</template>
