import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para añadir token y tenant a TODAS las peticiones
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase_token')
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
