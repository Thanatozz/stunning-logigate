<script setup lang="ts">
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

withDefaults(
  defineProps<{
    title: string
    subtitle: string
    isRunning: boolean
    lastScenarioLabel: string
    lastRunLabel?: string
    isLoading: boolean
    error?: string
  }>(),
  {
    lastRunLabel: '',
    error: '',
  },
)

const emit = defineEmits<{
  retry: []
  toggleDemo: []
  triggerEvent: []
}>()
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader :title="title" :subtitle="subtitle">
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full px-2 py-1 text-xs font-medium" :class="isRunning ? 'badge-success' : 'badge-neutral'">
            {{ isRunning ? 'Modo demo IoT activo' : 'Modo demo IoT detenido' }}
          </span>
          <button
            type="button"
            class="btn-secondary px-2.5 py-1.5 text-xs font-medium"
            @click="emit('toggleDemo')"
          >
            {{ isRunning ? 'Pausar demo' : 'Activar demo' }}
          </button>
          <button
            type="button"
            class="btn-secondary px-2.5 py-1.5 text-xs font-medium"
            @click="emit('triggerEvent')"
          >
            Simular evento
          </button>
        </div>
      </template>
    </AppSectionHeader>

    <section class="panel-soft px-3 py-2 text-xs text-muted">
      Ultimo evento IoT: {{ lastScenarioLabel }}<span v-if="lastRunLabel"> · {{ lastRunLabel }}</span>
    </section>

    <section v-if="isLoading" class="card-panel p-5">
      <LoadingState />
    </section>

    <section v-else-if="error" class="card-panel p-5">
      <ErrorState
        title="Fallo de actualizacion"
        :message="error"
        action-text="Reintentar sincronizacion"
        @retry="emit('retry')"
      />
    </section>

    <template v-else>
      <slot />
    </template>
  </div>
</template>