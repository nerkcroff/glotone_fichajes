<template>
  <div class="clock-view">
    <ThemeToggle />

    <div class="clock-container">
      <!-- Banner de bienvenida -->
      <div v-if="showWelcome" class="welcome-banner">
        <h2>Bienvenido/a {{ employeeName }}</h2>
        <p class="welcome-message">
          Recuerda: durante el turno NO debes dejar el móvil en la taquilla.
        </p>
      </div>

      <BannerToast :show="showSuccess" type="success" :message="successMessage" />
      <BannerToast :show="showError" type="error" :message="errorMessage" />

      <div class="clock-card">
        <div class="clock-header">
          <h1>{{ employeeName }}</h1>
          <p class="clock-subtitle">{{ employeePosition }}</p>
        </div>

        <!-- Estado actual -->
        <div class="clock-status">
          <div v-if="!hasOpenShift" class="status-badge status-badge-idle">
            Sin turno abierto
          </div>
          <div v-else-if="isOnBreak" class="status-badge status-badge-break">
            En pausa
          </div>
          <div v-else class="status-badge status-badge-active">Trabajando</div>

          <div v-if="hasOpenShift" class="shift-info">
            <p>
              Entrada:
              <strong>{{ formatTime(employeeStore.currentTracking?.clock_in) }}</strong>
            </p>
            <p v-if="isOnBreak" class="break-duration">
              Pausa: {{ breakDuration }} minutos
            </p>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="clock-actions">
          <!-- Sin turno abierto: solo botón de entrada -->
          <BigButton
            v-if="!hasOpenShift"
            variant="primary"
            @click="handleClockIn"
            :disabled="loading"
          >
            {{ loading ? 'Fichando...' : 'Fichar Entrada' }}
          </BigButton>

          <!-- Con turno abierto: pausa y salida -->
          <template v-else>
            <!-- Pausa -->
            <BigButton
              v-if="!isOnBreak"
              variant="secondary"
              @click="handleStartBreak"
              :disabled="loading"
            >
              Fichar Pausa
            </BigButton>
            <BigButton
              v-else
              variant="secondary"
              @click="handleEndBreak"
              :disabled="loading"
            >
              Reanudar Trabajo
            </BigButton>

            <!-- Salida -->
            <BigButton
              variant="danger"
              @click="handleClockOut"
              :disabled="loading"
              style="margin-top: 1rem"
            >
              {{ loading ? 'Fichando...' : 'Fichar Salida' }}
            </BigButton>
          </template>
        </div>

        <!-- Cambiar empleado -->
        <div class="clock-footer">
          <button class="link-button" @click="handleChangeEmployee">
            Cambiar empleado
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeStore } from '@/stores/employee.store.ts'
import { useBreaksStore } from '@/stores/breaks.store.ts'
import ThemeToggle from '@/components/ThemeToggle.vue'
import BigButton from '@/components/BigButton.vue'
import BannerToast from '@/components/BannerToast.vue'

const router = useRouter()
const employeeStore = useEmployeeStore()
const breaksStore = useBreaksStore()

const loading = ref(false)
const showWelcome = ref(false)
const showSuccess = ref(false)
const successMessage = ref('')
const showError = ref(false)
const errorMessage = ref('')

let activityTimer: number | null = null

const employeeName = computed(
  () =>
    `${employeeStore.employee?.first_name} ${employeeStore.employee?.last_name}`
)
const employeePosition = computed(() => employeeStore.employee?.position || '')

const hasOpenShift = computed(() => {
  return employeeStore.currentTracking !== null
})

const isOnBreak = computed(() => breaksStore.isOnBreak)
const breakDuration = computed(() => breaksStore.breakDuration)

onMounted(() => {
  if (!employeeStore.employee) {
    router.push('/lock')
    return
  }

  // Mostrar welcome banner por 5 segundos
  showWelcome.value = true
  setTimeout(() => {
    showWelcome.value = false
  }, 5000)

  // Iniciar timer de inactividad
  startActivityMonitor()
})

onUnmounted(() => {
  stopActivityMonitor()
})

