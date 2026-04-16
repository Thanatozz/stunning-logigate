<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatDateTime } from '@/composables/useKpi'
import type { Device } from '@/types/domain'

const props = defineProps<{
  device: Device
}>()

const emit = defineEmits<{
  select: [deviceId: string]
}>()

function onSelect() {
  emit('select', props.device.id)
}
</script>

<template>
  <button
    type="button"
    class="panel-soft w-full p-3 text-left transition hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    @click="onSelect"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium">{{ device.name }}</p>
      <StatusBadge :value="device.status" />
    </div>
    <p class="mt-1 text-xs text-muted">{{ device.accessPoint }}</p>
    <div class="mt-2 flex items-center justify-between text-xs text-muted">
      <span>Signal: {{ device.signal }}%</span>
      <span>{{ formatDateTime(device.lastSeen) }}</span>
    </div>
  </button>
</template>
