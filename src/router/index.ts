import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.ts'
import { useEmployeeStore } from '@/stores/employee.store.ts'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/lock',
      name: 'lock',
      component: () => import('@/views/LockView.vue'),
      meta: { requiresAuth: true, requiresEmployee: false }
    },
    {
      path: '/clock',
      name: 'clock',
      component: () => import('@/views/ClockView.vue'),
      meta: { requiresAuth: true, requiresEmployee: true }
    },
    {
      path: '/',
      redirect: '/lock'
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const employeeStore = useEmployeeStore()

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresEmployee = to.meta.requiresEmployee === true

  // Sin sesión restaurante => /login
  if (requiresAuth && !authStore.isAuthenticated) {
    return next('/login')
  }

  // Con sesión restaurante pero en /login => /lock
  if (to.path === '/login' && authStore.isAuthenticated) {
    return next('/lock')
  }

  // Requiere empleado activo pero no hay => /lock
  if (requiresEmployee && !employeeStore.employee) {
    return next('/lock')
  }

  // NO redirigir automáticamente a /clock cuando hay empleado
  // La pantalla de PIN siempre debe mostrarse primero

  next()
})

export default router
