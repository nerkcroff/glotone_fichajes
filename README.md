# Fichaje de Empleados - Kiosco para Restaurante

Aplicación **completa y funcional** de fichaje de empleados para dispositivos móviles/tablet compartidos en restaurantes.

## 🎯 Características

- ✅ **Login de restaurante** con Supabase Auth
- ✅ **Pantalla PIN** multi-empleado con rate limiting
- ✅ **Fichaje de entrada/salida** con geolocalización
- ✅ **Pausas locales** (sin backend) con resumen en notes
- ✅ **Modo día/noche** persistido con toggle visual
- ✅ **Sesión de empleado** con TTL de inactividad (5 min)
- ✅ **Guards de autenticación** en Vue Router
- ✅ **CERO MOCKS** - Todo contra backend real

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Backend del módulo Personal ejecutándose (ver `API_DOCUMENTATION_FRONTEND.md`)
- Supabase proyecto configurado con tabla `tenant_users`

## 🚀 Instalación

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y rellena con tus valores:

```bash
cp .env.example .env
```

Edita `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### 4. Build para producción

```bash
npm run build
npm run preview
```

## 📱 Flujo de Usuario

### 1. Login del Restaurante

- Email y contraseña de la cuenta del restaurante
- Supabase Auth con `signInWithPassword`
- Obtiene `tenant_id` desde tabla `tenant_users`
- Guarda token y tenant en localStorage
- Redirige a `/lock`

### 2. Pantalla PIN (Lockscreen)

- Keypad numérico personalizado
- PIN de 4 dígitos
- Rate limiting: 5 intentos por minuto
- Muestra intentos restantes
- Al verificar PIN:
  - **Éxito**: guarda empleado y redirige a `/clock`
  - **Error**: muestra mensaje y bloquea temporalmente si excede intentos

### 3. Pantalla de Fichaje (Clock)

#### Bienvenida (5 segundos)
```
Bienvenido/a {Nombre}.
Recuerda: durante el turno NO debes dejar el móvil en la taquilla.
```

#### Sin turno abierto
- Badge: "Sin turno abierto"
- Botón: **"Fichar Entrada"**

#### Con turno abierto (sin pausa)
- Badge: "Trabajando"
- Muestra hora de entrada
- Botones:
  - **"Fichar Pausa"**
  - **"Fichar Salida"**

#### Con turno abierto (en pausa)
- Badge: "En pausa"
- Muestra duración de pausa en tiempo real
- Botones:
  - **"Reanudar Trabajo"**
  - **"Fichar Salida"**

#### Fichar Salida
- Si hay pausa activa, la finaliza automáticamente
- Agrega resumen de pausa en `notes`: `"Pausa: 0h 25min"`
- Vuelve a `/lock` automáticamente tras 2 segundos

#### Cambiar Empleado
- Botón "Cambiar empleado" siempre visible
- Limpia solo el empleado activo
- **NO cierra la sesión del restaurante**
- Vuelve a `/lock`

### 4. Sesión de Empleado

- **TTL**: 5 minutos de inactividad
- Se resetea con cualquier click/touch
- Al expirar: vuelve automáticamente a `/lock`
- Se mantiene en localStorage con carga al recargar página

### 5. Modo Día/Noche

- Toggle sol/luna en esquina superior derecha
- Persistido en localStorage
- Aplica CSS variables:
  - **Día**: fondo blanco, texto oscuro
  - **Noche**: fondo gris oscuro, texto claro
- Color primario turquesa (#12B5B0) en ambos modos

## 🔐 Integración con Backend

### Headers Obligatorios

Todas las peticiones al backend incluyen:

```javascript
{
  "Authorization": "Bearer {supabase_access_token}",
  "X-Tenant-ID": "{tenant_id}",
  "Content-Type": "application/json"
}
```

Implementado en `src/lib/apiClient.ts` con interceptores de Axios.

### Endpoints Utilizados

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/personal/pin/rate-limit-status` | GET | Obtener intentos restantes |
| `/personal/pin/verify` | POST | Verificar PIN del empleado |
| `/personal/time-tracking/current` | GET | Estado de fichaje actual |
| `/personal/time-tracking/clock` | POST | Fichar entrada/salida |

### Geolocalización

- Intenta obtener coordenadas GPS al fichar
- **No bloquea** si el usuario rechaza o hay error
- Timeout de 5 segundos
- Si falla: envía sin campo `location`

### Pausas (Implementación Local)

**NO existe endpoint de pausas en el backend**, por lo que se implementa localmente:

- **Store**: `src/stores/breaks.store.ts`
- **Persistencia**: localStorage con key `current_break`
- **Estructura**:
  ```json
  {
    "break_start": "2024-01-16T10:30:00Z",
    "break_end": "2024-01-16T10:55:00Z",
    "duration_minutes": 25
  }
  ```
- **Al fichar salida con pausa activa**:
  - Finaliza pausa automáticamente
  - Calcula duración
  - Agrega a `notes`: `"Pausa: 0h 25min"`
  - **NO inventa campos** en el backend

