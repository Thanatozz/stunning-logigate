<script setup lang="ts">
import type { AuditLogRow } from '@/data/mock/users'
import { formatDateTime } from '@/composables/useKpi'

defineProps<{
  rows: AuditLogRow[]
}>()
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 class="text-sm font-semibold">Auditoria reciente</h3>
    <ul class="mt-3 space-y-2">
      <li
        v-for="row in rows"
        :key="row.id"
        class="rounded-xl border border-line bg-slate-50 px-3 py-2"
      >
        <p class="text-sm font-medium text-ink">{{ row.action }}</p>
        <p class="mt-1 text-xs text-muted">{{ row.actor }} · {{ row.target }}</p>
        <p class="mt-1 text-[11px] text-muted">{{ formatDateTime(row.timestamp) }}</p>
      </li>
    </ul>
  </section>
</template>
