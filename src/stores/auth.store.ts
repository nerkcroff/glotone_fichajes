import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient.ts'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('supabase_token'))
  const tenantId = ref<string | null>(localStorage.getItem('tenant_id'))
  const userRole = ref<string | null>(localStorage.getItem('user_role'))
  const isAuthenticated = ref<boolean>(!!token.value && !!tenantId.value)

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    if (!data.session) {
      throw new Error('No session returned')
    }

    // Guardar token
    token.value = data.session.access_token
    localStorage.setItem('supabase_token', token.value)

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

    localStorage.removeItem('supabase_token')
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
