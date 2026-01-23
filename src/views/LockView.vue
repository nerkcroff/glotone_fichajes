<template>
  <div class="lock-view">
    <ThemeToggle />

    <!-- Botón de cerrar turno (logout) -->
    <button class="logout-button" @click="handleLogout" title="Cerrar turno">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </button>

    <div class="lock-container">
      <div class="lock-header">
        <h1>{{ headerTitle }}</h1>
        <p class="lock-subtitle">Empleados del restaurante</p>
      </div>

      <BannerToast :show="showError" type="error" :message="errorMessage" />
      <BannerToast :show="showWarning" type="warning" :message="warningMessage" />

      <div class="lock-content">
        <!-- PIN Pad (pantalla por defecto) -->
        <div v-if="currentScreen === 'pin'">
          <PinPad @submit="handlePinSubmit" />

          <div v-if="rateLimit" class="rate-limit-info">
            <p>
              Intentos restantes: {{ rateLimit.attempts_remaining }} /
              {{ rateLimit.max_attempts }}
            </p>
          </div>

          <div v-if="loading" class="loading">
            <p>Verificando...</p>
          </div>
        </div>

        <!-- Pantalla de bienvenida (después de fichar entrada) -->
        <div v-else-if="currentScreen === 'welcome'" class="welcome-screen">
          <div class="welcome-icon">👋</div>
          <h2>¡Bienvenido/a!</h2>
          <p class="employee-name">{{ currentEmployeeName }}</p>
          <p class="welcome-message">Tu entrada ha sido registrada</p>
          <p class="time-display">{{ currentTime }}</p>
          <div class="reminder-box">
            <p class="reminder-icon">📱🚫</p>
            <p class="reminder-text">Recuerda dejar tu móvil en la taquilla durante tu turno</p>
          </div>
        </div>

        <!-- Pantalla de opciones (pausa/salida) -->
        <div v-else-if="currentScreen === 'options'" class="options-screen">
          <div class="employee-info">
            <p class="employee-name">{{ currentEmployeeName }}</p>
            <p class="work-time">Tiempo trabajado: {{ workTime }}</p>
          </div>

          <div class="action-buttons">
            <BigButton
              variant="warning"
              @click="handleStartBreak"
              :disabled="loading"
            >
              <span class="button-content">
                <span class="button-icon">☕</span>
                <span>Iniciar Pausa</span>
              </span>
            </BigButton>
            <BigButton
              variant="danger"
              @click="handleClockOut"
              :disabled="loading"
            >
              <span class="button-content">
                <span class="button-icon">👋</span>
                <span>Fichar Salida</span>
              </span>
            </BigButton>
          </div>

          <button class="cancel-button" @click="returnToPinPad">Cancelar</button>
        </div>

        <!-- Pantalla de reanudación de pausa -->
        <div v-else-if="currentScreen === 'resume'" class="welcome-screen">
          <div class="welcome-icon">⏰</div>
          <h2>Pausa finalizada</h2>
          <p class="employee-name">{{ currentEmployeeName }}</p>
          <p class="welcome-message">Tu turno ha sido reanudado</p>
          <p class="time-display">{{ currentTime }}</p>
        </div>

        <!-- Pantalla de despedida (después de fichar salida) -->
        <div v-else-if="currentScreen === 'goodbye'" class="welcome-screen">
          <div class="welcome-icon">✅</div>
          <h2>¡Hasta pronto!</h2>
          <p class="employee-name">{{ currentEmployeeName }}</p>
          <p class="welcome-message">Tu salida ha sido registrada</p>
          <p class="work-time">Tiempo trabajado: {{ workTime }}</p>
        </div>

        <!-- Pantalla de inicio de pausa -->
        <div v-else-if="currentScreen === 'break-started'" class="welcome-screen">
          <div class="welcome-icon">☕</div>
          <h2>Pausa iniciada</h2>
          <p class="employee-name">{{ currentEmployeeName }}</p>
          <p class="welcome-message">Disfruta tu descanso</p>
          <p class="time-display">{{ currentTime }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeStore } from '@/stores/employee.store.ts'
import { useBreaksStore } from '@/stores/breaks.store.ts'
import { useAuthStore } from '@/stores/auth.store.ts'
import apiClient from '@/lib/apiClient.ts'
import ThemeToggle from '@/components/ThemeToggle.vue'
import PinPad from '@/components/PinPad.vue'
import BannerToast from '@/components/BannerToast.vue'
import BigButton from '@/components/BigButton.vue'

