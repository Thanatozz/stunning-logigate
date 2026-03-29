<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { Device } from '@/types/domain'
import { formatDateTime } from '@/composables/useKpi'

defineProps<{
  device: Device
}>()
</script>

<template>
  <article class="panel-soft p-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium">{{ device.name }}</p>
      <StatusBadge :value="device.status" />
    </div>
    <p class="mt-1 text-xs text-muted">{{ device.accessPoint }}</p>
    <div class="mt-2 flex items-center justify-between text-xs text-muted">
      <span>Señal: {{ device.signal }}%</span>
      <span>{{ formatDateTime(device.lastSeen) }}</span>
    </div>
  </article>
</template>
