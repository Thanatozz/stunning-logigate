<script setup lang="ts">
import FilterBar from '@/components/common/FilterBar.vue'
import SelectField from '@/components/common/SelectField.vue'

const type = defineModel<string>('type', { default: '' })
const severity = defineModel<string>('severity', { default: '' })
const status = defineModel<string>('status', { default: '' })

const typeOptions = [
  { label: 'Exceso de camiones', value: 'exceso_camiones' },
  { label: 'Permanencia excesiva', value: 'permanencia_excesiva' },
  { label: 'Dispositivo offline', value: 'dispositivo_offline' },
  { label: 'Inconsistencia', value: 'inconsistencia' },
  { label: 'No autorizado', value: 'vehiculo_no_autorizado' },
]

const severityOptions = [
  { label: 'Crítica', value: 'critical' },
  { label: 'Media', value: 'warning' },
  { label: 'Informativa', value: 'info' },
]

const statusOptions = [
  { label: 'Activa', value: 'activa' },
  { label: 'Resuelta', value: 'resuelta' },
  { label: 'Ignorada', value: 'ignorada' },
]
</script>

<template>
  <FilterBar>
    <div class="lg:col-span-4">
      <SelectField v-model="type" :options="typeOptions" placeholder="Tipo de alerta" />
    </div>
    <div class="lg:col-span-4">
      <SelectField v-model="severity" :options="severityOptions" placeholder="Severidad" />
    </div>
    <div class="lg:col-span-4">
      <SelectField v-model="status" :options="statusOptions" placeholder="Estado" />
    </div>
  </FilterBar>
</template>