const router = useRouter()
const employeeStore = useEmployeeStore()
const breaksStore = useBreaksStore()
const authStore = useAuthStore()

type Screen = 'pin' | 'welcome' | 'options' | 'resume' | 'goodbye' | 'break-started'

const currentScreen = ref<Screen>('pin')
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showWarning = ref(false)
const warningMessage = ref('')
const rateLimit = ref<any>(null)
const currentEmployeeName = ref('')
const currentTime = ref('')
const workTime = ref('')

let autoReturnTimer: number | null = null
let timeUpdateInterval: number | null = null

const headerTitle = computed(() => {
  if (currentScreen.value === 'options') return 'Selecciona una opción'
  return 'Ingresa tu PIN'
})

onMounted(async () => {
  await fetchRateLimit()
})

onUnmounted(() => {
  clearAutoReturnTimer()
  clearTimeUpdateInterval()
})

function clearAutoReturnTimer() {
  if (autoReturnTimer) {
    clearTimeout(autoReturnTimer)
    autoReturnTimer = null
  }
}

function clearTimeUpdateInterval() {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
    timeUpdateInterval = null
  }
}

function returnToPinPad() {
  clearAutoReturnTimer()
  clearTimeUpdateInterval()
  currentScreen.value = 'pin'
  currentEmployeeName.value = ''
  currentTime.value = ''
  workTime.value = ''
}

function scheduleReturnToPinPad(seconds: number = 15) {
  clearAutoReturnTimer()
  autoReturnTimer = window.setTimeout(() => {
    returnToPinPad()
  }, seconds * 1000)
}

function updateCurrentTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function calculateWorkTime(clockInTime: string): string {
  const start = new Date(clockInTime).getTime()
  const now = Date.now()
  const diffMs = now - start

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours}h ${minutes}min`
}

function startWorkTimeUpdate(clockInTime: string) {
  clearTimeUpdateInterval()

  // Actualizar inmediatamente
  workTime.value = calculateWorkTime(clockInTime)

  // Actualizar cada segundo
  timeUpdateInterval = window.setInterval(() => {
    workTime.value = calculateWorkTime(clockInTime)
  }, 1000)
}

async function fetchRateLimit() {
  try {
    const response = await apiClient.get('/personal/pin/rate-limit-status')
    rateLimit.value = response.data
  } catch (error) {
    console.error('Error fetching rate limit:', error)
  }
}

async function handlePinSubmit(pin: string) {
  loading.value = true
  showError.value = false
  showWarning.value = false

  try {
    const response = await apiClient.post('/personal/pin/verify', { pin })

    if (response.data.success) {
      const employee = response.data.employee

      // Guardar empleado en store
      employeeStore.setEmployee(employee)

      // Cargar estado de fichaje actual
      await employeeStore.fetchCurrentTracking(employee.id)

      console.log('🔍 DEBUG - Current tracking:', employeeStore.currentTracking)
      console.log('🔍 DEBUG - Is on break:', breaksStore.isOnBreak)

      currentEmployeeName.value = `${employee.first_name} ${employee.last_name}`

      // Verificar si tiene fichaje activo
      if (!employeeStore.currentTracking) {
        // NO tiene fichaje activo -> Fichar entrada automáticamente
        await handleAutoClockIn()
      } else {
        // SÍ tiene fichaje activo -> Verificar si está en pausa
        if (breaksStore.isOnBreak) {
          // Está en pausa -> Reanudar automáticamente
          await handleAutoResumeBreak()
        } else {
          // No está en pausa -> Mostrar opciones
          showOptionsScreen()
        }
      }

      await fetchRateLimit()
    } else {
      // PIN incorrecto o bloqueado
      errorMessage.value = response.data.message || 'PIN incorrecto'
      showError.value = true

      if (response.data.error_code === 'TOO_MANY_ATTEMPTS') {
        warningMessage.value =
          'Demasiados intentos. Espere 1 minuto antes de reintentar.'
        showWarning.value = true
      }

      await fetchRateLimit()
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'Error al verificar PIN'
    showError.value = true
  } finally {
    loading.value = false
  }
}

async function handleAutoClockIn() {
  try {
    await employeeStore.clockIn()

    // Mostrar pantalla de bienvenida
    currentScreen.value = 'welcome'
    updateCurrentTime()

    // Actualizar hora cada segundo
    clearTimeUpdateInterval()
    timeUpdateInterval = window.setInterval(() => {
      updateCurrentTime()
    }, 1000)

    // Volver al PIN pad después de 15 segundos
    scheduleReturnToPinPad(15)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'Error al fichar entrada'
    showError.value = true
    returnToPinPad()
  }
}

function showOptionsScreen() {
  if (!employeeStore.currentTracking) return

  // Mostrar pantalla de opciones
  currentScreen.value = 'options'

  // Calcular tiempo trabajado
  startWorkTimeUpdate(employeeStore.currentTracking.clock_in)
}

async function handleStartBreak() {
  loading.value = true

  try {
    breaksStore.startBreak()

    // Mostrar pantalla de pausa iniciada
    currentScreen.value = 'break-started'
    updateCurrentTime()

    clearTimeUpdateInterval()
    timeUpdateInterval = window.setInterval(() => {
      updateCurrentTime()
    }, 1000)

    // Volver al PIN pad después de 15 segundos
    scheduleReturnToPinPad(15)
  } catch (error: any) {
    errorMessage.value = 'Error al iniciar pausa'
    showError.value = true
  } finally {
    loading.value = false
  }
}

async function handleClockOut() {
  loading.value = true

  try {
    const tracking = employeeStore.currentTracking
    if (tracking) {
      workTime.value = calculateWorkTime(tracking.clock_in)
    }

    await employeeStore.clockOut()
    breaksStore.clearBreak()

    // Mostrar pantalla de despedida
    currentScreen.value = 'goodbye'

    clearTimeUpdateInterval()

    // Volver al PIN pad después de 15 segundos
    scheduleReturnToPinPad(15)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'Error al fichar salida'
    showError.value = true
  } finally {
    loading.value = false
  }
}

async function handleAutoResumeBreak() {
  try {
    breaksStore.endBreak()

    // Mostrar pantalla de reanudación
    currentScreen.value = 'resume'
    updateCurrentTime()

    clearTimeUpdateInterval()
    timeUpdateInterval = window.setInterval(() => {
      updateCurrentTime()
    }, 1000)

    // Volver al PIN pad después de 15 segundos
    scheduleReturnToPinPad(15)
  } catch (error: any) {
    errorMessage.value = 'Error al reanudar turno'
    showError.value = true
    returnToPinPad()
  }
}

async function handleLogout() {
  if (confirm('¿Estás seguro de que quieres cerrar turno?')) {
    await authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.lock-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--background);
  position: relative;
}

.logout-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text);
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logout-button:hover {
  background: var(--danger);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  border-color: var(--danger);
}

.logout-button svg {
  width: 24px;
  height: 24px;
}

.lock-container {
  width: 100%;
  max-width: 500px;
}

.lock-header {
  text-align: center;
  margin-bottom: 2rem;
}

.lock-header h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
}

.lock-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.lock-content {
  background: var(--surface);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 400px;
  justify-content: center;
}

.rate-limit-info {
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.loading {
  margin-top: 1rem;
  color: var(--primary);
  font-weight: 600;
}

/* Pantallas de bienvenida/despedida */
.welcome-screen {
  text-align: center;
  width: 100%;
  padding: 2rem 0;
}

.welcome-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  animation: fadeInScale 0.5s ease-out;
}

.welcome-screen h2 {
  font-size: 2.5rem;
  margin: 0 0 1rem 0;
  color: var(--text);
  font-weight: 700;
}

.employee-name {
  font-size: 1.5rem;
  color: var(--primary);
  font-weight: 600;
  margin: 0.5rem 0;
}

.welcome-message {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin: 1rem 0;
}

.time-display {
  font-size: 2rem;
  color: var(--text);
  font-weight: 700;
  margin-top: 1.5rem;
  font-family: 'Courier New', monospace;
}

.reminder-box {
  margin-top: 2rem;
  padding: 1rem 1.5rem;
  background: rgba(245, 158, 11, 0.1);
  border: 2px solid var(--warning);
  border-radius: 12px;
  animation: fadeInScale 0.5s ease-out 0.3s both;
}

.reminder-icon {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
}

.reminder-text {
  font-size: 1rem;
  color: var(--text);
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

.work-time {
  font-size: 1.3rem;
  color: var(--success);
  font-weight: 600;
  margin: 1rem 0;
}

/* Pantalla de opciones */
.options-screen {
  width: 100%;
}

.employee-info {
  text-align: center;
  margin-bottom: 2rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.cancel-button {
  margin-top: 1.5rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  transition: color 0.2s;
}

.cancel-button:hover {
  color: var(--text);
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.button-icon {
  font-size: 1.5rem;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
