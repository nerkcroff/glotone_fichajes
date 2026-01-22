<template>
  <div class="login-view">
    <ThemeToggle />

    <div class="login-container">
      <div class="login-header">
        <h1>Fichaje de Empleados</h1>
        <p class="login-subtitle">Acceso del restaurante</p>
      </div>

      <BannerToast :show="showError" type="error" :message="errorMessage" />

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="restaurante@ejemplo.com"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            :disabled="loading"
          />
        </div>

        <BigButton type="submit" variant="primary" :disabled="loading">
          {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
        </BigButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import ThemeToggle from '@/components/ThemeToggle.vue'
import BigButton from '@/components/BigButton.vue'
import BannerToast from '@/components/BannerToast.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  loading.value = true
  showError.value = false

  try {
    await authStore.login(email.value, password.value)
    router.push('/lock')
  } catch (error: any) {
    errorMessage.value = error.message || 'Error al iniciar sesión'
    showError.value = true
    setTimeout(() => {
      showError.value = false
    }, 3000)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--background);
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: var(--text);
}

.login-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.login-form {
  background: var(--surface);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text);
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--background);
  color: var(--text);
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
