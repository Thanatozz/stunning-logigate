<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bars3Icon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { useAlertsStore } from '@/stores/alerts.store'
import { useAuthStore } from '@/stores/auth.store'
import { useDevicesStore } from '@/stores/devices.store'
import { useThemeStore } from '@/stores/theme.store'

const emit = defineEmits<{
  menu: []
}>()

const router = useRouter()
const authStore = useAuthStore()
const alertsStore = useAlertsStore()
const devicesStore = useDevicesStore()
const themeStore = useThemeStore()
const { session } = storeToRefs(authStore)
const { isDark, label: themeLabel } = storeToRefs(themeStore)

const roleLabel = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
}

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const connectionLabel = computed(() => {
  if (devicesStore.offlineCount === 0 && devicesStore.degradedCount === 0) {
    return 'Conexion estable'
  }
  if (devicesStore.offlineCount > 0) {
    return `${devicesStore.offlineCount} dispositivo(s) offline`
  }
  return `${devicesStore.degradedCount} dispositivo(s) degradado(s)`
})

function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}

function toggleTheme() {
  themeStore.toggleMode()
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-line/70 bg-panel/90 text-ink backdrop-blur">
    <div class="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-lg border border-line p-2 text-muted lg:hidden"
          @click="emit('menu')"
        >
          <Bars3Icon class="h-5 w-5" />
        </button>
        <div>
          <h1 class="text-base font-semibold sm:text-lg">Monitoreo de acceso vehicular</h1>
          <p class="text-xs text-muted sm:text-sm">
            {{ connectionLabel }} · {{ now.toLocaleTimeString('es-CL', { hour12: false }) }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button class="relative rounded-lg border border-line p-2 text-muted" type="button" aria-label="Alertas">
          <BellIcon class="h-5 w-5" />
          <span
            v-if="alertsStore.activeAlerts.length"
            class="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white"
          >
            {{ alertsStore.activeAlerts.length }}
          </span>
        </button>

        <button
          type="button"
          class="rounded-lg border border-line p-2 text-muted transition hover:text-ink"
          :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          :title="themeLabel"
          @click="toggleTheme"
        >
          <SunIcon v-if="isDark" class="h-5 w-5" />
          <MoonIcon v-else class="h-5 w-5" />
        </button>

        <div class="hidden text-right sm:block">
          <p class="text-sm font-medium text-ink">{{ session?.name }}</p>
          <p class="text-xs text-muted">{{ session ? roleLabel[session.role] : '' }}</p>
        </div>

        <button
          type="button"
          class="rounded-lg border border-line p-2 text-muted transition hover:text-ink"
          @click="logout"
          aria-label="Cerrar sesion"
        >
          <ArrowRightOnRectangleIcon class="h-5 w-5" />
        </button>
      </div>
    </div>
  </header>
</template>
