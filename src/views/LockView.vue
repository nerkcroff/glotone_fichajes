<template>
  <div class="lock-view">
    <ThemeToggle />

    <div class="lock-container">
      <div class="lock-header">
        <h1>Ingresa tu PIN</h1>
        <p class="lock-subtitle">Empleados del restaurante</p>
      </div>

      <BannerToast :show="showError" type="error" :message="errorMessage" />
      <BannerToast :show="showWarning" type="warning" :message="warningMessage" />

      <div class="lock-content">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeStore } from '@/stores/employee.store'
import apiClient from '@/lib/apiClient'
import ThemeToggle from '@/components/ThemeToggle.vue'
import PinPad from '@/components/PinPad.vue'
import BannerToast from '@/components/BannerToast.vue'

const router = useRouter()
const employeeStore = useEmployeeStore()

const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showWarning = ref(false)
const warningMessage = ref('')
const rateLimit = ref<any>(null)

onMounted(async () => {
  await fetchRateLimit()
})

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

      // Redirigir a /clock
      router.push('/clock')
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
</script>

<style scoped>
.lock-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--background);
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
</style>
