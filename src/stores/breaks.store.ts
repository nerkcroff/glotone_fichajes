import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/lib/apiClient'

interface Break {
  id?: string
  break_start: string // ISO timestamp
  break_end?: string | null // ISO timestamp
  duration_minutes?: number
  break_type?: string
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

  async function startBreak(employeeId: string, breakType: string = 'rest', notes?: string) {
    try {
      const response = await apiClient.post('/personal/time-tracking/breaks', {
        employee_id: employeeId,
        break_type: breakType,
        notes: notes || 'Pausa'
      })

      if (response.data.success && response.data.break) {
        currentBreak.value = response.data.break
      }

      return response.data
    } catch (error) {
      console.error('Error starting break:', error)
      throw error
    }
  }

  async function endBreak(employeeId: string) {
    try {
      const response = await apiClient.put(
        `/personal/time-tracking/breaks/current/end?employee_id=${employeeId}`
      )

      if (response.data.success && response.data.break) {
        currentBreak.value = response.data.break
      }

      return response.data
    } catch (error) {
      console.error('Error ending break:', error)
      throw error
    }
  }

  function clearBreak() {
    currentBreak.value = null
  }

  async function fetchCurrentBreak(employeeId: string) {
    try {
      const response = await apiClient.get(
        `/personal/employees/${employeeId}/shift-status`
      )

      // El endpoint devuelve active_break dentro de la respuesta
      if (response.data && response.data.active_break) {
        currentBreak.value = {
          id: response.data.active_break.id,
          break_start: response.data.active_break.break_start,
          break_end: response.data.active_break.break_end,
          break_type: response.data.active_break.break_type
        }
      } else {
        currentBreak.value = null
      }

      return currentBreak.value
    } catch (error: any) {
      console.error('Error fetching current break:', error)
      currentBreak.value = null
      return null
    }
  }

  function setCurrentBreak(breakData: Break | null) {
    currentBreak.value = breakData
  }

  function getBreakSummary(): string {
    if (!currentBreak.value) return ''

    const totalMinutes = breakDuration.value
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `Pausa: ${hours}h ${minutes}min`
  }

  return {
    currentBreak,
    isOnBreak,
    breakDuration,
    startBreak,
    endBreak,
    clearBreak,
    fetchCurrentBreak,
    setCurrentBreak,
    getBreakSummary
  }
})