## 📁 Estructura del Proyecto

```
glotone_fichajes/
├── src/
│   ├── lib/
│   │   ├── supabaseClient.ts      # Cliente de Supabase (solo auth)
│   │   └── apiClient.ts           # Cliente Axios con interceptores
│   ├── stores/
│   │   ├── auth.store.ts          # Sesión del restaurante
│   │   ├── employee.store.ts      # Empleado activo + TTL
│   │   ├── theme.store.ts         # Modo día/noche
│   │   └── breaks.store.ts        # Pausas locales
│   ├── router/
│   │   └── index.ts               # Rutas + guards
│   ├── views/
│   │   ├── LoginView.vue          # Login restaurante
│   │   ├── LockView.vue           # Pantalla PIN
│   │   └── ClockView.vue          # Fichaje
│   ├── components/
│   │   ├── PinPad.vue             # Keypad numérico
│   │   ├── ThemeToggle.vue        # Toggle sol/luna
│   │   ├── BigButton.vue          # Botón grande kiosco
│   │   └── BannerToast.vue        # Mensajes flash
│   ├── styles/
│   │   └── tokens.css             # CSS Variables día/noche
│   ├── App.vue
│   ├── main.ts
│   └── vite-env.d.ts
├── scripts/
│   └── verify-real.js             # Script de tests reales
├── .env.example
├── .env.test.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🧪 Tests Reales (NO MOCKS)

### Script de Verificación

El proyecto incluye `scripts/verify-real.js` que prueba el flujo completo contra backend real:

1. Login con Supabase
2. Obtener tenant_id
3. Rate limit status
4. Verificar PIN
5. Current tracking
6. Clock in/out

### Configurar tests

Copia el archivo de ejemplo:

```bash
cp .env.test.example .env
```

Edita `.env` y agrega credenciales reales:

```env
# Backend
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Credenciales de test (restaurante)
TEST_EMAIL=admin@restaurante.com
TEST_PASSWORD=password-segura

# Empleado de test
TEST_PIN=1234
TEST_EMPLOYEE_ID=uuid-del-empleado
```

### Ejecutar tests

```bash
npm run verify-real
```

**Output esperado**:

```
=== VERIFICACIÓN DE INTEGRACIÓN REAL ===

ℹ 1. Login con Supabase Auth...
✓ Login exitoso. Token obtenido.

ℹ 2. Obteniendo tenant_id desde tenant_users...
✓ Tenant ID obtenido: abc-123-def
ℹ Role: owner

ℹ 3. Verificando rate limit status...
✓ Rate limit OK: 5/5 intentos

ℹ 4. Verificando PIN...
✓ PIN verificado. Empleado: Juan Pérez
ℹ   - ID: emp-123
ℹ   - Email: juan@restaurante.com
ℹ   - Posición: Camarero
ℹ   - Role: staff

ℹ 5. Obteniendo estado de fichaje actual...
✓ No hay fichaje abierto (correcto para prueba)

ℹ 6. Probando clock in...
✓ Clock in exitoso!
ℹ   - Tracking ID: track-456
ℹ   - Status: accepted

ℹ 7. Probando clock out (limpieza)...
✓ Clock out exitoso!
ℹ   - Total horas: 0.0

=== TODAS LAS PRUEBAS PASARON ===
```

## 🎨 Personalización de Estilos

### CSS Variables

Edita `src/styles/tokens.css`:

```css
:root[data-theme='light'] {
  --primary: #12b5b0;           /* Turquesa */
  --primary-hover: #0fa09c;
  --background: #ffffff;
  --surface: #f9fafb;
  --text: #1f2937;
  /* ... */
}

