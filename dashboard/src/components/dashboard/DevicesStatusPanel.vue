<script setup lang="ts">
import DeviceStatusChip from '@/components/dashboard/DeviceStatusChip.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Device } from '@/types/domain'

defineProps<{
  devices: Device[]
}>()

const emit = defineEmits<{
  'select-device': [deviceId: string]
}>()

function onSelectDevice(deviceId: string) {
  emit('select-device', deviceId)
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 class="mb-3 text-sm font-semibold">Dispositivos y sensores</h3>
    <div v-if="devices.length" class="space-y-2.5">
      <DeviceStatusChip
        v-for="device in devices"
        :key="device.id"
        :device="device"
        @select="onSelectDevice"
      />
    </div>
    <EmptyState
      v-else
      title="Sin dispositivos registrados"
      message="Agrega un dispositivo para iniciar el monitoreo."
    />
  </section>
</template>
