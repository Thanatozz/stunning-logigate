<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: 'admin@logigate.cl',
  password: '',
})
const errorMessage = ref('')
const isSubmitting = ref(false)

async function submit() {
  isSubmitting.value = true
  errorMessage.value = ''

  await new Promise((resolve) => setTimeout(resolve, 350))
  const ok = await authStore.login(form.email, form.password)

  if (!ok) {
    errorMessage.value = authStore.lastLoginError || 'No se pudo iniciar sesion.'
    isSubmitting.value = false
    return
  }

  form.password = ''
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-slate-950 text-white">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,91,255,0.35),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(29,157,95,0.22),transparent_35%)]" />

    <div class="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-8">
      <div class="grid w-full gap-6 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur md:grid-cols-2 md:p-8">
        <section
          class="order-2 rounded-2xl border border-sky-200/10 bg-gradient-to-br from-[#0b1225]/90 via-[#111a34]/80 to-[#0a142b]/85 p-5 md:order-1 md:p-6"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Plataforma LogiGate</p>
          <h1 class="mt-3 font-heading text-2xl font-semibold md:text-3xl">Control de acceso vehicular en planta</h1>
          <p class="mt-3 text-sm text-slate-100/90">
            Accede con correo y contrasena para operar monitoreo en tiempo real, alertas y control de barrera con
            permisos por rol.
          </p>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <article class="rounded-xl border border-white/10 bg-white/5 p-3">
              <p class="text-xs uppercase tracking-wide text-sky-200/90">Monitoreo</p>
              <p class="mt-1 text-sm text-slate-100">Ingreso/salida con OCR, sensores IR y estado de acceso.</p>
            </article>
            <article class="rounded-xl border border-white/10 bg-white/5 p-3">
              <p class="text-xs uppercase tracking-wide text-sky-200/90">Seguridad</p>
              <p class="mt-1 text-sm text-slate-100">Autenticacion con contrasena, sesion protegida y control por rol.</p>
            </article>
          </div>

          <ul class="mt-6 space-y-2 text-sm text-slate-200">
            <li class="flex items-start gap-2">
              <span class="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>Deteccion por sensor IR + camara ESP32-CAM</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>Registro de eventos con trazabilidad operativa</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>Alertas, reportes y control de barrera en un solo panel</span>
            </li>
          </ul>
        </section>

        <section class="order-1 rounded-2xl bg-white p-5 text-ink shadow-soft md:order-2 md:p-6">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Acceso seguro</p>
          <h2 class="mt-2 font-heading text-2xl font-semibold">Iniciar sesion</h2>
          <p class="mt-1 text-sm text-muted">Ingresa para ver el estado operativo de la planta.</p>

          <form class="mt-5 space-y-4" @submit.prevent="submit">
            <label class="block space-y-1">
              <span class="text-xs font-semibold uppercase text-muted">Correo</span>
              <input
                v-model="form.email"
                type="email"
                required
                class="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
                placeholder="usuario@planta.cl"
              />
            </label>

            <label class="block space-y-1">
              <span class="text-xs font-semibold uppercase text-muted">Contrasena</span>
              <input
                v-model="form.password"
                type="password"
                required
                class="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
                placeholder="••••••••"
              />
            </label>

            <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {{ errorMessage }}
            </p>

            <button
              type="submit"
              class="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0849d6] disabled:cursor-not-allowed disabled:opacity-70"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Validando acceso...' : 'Ingresar al dashboard' }}
            </button>
          </form>
        </section>
      </div>
    </div>
  </main>
</template>
