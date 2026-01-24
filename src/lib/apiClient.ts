import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para añadir token y tenant a TODAS las peticiones
apiClient.interceptors.request.use(async (config) => {
  // Obtener el token actual de la sesión de Supabase (siempre fresco)
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const tenantId = localStorage.getItem('tenant_id')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }

  return config
})

export default apiClient
