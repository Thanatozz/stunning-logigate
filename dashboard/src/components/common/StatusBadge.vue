<script setup lang="ts">
const props = defineProps<{
  value: string
}>()

const classByStatus: Record<string, string> = {
  online: 'badge-success',
  offline: 'badge-neutral',
  degradado: 'badge-warning',
  activa: 'badge-danger',
  resuelta: 'badge-success',
  ignorada: 'badge-neutral',
  autorizado: 'badge-success',
  observacion: 'badge-warning',
  bloqueado: 'badge-danger',
  activo: 'badge-success',
  suspendido: 'badge-neutral',
  abierta: 'badge-success',
  cerrada: 'badge-neutral',
  en_transicion: 'badge-warning',
  ingreso: 'badge-info',
  salida: 'badge-info',
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
    :class="classByStatus[props.value] ?? 'badge-neutral'"
  >
    {{ labelByStatus[props.value] ?? props.value }}
  </span>
</template>
