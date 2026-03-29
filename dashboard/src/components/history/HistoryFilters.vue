<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import SelectField from '@/components/common/SelectField.vue'

const plate = defineModel<string>('plate', { default: '' })
const company = defineModel<string>('company', { default: '' })
const accessPoint = defineModel<string>('accessPoint', { default: '' })
const dateFrom = defineModel<string>('dateFrom', { default: '' })
const dateTo = defineModel<string>('dateTo', { default: '' })

defineProps<{
  companyOptions: Array<{ label: string; value: string }>
  pointOptions: Array<{ label: string; value: string }>
}>()
</script>

<template>
  <FilterBar>
    <div class="lg:col-span-4">
      <SearchInput v-model="plate" placeholder="Filtrar por patente" />
    </div>
    <div class="lg:col-span-3">
      <SelectField v-model="company" :options="companyOptions" placeholder="Empresa" />
    </div>
    <div class="lg:col-span-3">
      <SelectField v-model="accessPoint" :options="pointOptions" placeholder="Punto de acceso" />
    </div>
    <div class="lg:col-span-2">
      <DateRangePicker v-model:from="dateFrom" v-model:to="dateTo" />
    </div>
  </FilterBar>
</template>
