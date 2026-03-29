<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'

const props = defineProps<{
  currentCount: number
  maxCapacity: number
}>()

const safeCapacity = computed(() => Math.max(1, props.maxCapacity))

const freeSlots = computed(() => Math.max(0, props.maxCapacity - props.currentCount))

const availablePercent = computed(() =>
  Math.round((freeSlots.value / safeCapacity.value) * 100),
)

const statusText = computed(() => {
  if (availablePercent.value <= 15) return 'Capacidad critica: considera desviar ingresos.'
  if (availablePercent.value <= 35) return 'Capacidad en rango de precaucion.'
  return 'Capacidad estable para recibir camiones.'
})

const barClass = computed(() => {
  if (availablePercent.value <= 15) return 'bg-danger'
  if (availablePercent.value <= 35) return 'bg-warning'
  return 'bg-success'
})
</script>

<template>
  <AppCard class="flex min-h-[11.5rem] flex-col justify-between">
    <div>
      <h3 class="text-sm font-semibold">Cupos libres</h3>
      <div class="mt-3 flex items-end justify-between">
        <p class="text-3xl font-semibold text-ink">{{ freeSlots }}</p>
        <p class="text-xs text-muted">de {{ maxCapacity }} totales</p>
      </div>
      <p class="mt-1 text-sm text-muted">{{ availablePercent }}% disponible</p>
    </div>

    <div class="mt-4">
      <div class="h-2 w-full rounded-full bg-line/70">
        <div
          class="h-2 rounded-full transition-all duration-300"
          :class="barClass"
          :style="{ width: `${availablePercent}%` }"
        />
      </div>
      <p class="mt-2 text-xs text-muted">{{ statusText }}</p>
    </div>
  </AppCard>
</template>
