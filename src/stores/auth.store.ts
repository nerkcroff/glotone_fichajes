import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient.ts'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const tenantId = ref<string | null>(localStorage.getItem('tenant_id'))
  const userRole = ref<string | null>(localStorage.getItem('user_role'))
  const isAuthenticated = ref<boolean>(false)

  // Inicializar sesión desde Supabase
  async function initSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token && tenantId.value) {
      token.value = session.access_token
      isAuthenticated.value = true
    }
  }

  // Llamar initSession al cargar el store
  initSession()

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    if (!data.session) {
      throw new Error('No session returned')
    }

    // Supabase gestiona el token automáticamente
    token.value = data.session.access_token

    // Obtener tenant_id y role desde tenant_users
    const { data: userTenant, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', data.user.id)
      .single()

    if (tenantError) throw tenantError

    tenantId.value = userTenant.tenant_id
    userRole.value = userTenant.role
    localStorage.setItem('tenant_id', tenantId.value)
    localStorage.setItem('user_role', userRole.value)

    isAuthenticated.value = true

    return data
  }

  async function logout() {
    await supabase.auth.signOut()

    // Limpiar SOLO la sesión del restaurante
    token.value = null
    tenantId.value = null
    userRole.value = null
    isAuthenticated.value = false

    // Supabase limpia su sesión automáticamente
    localStorage.removeItem('tenant_id')
    localStorage.removeItem('user_role')

    // NO limpiar employee_data, eso lo hace employee.store
  }

  return {
    token,
    tenantId,
    userRole,
    isAuthenticated,
    login,
    logout
  }
})
