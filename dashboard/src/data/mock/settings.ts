import type { BarrierState, SystemSettings } from '@/types/domain'

export const mockSettings: SystemSettings = {
  maxTrucks: 20,
  maxStayMinutes: 480,
  ocrConfidenceThreshold: 80,
  captureIntervalSeconds: 5,
  barrierAutoCloseSeconds: 10,
  accessPoints: [
    { id: 'north', name: 'Portón Norte', location: 'Acceso principal', active: true },
    { id: 'south', name: 'Portón Sur', location: 'Acceso de despacho', active: true },
    { id: 'west', name: 'Portón Oeste', location: 'Acceso auxiliar', active: false },
  ],
}

export const mockBarrierState: BarrierState = {
  accessPoint: 'Portón Norte',
  status: 'cerrada',
  mode: 'automatico',
  lastActionAt: '2026-03-29T09:33:00-03:00',
  lastActionBy: 'Sistema automático',
}
