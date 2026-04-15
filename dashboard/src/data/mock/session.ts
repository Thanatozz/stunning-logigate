import type { UserSession } from '@/types/domain'

export const mockUsers: UserSession[] = [
  {
    id: 'u-admin-01',
    name: 'Rafael Sotomayor',
    email: 'admin@logigate.cl',
    role: 'admin',
    lastLoginAt: '2026-03-29T08:40:00-03:00',
  },
  {
    id: 'u-sup-01',
    name: 'Diego Avendaño',
    email: 'supervisor@logigate.cl',
    role: 'supervisor',
    lastLoginAt: '2026-03-29T08:52:00-03:00',
  },
]
