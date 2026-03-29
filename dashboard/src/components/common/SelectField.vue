<script setup lang="ts">
const model = defineModel<string>({ default: '' })

defineProps<{
  options: Array<{ label: string; value: string }>
  placeholder?: string
}>()
</script>

<template>
  <select
    v-model="model"
    class="w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink outline-none ring-accent transition focus:ring-2"
  >
    <option value="">{{ placeholder ?? 'Todos' }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
