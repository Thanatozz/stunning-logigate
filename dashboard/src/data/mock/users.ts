export interface UserAdminRow {
  id: string
  name: string
  email: string
  role: 'admin' | 'supervisor'
  status: 'activo' | 'suspendido'
  lastAccess: string
}

export interface AuditLogRow {
  id: string
  action: string
  actor: string
  target: string
  timestamp: string
}

export const mockUserAdminRows: UserAdminRow[] = [
  {
    id: 'usr-001',
    name: 'Carla Muñoz',
    email: 'admin@planta.cl',
    role: 'admin',
    status: 'activo',
    lastAccess: '2026-03-29T08:40:00-03:00',
  },
  {
    id: 'usr-002',
    name: 'Javier Soto',
    email: 'supervisor@planta.cl',
    role: 'supervisor',
    status: 'activo',
    lastAccess: '2026-03-29T08:52:00-03:00',
  },
  {
    id: 'usr-003',
    name: 'Paula Reyes',
    email: 'paula.reyes@planta.cl',
    role: 'supervisor',
    status: 'suspendido',
    lastAccess: '2026-03-21T10:14:00-03:00',
  },
]

export const mockAuditRows: AuditLogRow[] = [
  {
    id: 'aud-001',
    action: 'Cambio de modo de barrera',
    actor: 'Carla Muñoz',
    target: 'Portón Norte',
    timestamp: '2026-03-29T08:59:00-03:00',
  },
  {
    id: 'aud-002',
    action: 'Resolución de alerta',
    actor: 'Javier Soto',
    target: 'AL-002',
    timestamp: '2026-03-29T09:10:00-03:00',
  },
  {
    id: 'aud-003',
    action: 'Alta de vehículo',
    actor: 'Carla Muñoz',
    target: 'Patente LM-2468',
    timestamp: '2026-03-28T16:42:00-03:00',
  },
]