function startActivityMonitor() {
  // Resetear timer en actividad del usuario
  const resetTimer = () => {
    employeeStore.resetInactivityTimer()
  }

  document.addEventListener('click', resetTimer)
  document.addEventListener('keypress', resetTimer)
  document.addEventListener('touchstart', resetTimer)

  // Polling para verificar si expiró
  activityTimer = window.setInterval(() => {
    if (
      employeeStore.sessionExpiry &&
      Date.now() > employeeStore.sessionExpiry
    ) {
      handleChangeEmployee()
    }
  }, 1000)
}

function stopActivityMonitor() {
  if (activityTimer) {
    clearInterval(activityTimer)
    activityTimer = null
  }
}

async function handleClockIn() {
  loading.value = true

  try {
    const location = await getLocation()
    await employeeStore.clockIn(location)

    successMessage.value = 'Entrada registrada correctamente'
    showSuccess.value = true
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'Error al fichar entrada'
    showError.value = true
  } finally {
    loading.value = false
  }
}

async function handleClockOut() {
  loading.value = true

  try {
    const location = await getLocation()

    // Si hay pausa activa, terminarla primero en el backend
    if (isOnBreak.value && employeeStore.employee?.id) {
      await breaksStore.endBreak(employeeStore.employee.id)
    }

    await employeeStore.clockOut(location)

    successMessage.value = 'Salida registrada correctamente'
    showSuccess.value = true

    // Limpiar break
    breaksStore.clearBreak()

    // Volver a /lock automáticamente
    setTimeout(() => {
      handleChangeEmployee()
    }, 2000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'Error al fichar salida'
    showError.value = true
  } finally {
    loading.value = false
  }
}

async function handleStartBreak() {
  if (!employeeStore.employee?.id) return

  try {
    await breaksStore.startBreak(employeeStore.employee.id)
    successMessage.value = 'Pausa iniciada'
    showSuccess.value = true
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'Error al iniciar pausa'
    showError.value = true
  }
}

async function handleEndBreak() {
  if (!employeeStore.employee?.id) return

  try {
    await breaksStore.endBreak(employeeStore.employee.id)
    successMessage.value = 'Trabajo reanudado'
    showSuccess.value = true
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'Error al reanudar trabajo'
    showError.value = true
  }
}

function handleChangeEmployee() {
  // Limpiar solo empleado activo, NO cerrar sesión restaurante
  employeeStore.clearEmployee()
  breaksStore.clearBreak()
  router.push('/lock')
}

async function getLocation(): Promise<
  { latitude: number; longitude: number } | undefined
> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      () => {
        // Error de geolocalización, continuar sin location
        resolve(undefined)
      },
      {
        timeout: 5000,
        maximumAge: 60000
      }
    )
  })
}

function formatTime(isoString: string | undefined): string {
  if (!isoString) return ''

  const date = new Date(isoString)
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.clock-view {
  min-height: 100vh;
  padding: 1rem;
  background: var(--background);
}

.clock-container {
  max-width: 600px;
  margin: 0 auto;
  padding-top: 1rem;
}

.welcome-banner {
  background: var(--primary);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.welcome-banner h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.welcome-message {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.95;
}

.clock-card {
  background: var(--surface);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.clock-header {
  text-align: center;
  margin-bottom: 2rem;
}

.clock-header h1 {
  font-size: 1.75rem;
  margin: 0 0 0.25rem 0;
  color: var(--text);
}

.clock-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.clock-status {
  text-align: center;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-weight: 600;
  margin-bottom: 1rem;
}

.status-badge-idle {
  background: var(--text-secondary);
  color: white;
}

.status-badge-active {
  background: var(--primary);
  color: white;
}

.status-badge-break {
  background: #f59e0b;
  color: white;
}

.shift-info {
  margin-top: 1rem;
  color: var(--text);
}

.shift-info p {
  margin: 0.5rem 0;
}

.break-duration {
  color: #f59e0b;
  font-weight: 600;
}

.clock-actions {
  margin-top: 2rem;
}

.clock-footer {
  margin-top: 2rem;
  text-align: center;
}

.link-button {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 1rem;
  cursor: pointer;
  text-decoration: underline;
}

.link-button:hover {
  opacity: 0.8;
}
</style>
