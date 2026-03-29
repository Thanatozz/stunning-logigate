<script setup lang="ts">
const model = defineModel<string>({ default: '' })

defineProps<{
  placeholder?: string
}>()
</script>

<template>
  <label class="relative block">
    <span class="sr-only">Buscar</span>
    <input
      v-model="model"
      type="search"
      class="w-full rounded-xl border border-line bg-panel py-2.5 pl-3 pr-3 text-sm text-ink outline-none ring-accent transition focus:ring-2"
      :placeholder="placeholder ?? 'Buscar...'"
    />
  </label>
</template>
