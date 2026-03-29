<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <button
    type="button"
    class="btn-secondary rounded-xl px-3 py-2 text-sm font-medium"
  >
    {{ label }}
  </button>
</template>
