<script setup lang="ts">
import SeverityBadge from '@/components/common/SeverityBadge.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Alert } from '@/types/domain'
import { formatDateTime } from '@/composables/useKpi'

defineProps<{
  alerts: Alert[]
}>()
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 class="mb-3 text-sm font-semibold">Alertas activas</h3>

    <div v-if="alerts.length" class="space-y-3">
      <article
        v-for="alert in alerts"
        :key="alert.id"
        class="rounded-xl border border-line bg-slate-50 p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <SeverityBadge :severity="alert.severity" />
          <StatusBadge :value="alert.status" />
        </div>
        <p class="mt-2 text-sm font-medium text-ink">{{ alert.description }}</p>
        <p class="mt-1 text-xs text-muted">{{ formatDateTime(alert.timestamp) }} · {{ alert.source }}</p>
      </article>
    </div>

    <EmptyState
      v-else
      title="Sin alertas activas"
      message="No hay eventos críticos en este momento."
    />
  </section>
</template>
