<script setup lang="ts">
defineProps<{
  actions: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{
  select: [value: string]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="action in actions"
      :key="action.value"
      type="button"
      class="btn-secondary px-2.5 py-1.5 text-xs font-medium"
      @click="emit('select', action.value)"
    >
      {{ action.label }}
    </button>
  </div>
</template>
