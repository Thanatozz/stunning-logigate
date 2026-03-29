<script setup lang="ts">
import AppCard from '@/components/common/AppCard.vue'
import type { OccupancyLevel } from '@/types/domain'

const props = defineProps<{
  level: OccupancyLevel
  percent: number
}>()

const levels = {
  bajo: { label: 'Ocupación baja', color: 'bg-success' },
  medio: { label: 'Ocupación media', color: 'bg-warning' },
  alto: { label: 'Ocupación alta', color: 'bg-danger' },
}
</script>

<template>
  <AppCard>
    <h3 class="text-sm font-semibold">Semáforo de ocupación</h3>
    <div class="mt-4 flex items-center gap-5">
      <div class="space-y-2">
        <div
          class="h-5 w-5 rounded-full bg-line"
          :class="props.level === 'bajo' ? levels.bajo.color : 'bg-line'"
        />
        <div
          class="h-5 w-5 rounded-full bg-line"
          :class="props.level === 'medio' ? levels.medio.color : 'bg-line'"
        />
        <div
          class="h-5 w-5 rounded-full bg-line"
          :class="props.level === 'alto' ? levels.alto.color : 'bg-line'"
        />
      </div>
      <div>
        <p class="text-xl font-semibold">{{ props.percent }}%</p>
        <p class="text-sm text-muted">{{ levels[props.level].label }}</p>
      </div>
    </div>
  </AppCard>
</template>
