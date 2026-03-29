<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
    <div class="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h3 class="text-base font-semibold">{{ title }}</h3>
      <p class="mt-2 text-sm text-muted">{{ message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-line px-3 py-2 text-sm"
          @click="emit('cancel')"
        >
          {{ cancelText ?? 'Cancelar' }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white"
          @click="emit('confirm')"
        >
          {{ confirmText ?? 'Confirmar' }}
        </button>
      </div>
    </div>
  </div>
</template>
