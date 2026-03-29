import type { Device } from '@/types/domain'

export const mockDevices: Device[] = [
  {
    id: 'ESP32-CAM-001',
    name: 'ESP32-CAM Portón Norte',
    type: 'esp32_cam',
    accessPoint: 'Portón Norte',
    status: 'online',
    lastSeen: '2026-03-29T09:35:00-03:00',
    signal: 88,
    firmware: 'v1.4.2',
  },
  {
    id: 'ESP32-CAM-002',
    name: 'ESP32-CAM Portón Sur',
    type: 'esp32_cam',
    accessPoint: 'Portón Sur',
    status: 'offline',
    lastSeen: '2026-03-29T09:31:00-03:00',
    signal: 0,
    firmware: 'v1.4.1',
  },
  {
    id: 'IR-001',
    name: 'Sensor IR Norte',
    type: 'sensor_ir',
    accessPoint: 'Portón Norte',
    status: 'online',
    lastSeen: '2026-03-29T09:35:00-03:00',
    signal: 95,
    firmware: 'v1.1.0',
  },
  {
    id: 'SERVO-001',
    name: 'Barrera Norte',
    type: 'barrera_servo',
    accessPoint: 'Portón Norte',
    status: 'degradado',
    lastSeen: '2026-03-29T09:34:00-03:00',
    signal: 70,
    firmware: 'v2.0.0',
  },
]
