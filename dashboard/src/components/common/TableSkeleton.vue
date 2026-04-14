<script setup lang="ts">
import { computed } from 'vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'

const props = withDefaults(
  defineProps<{
    columns?: number
    rows?: number
    showHeader?: boolean
  }>(),
  {
    columns: 6,
    rows: 7,
    showHeader: true,
  },
)

const columnIndexes = computed(() =>
  Array.from({ length: Math.max(1, props.columns) }, (_, index) => index),
)
const rowIndexes = computed(() =>
  Array.from({ length: Math.max(1, props.rows) }, (_, index) => index),
)
const mobileColumnIndexes = computed(() =>
  columnIndexes.value.slice(0, Math.min(3, columnIndexes.value.length)),
)

function widthClass(row: number, column: number) {
  const sizes = ['w-20', 'w-24', 'w-28', 'w-32', 'w-36']
  return sizes[(row + column) % sizes.length]
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <div class="hidden md:block overflow-auto rounded-xl border border-line">
      <table class="min-w-full border-collapse bg-panel">
        <thead v-if="showHeader">
          <tr class="bg-surface-elevated">
            <th v-for="column in columnIndexes" :key="`head-${column}`" class="border-b border-line px-3 py-3">
              <SkeletonBlock height-class="h-3" width-class="w-24" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rowIndexes" :key="`row-${row}`" class="border-b border-line last:border-b-0">
            <td v-for="column in columnIndexes" :key="`cell-${row}-${column}`" class="px-3 py-3">
              <SkeletonBlock :width-class="widthClass(row, column)" height-class="h-3.5" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="space-y-3 md:hidden">
      <article v-for="row in rowIndexes.slice(0, 4)" :key="`mobile-${row}`" class="rounded-xl border border-line bg-panel p-3">
        <div v-for="column in mobileColumnIndexes" :key="`mobile-cell-${row}-${column}`" class="mb-2 last:mb-0">
          <SkeletonBlock height-class="h-3" width-class="w-16" />
          <SkeletonBlock class="mt-1.5" :width-class="widthClass(row, column)" height-class="h-3.5" />
        </div>
      </article>
    </div>
  </section>
</template>
