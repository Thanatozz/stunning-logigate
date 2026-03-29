<script setup lang="ts">
import { computed } from 'vue'
import { useResponsiveTable } from '@/composables/useResponsiveTable'

export interface DataTableColumn {
  key: string
  label: string
}

type DataTableRow = object

const props = defineProps<{
  columns: DataTableColumn[]
  rows: DataTableRow[]
  rowKey: string
}>()

const { isMobileTable } = useResponsiveTable()

const safeRows = computed(() => props.rows ?? [])

function readCell(row: DataTableRow, key: string) {
  return (row as Record<string, unknown>)[key] ?? '-'
}

function readRowKey(row: DataTableRow) {
  const value = (row as Record<string, unknown>)[props.rowKey]
  return value == null ? '' : String(value)
}
</script>

<template>
  <div v-if="!isMobileTable" class="overflow-auto rounded-xl border border-line">
    <table class="min-w-full border-collapse bg-panel text-left text-sm text-ink">
      <thead>
        <tr class="bg-surface-elevated">
          <th
            v-for="column in props.columns"
            :key="column.key"
            class="border-b border-line px-3 py-2 font-semibold text-ink"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in safeRows" :key="readRowKey(row)" class="border-b border-line last:border-b-0">
          <td v-for="column in props.columns" :key="column.key" class="px-3 py-2 text-muted">
            <slot :name="`cell-${column.key}`" :row="row">
              {{ readCell(row, column.key) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-else class="space-y-3">
    <article
      v-for="row in safeRows"
      :key="readRowKey(row)"
      class="rounded-xl border border-line bg-panel p-3"
    >
      <div v-for="column in props.columns" :key="column.key" class="mb-2 last:mb-0">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ column.label }}</p>
        <div class="mt-1 text-sm text-ink">
          <slot :name="`cell-${column.key}`" :row="row">
            {{ readCell(row, column.key) }}
          </slot>
        </div>
      </div>
    </article>
  </div>
</template>
