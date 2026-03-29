import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/domain'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    rolesAllowed?: Role[]
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Acceso' },
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { requiresAuth: true, title: 'Dashboard' },
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/views/HistoryView.vue'),
          meta: { requiresAuth: true, title: 'Historial' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
          meta: { requiresAuth: true, title: 'Reportes' },
        },
        {
          path: 'alerts',
          name: 'alerts',
          component: () => import('@/views/AlertsView.vue'),
          meta: { requiresAuth: true, title: 'Alertas' },
        },
        {
          path: 'vehicles',
          name: 'vehicles',
          component: () => import('@/views/VehiclesView.vue'),
          meta: { requiresAuth: true, title: 'Vehículos' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { requiresAuth: true, rolesAllowed: ['admin'], title: 'Configuración' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { requiresAuth: true, rolesAllowed: ['admin'], title: 'Usuarios y roles' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.rolesAllowed && authStore.currentRole) {
    const allowed = to.meta.rolesAllowed.includes(authStore.currentRole)
    if (!allowed) {
      return { name: 'dashboard' }
    }
  }

  return true
})

router.afterEach((to) => {
  const suffix = 'LogiGate'
  const title = to.meta.title ? `${to.meta.title} | ${suffix}` : suffix
  document.title = title
})

export default router
