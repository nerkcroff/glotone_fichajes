import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Cache del token para evitar llamadas repetidas a getSession()
let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getToken(): Promise<string | null> {
  const now = Date.now()

  // Usar token cacheado si aún es válido (con 60s de margen)
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken
  }

  // Refrescar token
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    cachedToken = session.access_token
    // expires_at viene en segundos desde epoch
    tokenExpiresAt = (session.expires_at ?? 0) * 1000
  } else {
    cachedToken = null
    tokenExpiresAt = 0
  }

  return cachedToken
}

// Interceptor para añadir token y tenant a TODAS las peticiones
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken()
  const tenantId = localStorage.getItem('tenant_id')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }

  return config
})

// Invalidar cache cuando cambie la sesión de Supabase
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    cachedToken = session.access_token
    tokenExpiresAt = (session.expires_at ?? 0) * 1000
  } else {
    cachedToken = null
    tokenExpiresAt = 0
  }
})

export default apiClient
