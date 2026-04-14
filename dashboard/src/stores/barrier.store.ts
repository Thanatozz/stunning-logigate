import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockBarrierState } from '@/data/mock/settings'
import type { BarrierMode, BarrierState, BarrierStatus } from '@/types/domain'

export const useBarrierStore = defineStore('barrier', () => {
  const barrier = ref<BarrierState>({ ...mockBarrierState })
  const commandLog = ref<string[]>([
    '09:15 Apertura de barrera por Diego Avendano',
    '08:59 Automatico activado por Rafael Sotomayor',
  ])

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

  return {
    barrier,
    commandLog,
    isOpen,
    setMode,
    openBarrier,
    closeBarrier,
    setBarrierStatus,
    setBarrierSnapshot,
  }
})

function formatHour(date: Date) {
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
