<script setup lang="ts">
defineProps<{
  title?: string
  message: string
  actionText?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
    <h3 class="font-semibold text-red-800">{{ title ?? 'Error de operacion' }}</h3>
    <p class="mt-2 text-sm text-red-700">{{ message }}</p>
    <button
      type="button"
      class="mt-4 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
      @click="emit('retry')"
    >
      {{ actionText ?? 'Reintentar' }}
    </button>
  </div>
</template>