:root[data-theme='dark'] {
  --primary: #12b5b0;           /* Mismo turquesa */
  --background: #1f2937;
  --surface: #374151;
  --text: #f9fafb;
  /* ... */
}
```

## 📝 Pruebas Manuales

### Checklist de Aceptación

#### ✅ Login
- [ ] Login con credenciales correctas redirige a /lock
- [ ] Login con credenciales incorrectas muestra error
- [ ] Token y tenant_id se guardan en localStorage
- [ ] Al recargar con sesión activa, va directo a /lock

#### ✅ PIN
- [ ] Keypad permite ingresar 4 dígitos
- [ ] Botón "C" limpia PIN
- [ ] Botón "✓" valida cuando hay 4 dígitos
- [ ] PIN correcto redirige a /clock
- [ ] PIN incorrecto muestra error y reduce intentos
- [ ] 5 intentos fallidos bloquean por 1 minuto
- [ ] Rate limit status muestra intentos restantes

#### ✅ Fichaje - Sin turno abierto
- [ ] Badge muestra "Sin turno abierto"
- [ ] Solo aparece botón "Fichar Entrada"
- [ ] Al fichar entrada:
  - [ ] Intenta obtener geolocalización (sin bloquear)
  - [ ] Llama a POST /clock con type: clock_in
  - [ ] Muestra mensaje de éxito
  - [ ] Botones cambian a "Fichar Pausa" y "Fichar Salida"

#### ✅ Fichaje - Con turno abierto
- [ ] Badge muestra "Trabajando"
- [ ] Muestra hora de entrada
- [ ] Aparecen botones "Fichar Pausa" y "Fichar Salida"

#### ✅ Pausas
- [ ] Al clicar "Fichar Pausa":
  - [ ] Badge cambia a "En pausa"
  - [ ] Muestra duración en tiempo real
  - [ ] Botón cambia a "Reanudar Trabajo"
  - [ ] Pausa se guarda en localStorage
- [ ] Al clicar "Reanudar Trabajo":
  - [ ] Badge vuelve a "Trabajando"
  - [ ] Finaliza pausa (break_end)
  - [ ] Se puede iniciar nueva pausa
- [ ] Al fichar salida con pausa activa:
  - [ ] Finaliza pausa automáticamente
  - [ ] Agrega resumen en notes: "Pausa: Xh Ymin"
  - [ ] Limpia pausa de localStorage

#### ✅ Fichaje - Salida
- [ ] Al fichar salida:
  - [ ] Llama a POST /clock con type: clock_out
  - [ ] Muestra mensaje de éxito
  - [ ] Vuelve a /lock tras 2 segundos
  - [ ] Limpia empleado activo

#### ✅ Cambiar Empleado
- [ ] Botón "Cambiar empleado" siempre visible
- [ ] Al clicar:
  - [ ] Limpia empleado activo
  - [ ] NO cierra sesión restaurante
  - [ ] Vuelve a /lock
  - [ ] Puede ingresar otro PIN

#### ✅ Sesión de Empleado
- [ ] Al verificar PIN, inicia TTL de 5 minutos
- [ ] Cualquier interacción resetea TTL
- [ ] Tras 5 min de inactividad, vuelve a /lock
- [ ] Al recargar página con empleado activo, lo carga

#### ✅ Modo Día/Noche
- [ ] Toggle sol/luna visible en esquina superior derecha
- [ ] Al clicar, cambia modo inmediatamente
- [ ] Modo se persiste en localStorage
- [ ] Al recargar, mantiene modo seleccionado
- [ ] Colores cambian correctamente:
  - [ ] Día: fondo blanco, texto oscuro
  - [ ] Noche: fondo gris oscuro, texto claro
  - [ ] Botón primario turquesa en ambos modos

#### ✅ Banner de Bienvenida
- [ ] Al entrar con PIN, muestra:
  - [ ] "Bienvenido/a {Nombre}"
  - [ ] "Recuerda: durante el turno NO debes dejar el móvil en la taquilla."
- [ ] Se oculta tras 5 segundos

#### ✅ Guards de Router
- [ ] Sin sesión restaurante: redirige a /login
- [ ] Con sesión pero sin empleado: solo acceso a /lock
- [ ] Con sesión y empleado: acceso a /clock
- [ ] Acceso directo a URL protegida redirige correctamente

#### ✅ Mensajes de Error
- [ ] Error de login muestra mensaje claro
- [ ] Error de PIN muestra mensaje y intentos
- [ ] Error de backend (500) muestra mensaje
- [ ] Error de red muestra mensaje

## 🔧 Desarrollo

### Comandos disponibles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Tests reales
npm run verify-real
```

### Agregar nuevas features

1. **Sin mocks**: toda integración debe ir contra backend real
2. **CSS Variables**: usar tokens de `tokens.css`
3. **Stores**: centralizar estado en Pinia
4. **Guards**: actualizar router si cambia lógica de auth
5. **Tipos**: agregar interfaces en archivos TypeScript

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

Verifica que `.env` existe y contiene:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Error: 401 Unauthorized en backend

Verifica que:
1. El token de Supabase es válido
2. El header `Authorization` se envía correctamente
3. El header `X-Tenant-ID` se envía correctamente

### PIN no funciona

Verifica que:
1. El PIN fue generado al crear el empleado
2. El empleado está en estado `active`
3. No estás excediendo el rate limit (5 intentos/min)

### Geolocalización no funciona

Es normal si:
1. El usuario rechazó permisos de ubicación
2. El navegador no soporta geolocalización
3. La conexión es insegura (HTTP en vez de HTTPS)

La app continúa funcionando sin location.

### Sesión expira demasiado rápido

El TTL está en `src/stores/employee.store.ts`:

```typescript
const SESSION_TTL_MS = 5 * 60 * 1000  // 5 minutos
```

Puedes ajustar según necesidad.

## 📄 Licencia

MIT

## 👥 Soporte

Para issues o dudas:
1. Revisar esta documentación
2. Revisar `API_DOCUMENTATION_FRONTEND.md`
3. Ejecutar `npm run verify-real` para diagnosticar backend

---

**Versión:** 1.0.0
**Última actualización:** 2026-01-22
