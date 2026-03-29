<script setup lang="ts">
import AppCard from '@/components/common/AppCard.vue'

defineProps<{
  title: string
  value: string | number
  detail: string
}>()
</script>

<template>
  <AppCard>
    <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ title }}</p>
    <p class="mt-2 text-2xl font-semibold text-ink">{{ value }}</p>
    <p class="mt-1 text-sm text-muted">{{ detail }}</p>
  </AppCard>
</template>
