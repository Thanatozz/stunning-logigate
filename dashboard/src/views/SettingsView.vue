<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppSectionHeader from '@/components/common/AppSectionHeader.vue'
import SettingsForm from '@/components/settings/SettingsForm.vue'
import { validateRequiredText } from '@/lib/field-validation'
import { normalizeAccessPointKey } from '@/lib/access-point'
import { useSettingsStore } from '@/stores/settings.store'
import type { SystemSettings } from '@/types/domain'

const settingsStore = useSettingsStore()
const { settings, syncError } = storeToRefs(settingsStore)

const pointName = ref('')
const pointLocation = ref('')
const addPointError = ref('')

const model = computed<SystemSettings>({
  get: () => settings.value,
  set: (value) => {
    settingsStore.setSettings(value)
  },
})

function addAccessPoint() {
  const cleanName = pointName.value.trim()
  const cleanLocation = pointLocation.value.trim()

  const nameError = validateRequiredText(cleanName, 'Nombre del punto', { min: 3, max: 60 })
  if (nameError) {
    addPointError.value = nameError
    return
  }

  const locationError = validateRequiredText(cleanLocation, 'Ubicacion', { min: 3, max: 80 })
  if (locationError) {
    addPointError.value = locationError
    return
  }

  const normalizedName = normalizeAccessPointKey(cleanName)
  const exists = settings.value.accessPoints.some(
    (point) => normalizeAccessPointKey(point.name) === normalizedName,
  )
  if (exists) {
    addPointError.value = 'Ya existe un punto de acceso con ese nombre.'
    return
  }

  addPointError.value = ''
  settingsStore.addAccessPoint(cleanName, cleanLocation)
  pointName.value = ''
  pointLocation.value = ''
}

onMounted(() => {
  void settingsStore.loadSettingsFromFirebase()
})
</script>

<template>
  <div class="space-y-5">
    <AppSectionHeader
      title="Configuracion del sistema"
      subtitle="Ajusta umbrales operativos, OCR y reglas de acceso de la planta."
    />

    <p
      v-if="syncError"
      class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ syncError }}
    </p>

    <SettingsForm v-model="model" />

    <section class="card-panel p-4 sm:p-5">
      <h3 class="text-sm font-semibold">Agregar punto de acceso</h3>
      <p class="mt-1 text-sm text-muted">
        Disponible para administradores en este MVP.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          v-model="pointName"
          type="text"
          maxlength="60"
          placeholder="Nombre (ej: Porton Este)"
          class="rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
        />
        <input
          v-model="pointLocation"
          type="text"
          maxlength="80"
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

      <p
        v-if="addPointError"
        class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ addPointError }}
      </p>
    </section>
  </div>
</template>
