import type { DeviceStatus } from '@/types/domain'

export const DEVICE_OFFLINE_TIMEOUT_MS = 15_000

export function inferDeviceStatusFromHeartbeat(
  status: DeviceStatus,
  lastSeenIso: string,
  nowMs = Date.now(),
): DeviceStatus {
  if (status === 'offline') return 'offline'

  const lastSeenMs = Date.parse(lastSeenIso)
  if (!Number.isFinite(lastSeenMs)) return status

  if (nowMs - lastSeenMs > DEVICE_OFFLINE_TIMEOUT_MS) {
    return 'offline'
  }

  return status
}

