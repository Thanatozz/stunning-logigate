<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import SettingsForm from '@/components/settings/SettingsForm.vue'
import { useSettingsStore } from '@/stores/settings.store'
import type { SystemSettings } from '@/types/domain'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const pointName = ref('')
const pointLocation = ref('')

const model = computed<SystemSettings>({
  get: () => settings.value,
  set: (value) => {
    settings.value = value
  },
})

function addAccessPoint() {
  const cleanName = pointName.value.trim()
  const cleanLocation = pointLocation.value.trim()
  if (!cleanName || !cleanLocation) {
    return
  }
  settingsStore.addAccessPoint(cleanName, cleanLocation)
  pointName.value = ''
  pointLocation.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Configuracion del sistema"
      subtitle="Ajusta umbrales operativos, OCR y reglas de acceso de la planta."
    />

    <SettingsForm v-model="model" />

    <section class="card-panel p-4 sm:p-5">
      <h3 class="text-sm font-semibold">Agregar punto de acceso</h3>
      <p class="mt-1 text-sm text-muted">Disponible para administradores en este MVP.</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          v-model="pointName"
          type="text"
          placeholder="Nombre (ej: Porton Este)"
          class="rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
        />
        <input
          v-model="pointLocation"
          type="text"
          placeholder="Ubicacion"
          class="rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
        />
        <button
          type="button"
          class="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0849d6]"
          @click="addAccessPoint"
        >
          Agregar punto
        </button>
      </div>
    </section>
  </div>
</template>
