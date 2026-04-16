import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockBarrierState } from '@/data/mock/settings'
import type { BarrierMode, BarrierState, BarrierStatus } from '@/types/domain'

export const useBarrierStore = defineStore('barrier', () => {
  const barrier = ref<BarrierState>({ ...mockBarrierState })
  const commandLog = ref<string[]>([])
  const lastRemoteEventSignature = ref('')

  const isOpen = computed(() => barrier.value.status === 'abierta')

  function pushLog(entry: string) {
    commandLog.value.unshift(entry)
    if (commandLog.value.length > 30) {
      commandLog.value = commandLog.value.slice(0, 30)
    }
  }

  function setMode(mode: BarrierMode, actor: string) {
    barrier.value.mode = mode
    barrier.value.lastActionAt = new Date().toISOString()
    barrier.value.lastActionBy = actor
    pushLog(`${formatHour(new Date())} Automatico ${mode === 'automatico' ? 'activado' : 'desactivado'} por ${actor}`)
  }

  function openBarrier(actor: string) {
    barrier.value.status = 'abierta'
    barrier.value.lastActionAt = new Date().toISOString()
    barrier.value.lastActionBy = actor
    pushLog(`${formatHour(new Date())} Apertura de barrera por ${actor}`)
  }

  function closeBarrier(actor: string) {
    barrier.value.status = 'cerrada'
    barrier.value.lastActionAt = new Date().toISOString()
    barrier.value.lastActionBy = actor
    pushLog(`${formatHour(new Date())} Cierre de barrera por ${actor}`)
  }

  function setBarrierStatus(status: BarrierStatus, actor: string, reason: string) {
    barrier.value.status = status
    barrier.value.lastActionAt = new Date().toISOString()
    barrier.value.lastActionBy = actor
    pushLog(`${formatHour(new Date())} ${reason} por ${actor}`)
  }

  function setBarrierSnapshot(payload: Partial<BarrierState>) {
    barrier.value = {
      accessPoint: payload.accessPoint ?? barrier.value.accessPoint,
      status: payload.status ?? barrier.value.status,
      mode: payload.mode ?? barrier.value.mode,
      lastActionAt: payload.lastActionAt ?? barrier.value.lastActionAt,
      lastActionBy: payload.lastActionBy ?? barrier.value.lastActionBy,
    }
  }

  function setCommandLog(entries: string[]) {
    commandLog.value = [...entries]
  }

  function addCommandLog(entry: string) {
    const hasTimePrefix = /^\d{2}:\d{2}\s/.test(entry)
    pushLog(hasTimePrefix ? entry : `${formatHour(new Date())} ${entry}`)
  }

  function syncBarrierFromRemote(
    payload: Partial<BarrierState> & { reason?: string; source?: string },
  ) {
    const next: BarrierState = {
      accessPoint: payload.accessPoint ?? barrier.value.accessPoint,
      status: payload.status ?? barrier.value.status,
      mode: payload.mode ?? barrier.value.mode,
      lastActionAt: payload.lastActionAt ?? barrier.value.lastActionAt,
      lastActionBy: payload.lastActionBy ?? barrier.value.lastActionBy,
    }

    const signature = [
      next.accessPoint,
      next.status,
      next.mode,
      next.lastActionAt,
      next.lastActionBy,
      payload.reason ?? '',
      payload.source ?? '',
    ].join('|')

    barrier.value = next

    if (signature === lastRemoteEventSignature.value) {
      return
    }

    lastRemoteEventSignature.value = signature

    const actionLabel =
      payload.reason?.trim() ||
      (next.status === 'abierta'
        ? 'Barrera abierta'
        : next.status === 'cerrada'
          ? 'Barrera cerrada'
          : 'Barrera en transicion')

    const actor = next.lastActionBy || payload.source || 'sistema'
    const eventTime = next.lastActionAt
      ? new Date(next.lastActionAt)
      : new Date()

    pushLog(`${formatHour(eventTime)} ${actionLabel} por ${actor}`)
  }

  return {
    barrier,
    commandLog,
    isOpen,
    setMode,
    openBarrier,
    closeBarrier,
    setBarrierStatus,
    setBarrierSnapshot,
    setCommandLog,
    addCommandLog,
    syncBarrierFromRemote,
  }
})

function formatHour(date: Date) {
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
