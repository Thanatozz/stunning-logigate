<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { UserAdminRow } from '@/data/mock/users'
import type { CreateUserPayload } from '@/stores/users.store'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: CreateUserPayload]
}>()

const form = reactive<CreateUserPayload>({
  name: '',
  email: '',
  role: 'supervisor',
  password: '',
})
const confirmPassword = ref('')

const localError = ref('')

function reset() {
  form.name = ''
  form.email = ''
  form.role = 'supervisor'
  form.password = ''
  confirmPassword.value = ''
  localError.value = ''
}

function onClose() {
  reset()
  emit('close')
}

function onSubmit() {
  if (!form.name.trim() || !form.email.trim()) {
    localError.value = 'Completa nombre y correo.'
    return
  }
  if (!form.email.includes('@')) {
    localError.value = 'Ingresa un correo valido.'
    return
  }
  if (form.password.length < 8) {
    localError.value = 'La contrasena debe tener al menos 8 caracteres.'
    return
  }
  if (form.password !== confirmPassword.value) {
    localError.value = 'Las contrasenas no coinciden.'
    return
  }
  emit('save', {
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role as UserAdminRow['role'],
    password: form.password,
  })
  reset()
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
    <div class="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h3 class="text-lg font-semibold">Nuevo usuario</h3>
      <p class="mt-1 text-sm text-muted">Crea usuario con correo, rol y contrasena para acceso real en Firebase Auth.</p>

      <form class="mt-4 space-y-3" @submit.prevent="onSubmit">
        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Nombre</span>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            placeholder="Nombre completo"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Correo</span>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            placeholder="usuario@planta.cl"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Rol</span>
          <select
            v-model="form.role"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          >
            <option value="admin">Administrador</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Contrasena</span>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="8"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            placeholder="Minimo 8 caracteres"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase text-muted">Confirmar contrasena</span>
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            class="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            placeholder="Repite la contrasena"
          />
        </label>

        <p v-if="localError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ localError }}
        </p>

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-2 text-sm"
            @click="onClose"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white"
          >
            Guardar usuario
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
