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
      class="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
      @click="emit('select', action.value)"
    >
      {{ action.label }}
    </button>
  </div>
</template>
