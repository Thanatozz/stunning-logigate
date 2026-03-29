<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: 'supervisor@planta.cl',
  password: 'demo123',
})
const errorMessage = ref('')
const isSubmitting = ref(false)

async function submit() {
  isSubmitting.value = true
  errorMessage.value = ''

  await new Promise((resolve) => setTimeout(resolve, 350))
  const ok = authStore.login(form.email, form.password)

  if (!ok) {
    errorMessage.value = 'Credenciales no validas. Usa una cuenta de demostracion.'
    isSubmitting.value = false
    return
  }

  router.push({ name: 'dashboard' })
}
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-slate-950 text-white">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,91,255,0.35),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(29,157,95,0.22),transparent_35%)]" />

    <div class="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-8">
      <div class="grid w-full gap-6 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur md:grid-cols-2 md:p-8">
        <section class="order-2 rounded-2xl border border-white/10 bg-black/20 p-5 md:order-1 md:p-6">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Sistema IoT industrial</p>
          <h1 class="mt-3 font-heading text-2xl font-semibold md:text-3xl">Control de acceso vehicular en planta</h1>
          <p class="mt-3 text-sm text-slate-100/90">
            Monitorea ingresos y salidas con OCR de patentes, sensores en campo y estado operativo en tiempo real.
          </p>

          <ul class="mt-5 space-y-2 text-sm text-slate-200">
            <li>• Deteccion por sensor IR + camara ESP32-CAM</li>
            <li>• Registro de eventos con trazabilidad operativa</li>
            <li>• Alertas, reportes y control de barrera</li>
          </ul>

          <div class="mt-6 rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-slate-100">
            <p class="font-medium">Cuentas demo:</p>
            <p class="mt-1">Admin: <span class="font-semibold">admin@planta.cl</span></p>
            <p>Supervisor: <span class="font-semibold">supervisor@planta.cl</span></p>
            <p class="mt-1 opacity-80">La clave puede ser cualquiera en este MVP.</p>
          </div>
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
