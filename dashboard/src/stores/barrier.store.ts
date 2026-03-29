import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockBarrierState } from '@/data/mock/settings'
import type { BarrierMode, BarrierState } from '@/types/domain'

export const useBarrierStore = defineStore('barrier', () => {
  const barrier = ref<BarrierState>({ ...mockBarrierState })
  const commandLog = ref<string[]>([
    '09:15 Apertura manual remota por Javier Soto',
    '08:59 Cambio a modo automático por Carla Muñoz',
  ])

  const isOpen = computed(() => barrier.value.status === 'abierta')

  function setMode(mode: BarrierMode, actor: string) {
    barrier.value.mode = mode
    barrier.value.lastActionAt = new Date().toISOString()
    barrier.value.lastActionBy = actor
    commandLog.value.unshift(
      `${formatHour(new Date())} Cambio de modo a ${translateMode(mode)} por ${actor}`,
    )
  }

  function openBarrier(actor: string) {
    barrier.value.status = 'abierta'
    barrier.value.lastActionAt = new Date().toISOString()
    barrier.value.lastActionBy = actor
    commandLog.value.unshift(`${formatHour(new Date())} Apertura de barrera por ${actor}`)
  }

  function closeBarrier(actor: string) {
    barrier.value.status = 'cerrada'
    barrier.value.lastActionAt = new Date().toISOString()
    barrier.value.lastActionBy = actor
    commandLog.value.unshift(`${formatHour(new Date())} Cierre de barrera por ${actor}`)
  }

  return {
    barrier,
    commandLog,
    isOpen,
    setMode,
    openBarrier,
    closeBarrier,
  }
})

function formatHour(date: Date) {
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function translateMode(mode: BarrierMode) {
  if (mode === 'automatico') return 'automático'
  if (mode === 'manual_remoto') return 'manual remoto'
  return 'manual físico'
}
