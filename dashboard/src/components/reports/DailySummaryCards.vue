<script setup lang="ts">
import type { DailySummary } from '@/types/domain'
import { formatMinutes } from '@/composables/useKpi'
import AppCard from '@/components/common/AppCard.vue'

defineProps<{
  summary: DailySummary
}>()
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <AppCard>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Ingresos</p>
      <p class="mt-2 text-xl font-semibold">{{ summary.totalEntries }}</p>
    </AppCard>
    <AppCard>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Salidas</p>
      <p class="mt-2 text-xl font-semibold">{{ summary.totalExits }}</p>
    </AppCard>
    <AppCard>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Tiempo promedio</p>
      <p class="mt-2 text-xl font-semibold">{{ formatMinutes(summary.avgStayMinutes) }}</p>
    </AppCard>
    <AppCard>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Hora pico</p>
      <p class="mt-2 text-xl font-semibold">{{ summary.peakHour }}</p>
    </AppCard>
    <AppCard>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Ocupación media</p>
      <p class="mt-2 text-xl font-semibold">{{ summary.occupancyRate }}%</p>
    </AppCard>
  </div>
</template>
