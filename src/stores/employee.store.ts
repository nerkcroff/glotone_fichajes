import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/lib/apiClient.ts'

interface Employee {
  id: string
  tenant_id: string
  user_id?: string | null
  first_name: string
  last_name: string
  email: string
  position: string
  department: string
  status: string
  hire_date: string
  role?: string | null
  created_at: string
}

interface CurrentTracking {
  id: string
  employee_id: string
  clock_in: string
  clock_out?: string | null
  total_hours?: number | null
}

export const useEmployeeStore = defineStore('employee', () => {
  const employee = ref<Employee | null>(null)
  const currentTracking = ref<CurrentTracking | null>(null)
  const sessionExpiry = ref<number | null>(null)

  // TTL de sesión: 5 minutos de inactividad
  const SESSION_TTL_MS = 5 * 60 * 1000
  let inactivityTimer: number | null = null

  function setEmployee(emp: Employee) {
    employee.value = emp
    localStorage.setItem('employee_data', JSON.stringify(emp))
    resetInactivityTimer()
  }

  function clearEmployee() {
    employee.value = null
    currentTracking.value = null
    sessionExpiry.value = null
    localStorage.removeItem('employee_data')
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
  }

  function resetInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
    }

    sessionExpiry.value = Date.now() + SESSION_TTL_MS

    inactivityTimer = window.setTimeout(() => {
      clearEmployee()
    }, SESSION_TTL_MS)
  }

  function loadEmployee() {
    const stored = localStorage.getItem('employee_data')
    if (stored) {
      const emp = JSON.parse(stored)
      employee.value = emp
      // No iniciamos timer aquí, se inicia al verificar PIN
    }
  }

  async function fetchCurrentTracking(employeeId: string) {
    try {
      const response = await apiClient.get('/personal/time-tracking/current', {
        params: { employee_id: employeeId }
      })

      currentTracking.value = response.data || null
      return currentTracking.value
    } catch (error) {
      console.error('Error fetching current tracking:', error)
      currentTracking.value = null
      return null
    }
  }

  async function clockIn(location?: { latitude: number; longitude: number }) {
    if (!employee.value) throw new Error('No employee set')

    const response = await apiClient.post('/personal/time-tracking/clock', {
      employee_id: employee.value.id,
      type: 'clock_in',
      location
    })

    currentTracking.value = response.data.tracking
    return response.data
  }

  async function clockOut(location?: { latitude: number; longitude: number }, notes?: string) {
    if (!employee.value) throw new Error('No employee set')

    const response = await apiClient.post('/personal/time-tracking/clock', {
      employee_id: employee.value.id,
      type: 'clock_out',
      location,
      notes
    })

    currentTracking.value = null
    return response.data
  }

  return {
    employee,
    currentTracking,
    sessionExpiry,
    setEmployee,
    clearEmployee,
    loadEmployee,
    resetInactivityTimer,
    fetchCurrentTracking,
    clockIn,
    clockOut
  }
})
