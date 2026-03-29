<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 class="text-lg font-semibold text-ink sm:text-xl">{{ title }}</h2>
      <p v-if="subtitle" class="subtle-text mt-1">{{ subtitle }}</p>
    </div>
    <slot name="actions" />
  </header>
</template>
