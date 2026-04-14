<script setup lang="ts">
import { computed } from 'vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    items?: number
  }>(),
  {
    title: '',
    items: 6,
  },
)

const itemIndexes = computed(() =>
  Array.from({ length: Math.max(1, props.items) }, (_, index) => index),
)

function titleWidth(index: number) {
  const sizes = ['w-44', 'w-52', 'w-36']
  return sizes[index % sizes.length]
}

function detailWidth(index: number) {
  const sizes = ['w-full', 'w-11/12', 'w-10/12']
  return sizes[index % sizes.length]
}
</script>

<template>
  <section class="card-panel p-4 sm:p-5">
    <h3 v-if="title" class="text-sm font-semibold">{{ title }}</h3>
    <ul class="mt-3 space-y-2.5">
      <li
        v-for="item in itemIndexes"
        :key="`item-${item}`"
        class="panel-soft p-3"
      >
        <SkeletonBlock height-class="h-3.5" :width-class="titleWidth(item)" />
        <SkeletonBlock class="mt-2" height-class="h-3" :width-class="detailWidth(item)" />
        <SkeletonBlock class="mt-2" height-class="h-2.5" width-class="w-24" />
      </li>
    </ul>
  </section>
</template>
