#!/usr/bin/env node

/**
 * Script de verificación REAL contra backend
 *
 * Prueba el flujo completo:
 * 1. Login Supabase (restaurante)
 * 2. Obtener tenant_id
 * 3. Rate limit status
 * 4. Verificar PIN
 * 5. Obtener current tracking
 * 6. Clock in/out
 *
 * Variables de entorno requeridas:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - VITE_API_BASE_URL
 * - TEST_EMAIL (email de restaurante)
 * - TEST_PASSWORD (password de restaurante)
 * - TEST_PIN (PIN de un empleado de prueba)
 * - TEST_EMPLOYEE_ID (ID del empleado de prueba)
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar .env
dotenv.config({ path: join(__dirname, '..', '.env') })

// Colores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message) {
  log(`✓ ${message}`, 'green')
}

function error(message) {
  log(`✗ ${message}`, 'red')
}

function info(message) {
  log(`ℹ ${message}`, 'blue')
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow')
}

// Validar variables de entorno
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_BASE_URL',
  'TEST_EMAIL',
  'TEST_PASSWORD',
  'TEST_PIN',
  'TEST_EMPLOYEE_ID'
]

const missingVars = requiredEnvVars.filter((v) => !process.env[v])

if (missingVars.length > 0) {
  error('Faltan variables de entorno:')
  missingVars.forEach((v) => console.log(`  - ${v}`))
  process.exit(1)
}

// Configurar Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Configurar axios
const apiClient = axios.create({
  baseURL: process.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

let token = null
let tenantId = null

// Interceptor
apiClient.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }
  return config
})

async function main() {
  log('\n=== VERIFICACIÓN DE INTEGRACIÓN REAL ===\n', 'blue')

  try {
    // 1. Login Supabase
    info('1. Login con Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD
    })

    if (authError) {
      throw new Error(`Error en login: ${authError.message}`)
    }

    if (!authData.session) {
      throw new Error('No se obtuvo session')
    }

    token = authData.session.access_token
    success(`Login exitoso. Token obtenido.`)

    // 2. Obtener tenant_id
    info('2. Obteniendo tenant_id desde tenant_users...')
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', authData.user.id)
      .single()

    if (tenantError) {
      throw new Error(`Error obteniendo tenant: ${tenantError.message}`)
    }

    tenantId = tenantData.tenant_id
    success(`Tenant ID obtenido: ${tenantId}`)
    info(`Role: ${tenantData.role}`)

    // 3. Rate limit status
    info('3. Verificando rate limit status...')
    const rateLimitResponse = await apiClient.get('/personal/pin/rate-limit-status')
    success(`Rate limit OK: ${rateLimitResponse.data.attempts_remaining}/${rateLimitResponse.data.max_attempts} intentos`)

    // 4. Verificar PIN
    info('4. Verificando PIN...')
    const pinResponse = await apiClient.post('/personal/pin/verify', {
      pin: process.env.TEST_PIN
    })

    if (!pinResponse.data.success) {
      throw new Error(`PIN incorrecto: ${pinResponse.data.message}`)
    }

    const employee = pinResponse.data.employee
    success(`PIN verificado. Empleado: ${employee.first_name} ${employee.last_name}`)
    info(`  - ID: ${employee.id}`)
    info(`  - Email: ${employee.email}`)
    info(`  - Posición: ${employee.position}`)
    info(`  - Role: ${employee.role || 'Sin cuenta (solo PIN)'}`)

    // 5. Current tracking
    info('5. Obteniendo estado de fichaje actual...')
    const currentResponse = await apiClient.get('/personal/time-tracking/current', {
      params: { employee_id: process.env.TEST_EMPLOYEE_ID }
    })

    const currentTracking = currentResponse.data
    if (currentTracking) {
      warn(`Hay un fichaje abierto:`)
      info(`  - Clock in: ${currentTracking.clock_in}`)
      info(`  - Clock out: ${currentTracking.clock_out || 'N/A'}`)
    } else {
      success('No hay fichaje abierto (correcto para prueba)')
    }

    // 6. Clock in (solo si NO hay fichaje abierto)
    if (!currentTracking) {
      info('6. Probando clock in...')
      const clockInResponse = await apiClient.post('/personal/time-tracking/clock', {
        employee_id: process.env.TEST_EMPLOYEE_ID,
        type: 'clock_in',
        location: {
          latitude: 40.416775,
          longitude: -3.70379
        }
      })

      success('Clock in exitoso!')
      info(`  - Tracking ID: ${clockInResponse.data.tracking.id}`)
      info(`  - Status: ${clockInResponse.data.attempt.status}`)

      // Clock out inmediatamente para limpiar
      info('7. Probando clock out (limpieza)...')
      const clockOutResponse = await apiClient.post('/personal/time-tracking/clock', {
        employee_id: process.env.TEST_EMPLOYEE_ID,
        type: 'clock_out',
        notes: 'Test automatizado'
      })

      success('Clock out exitoso!')
      info(`  - Total horas: ${clockOutResponse.data.tracking.total_hours || 'N/A'}`)
    } else {
      warn('Saltando clock in/out porque ya hay fichaje abierto')
    }

    log('\n=== TODAS LAS PRUEBAS PASARON ===\n', 'green')
    process.exit(0)
  } catch (err) {
    error('\n=== ERROR EN VERIFICACIÓN ===')
    console.error(err.response?.data || err.message || err)
    process.exit(1)
  }
}

main()
