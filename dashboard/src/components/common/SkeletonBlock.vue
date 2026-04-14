<script setup lang="ts">
withDefaults(
  defineProps<{
    widthClass?: string
    heightClass?: string
    roundedClass?: string
  }>(),
  {
    widthClass: 'w-full',
    heightClass: 'h-4',
    roundedClass: 'rounded-md',
  },
)
</script>

<template>
  <div
    aria-hidden="true"
    :class="['skeleton-shimmer', widthClass, heightClass, roundedClass]"
  />
</template>
