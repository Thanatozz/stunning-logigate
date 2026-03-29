<script setup lang="ts">
import type { RecentActivityItem } from '@/types/domain'
import { formatDateTime } from '@/composables/useKpi'

defineProps<{
  items: RecentActivityItem[]
}>()

const levelClasses = {
  normal: 'bg-slate-100 text-slate-700',
  info: 'bg-sky-100 text-sky-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 class="mb-3 text-sm font-semibold">Actividad reciente</h3>
    <ul class="space-y-2.5">
      <li v-for="item in items" :key="item.id" class="rounded-xl border border-line bg-slate-50 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-ink">{{ item.title }}</p>
          <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="levelClasses[item.level]">
            {{ item.level === 'normal' ? 'Normal' : item.level }}
          </span>
        </div>
        <p class="mt-1 text-xs text-muted">{{ item.detail }}</p>
        <p class="mt-1 text-[11px] text-muted">{{ formatDateTime(item.timestamp) }}</p>
      </li>
    </ul>
  </section>
</template>
