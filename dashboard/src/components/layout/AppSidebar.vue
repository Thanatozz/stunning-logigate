<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  BellAlertIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ClockIcon,
  HomeIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { useAlertsStore } from '@/stores/alerts.store'
import { useAuthStore } from '@/stores/auth.store'
import { useDevicesStore } from '@/stores/devices.store'

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const authStore = useAuthStore()
const alertsStore = useAlertsStore()
const devicesStore = useDevicesStore()
const { currentRole } = storeToRefs(authStore)

const items = computed(() => [
  { label: 'Resumen', to: '/', icon: HomeIcon },
  { label: 'Accesos', to: '/dashboard/access', icon: TruckIcon },
  { label: 'Control IoT', to: '/dashboard/control', icon: ShieldCheckIcon },
  { label: 'Historial', to: '/history', icon: ClockIcon },
  { label: 'Reportes', to: '/reports', icon: ChartBarIcon },
  { label: 'Alertas', to: '/alerts', icon: BellAlertIcon, badge: alertsStore.activeAlerts.length },
  { label: 'Vehiculos', to: '/vehicles', icon: TruckIcon },
  { label: 'Configuracion', to: '/settings', icon: Cog6ToothIcon, adminOnly: true },
  { label: 'Usuarios', to: '/users', icon: UserGroupIcon, adminOnly: true },
])

const onlineText = computed(
  () => `${devicesStore.connectedCount}/${devicesStore.devices.length} dispositivos en linea`,
)
</script>

<template>
  <aside class="flex h-full w-72 flex-col border-r border-line bg-white px-4 py-5 text-ink">
    <div class="mb-6 flex items-center gap-3">
      <div class="rounded-xl bg-accent/10 p-2 text-accent">
        <ShieldCheckIcon class="h-6 w-6" />
      </div>
      <div>
        <p class="font-heading text-lg font-semibold">LogiGate</p>
        <p class="text-xs text-muted">Control IoT vehicular</p>
      </div>
    </div>

    <nav class="space-y-1">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        v-show="!item.adminOnly || currentRole === 'admin'"
        :to="item.to"
        class="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted transition"
        :class="route.path === item.to ? 'border border-accent/35 bg-accent/18 text-ink' : 'hover:bg-line/20 hover:text-ink'"
        @click="emit('navigate')"
      >
        <span class="flex items-center gap-2">
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </span>
        <span
          v-if="item.badge"
          class="rounded-full bg-white/20 px-2 py-0.5 text-xs"
          :class="route.path === item.to ? 'text-white' : 'bg-danger text-white'"
        >
          {{ item.badge }}
        </span>
      </RouterLink>
    </nav>

    <div class="panel-soft mt-auto p-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">Estado de red IoT</p>
      <p class="mt-1 text-sm text-ink">{{ onlineText }}</p>
    </div>
  </aside>
</template>
