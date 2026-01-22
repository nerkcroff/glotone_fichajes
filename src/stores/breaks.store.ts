import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Break {
  break_start: string // ISO timestamp
  break_end?: string | null // ISO timestamp
  duration_minutes?: number
}

export const useBreaksStore = defineStore('breaks', () => {
  const currentBreak = ref<Break | null>(null)

  const isOnBreak = computed(() => {
    return currentBreak.value !== null && !currentBreak.value.break_end
  })

  const breakDuration = computed(() => {
    if (!currentBreak.value || !currentBreak.value.break_start) return 0

    const start = new Date(currentBreak.value.break_start).getTime()
    const end = currentBreak.value.break_end
      ? new Date(currentBreak.value.break_end).getTime()
      : Date.now()

    return Math.floor((end - start) / 1000 / 60) // minutos
  })

  function startBreak() {
    currentBreak.value = {
      break_start: new Date().toISOString(),
      break_end: null
    }
    saveToStorage()
  }

  function endBreak() {
    if (!currentBreak.value) return

    currentBreak.value.break_end = new Date().toISOString()
    currentBreak.value.duration_minutes = breakDuration.value
    saveToStorage()

    // No limpiamos inmediatamente para poder mostrar el resumen
  }

  function clearBreak() {
    currentBreak.value = null
    localStorage.removeItem('current_break')
  }

  function saveToStorage() {
    if (currentBreak.value) {
      localStorage.setItem('current_break', JSON.stringify(currentBreak.value))
    }
  }

  function loadFromStorage() {
    const stored = localStorage.getItem('current_break')
    if (stored) {
      currentBreak.value = JSON.parse(stored)
    }
  }

  function getBreakSummary(): string {
    if (!currentBreak.value) return ''

    const totalMinutes = breakDuration.value
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `Pausa: ${hours}h ${minutes}min`
  }

  // Cargar al inicializar
  loadFromStorage()

  return {
    currentBreak,
    isOnBreak,
    breakDuration,
    startBreak,
    endBreak,
    clearBreak,
    getBreakSummary
  }
})
