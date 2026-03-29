<script setup lang="ts">
const props = defineProps<{
  value: string
}>()

const classByStatus: Record<string, string> = {
  online: 'bg-green-100 text-green-800',
  offline: 'bg-slate-200 text-slate-700',
  degradado: 'bg-amber-100 text-amber-800',
  activa: 'bg-red-100 text-red-700',
  resuelta: 'bg-green-100 text-green-700',
  ignorada: 'bg-slate-200 text-slate-700',
  autorizado: 'bg-green-100 text-green-700',
  observacion: 'bg-amber-100 text-amber-700',
  bloqueado: 'bg-red-100 text-red-700',
  activo: 'bg-green-100 text-green-700',
  suspendido: 'bg-slate-200 text-slate-700',
  abierta: 'bg-green-100 text-green-700',
  cerrada: 'bg-slate-200 text-slate-700',
  en_transicion: 'bg-amber-100 text-amber-700',
  ingreso: 'bg-sky-100 text-sky-700',
  salida: 'bg-violet-100 text-violet-700',
}

const labelByStatus: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  degradado: 'Degradado',
  activa: 'Activa',
  resuelta: 'Resuelta',
  ignorada: 'Ignorada',
  autorizado: 'Autorizado',
  observacion: 'Observacion',
  bloqueado: 'Bloqueado',
  activo: 'Activo',
  suspendido: 'Suspendido',
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  en_transicion: 'En transicion',
  ingreso: 'Ingreso',
  salida: 'Salida',
}
</script>

<template>
  <span
    class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
    :class="classByStatus[props.value] ?? 'bg-slate-100 text-slate-700'"
  >
    {{ labelByStatus[props.value] ?? props.value }}
  </span>
</template>
