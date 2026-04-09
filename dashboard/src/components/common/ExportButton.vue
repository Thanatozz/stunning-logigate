<script setup lang="ts">
defineProps<{
  label: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="btn-secondary rounded-xl px-3 py-2 text-sm font-medium"
    @click="emit('click')"
  >
    {{ label }}
  </button>
</template>
