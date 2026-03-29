<script setup lang="ts">
const from = defineModel<string>('from', { default: '' })
const to = defineModel<string>('to', { default: '' })
</script>

<template>
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <input
      v-model="from"
      type="date"
      class="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent transition focus:ring-2"
      aria-label="Fecha inicio"
    />
    <input
      v-model="to"
      type="date"
      class="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent transition focus:ring-2"
      aria-label="Fecha fin"
    />
  </div>
</template>
