# Home Account - Roadmap

## Fase 1: MVP Base
- [x] Diseño de tablas MySQL
- [x] Crear tablas en Aiven
- [x] Configuración conexión BD
- [x] Auth: JWT en localStorage
- [x] CRUD Usuarios (registro, login)
- [x] CRUD Accounts (auto-creación al registrar)
- [x] CRUD Categorías
- [x] CRUD Subcategorías
- [x] CRUD Transacciones
- [x] Frontend: Páginas básicas (login, registro, dashboard)

## Fase 2: Funcionalidad Core
- [x] Importar XLS del banco (parsear extractos)
- [x] Mapeo categorías banco → categorías usuario
- [x] Dashboard con resumen mensual
- [x] Filtros por fecha, categoría, tipo (income/expense)
- [x] Gráficos básicos (recharts: CategoryPieChart, BalanceLineChart, MonthlyBarChart)

## Fase 3: Seguridad

### 3.1 Sistema de Tokens (Desarrollo Local)
- [x] Access Token: 5 min expiración, almacenado en memoria (variable JS)
- [x] Refresh Token: 8 horas expiración, almacenado en localStorage
- [x] Envío via header `Authorization: Bearer <token>` (evita problemas CORS/cookies en local)
- [x] Refresh automático silencioso mientras hay actividad
- [x] Logout automático si refresh token expira (8h → login obligatorio)

### 3.2 Backend Agnóstico
- [x] Middleware unificado: extrae token de header Authorization O cookie
- [x] Misma lógica auth para ambos entornos (solo cambia el canal de transporte)
- [x] Endpoint POST /auth/refresh para renovar access token

### 3.3 Protección Frontend
- [x] Interceptor para refresh automático (401 → refresh → retry request)
- [x] Si refresh falla → logout y redirige a /login
- [x] Access token en memoria (no persiste al cerrar pestaña)

### 3.4 Rate Limiting & Brute Force
- [x] Rate limiting SOLO en /auth/login
- [x] Bloqueo tras 7 intentos fallidos de login (15 min ventana)
- [x] Desbloqueo automático tras 15 minutos

### 3.5 Validación
- [x] Zod en backend para validar auth (register, login, refresh)
- [ ] Zod en transacciones y categorías (pendiente)
- [ ] Sanitización de datos antes de BD

### 3.6 Sistema de Invitaciones (sin roles)
- [ ] Usuario crea cuenta → puede invitar a familiares
- [ ] Todos los miembros ven todos los datos (sin roles por ahora)
- [ ] Tabla `account_members` para relación usuario-cuenta

### 3.7 Migración Producción (futuro)
- [ ] Access Token → HttpOnly Cookie + Secure + SameSite=Strict
- [ ] Refresh Token → HttpOnly Cookie separada
- [ ] CSRF protection
- [ ] CORS restringido a dominio producción
- [ ] Blacklist de tokens (Redis) para logout real

## Fase 3.8: Refactorizaciones de Arquitectura (ARQUITECTURA.md)

> Violaciones detectadas contra los principios documentados en `docs/ARQUITECTURA/ARQUITECTURA.md`

### Críticas
- [x] **AuthContext → React Query**: Mover `user` y `account` de useState a React Query
  - Archivo: `frontend/contexts/AuthContext.tsx`
  - QueryClientProvider movido al layout raíz via `components/providers/Providers.tsx`

- [x] **Cálculos Dashboard → Backend**: Mover agregaciones al servidor
  - [x] Backend: Endpoints creados (`/stats`, `/balance-history`, `/monthly-summary`)
  - [x] Frontend: apiClient actualizado con nuevos endpoints
  - [x] Frontend: Dashboard refactorizado para usar nuevos endpoints

### Altas
- [x] **Validación Zod en Transacciones**: Añadir schemas de validación
  - Archivo: `backend/validators/transaction-validators.ts`

- [x] **Validación en updateTransaction**: Endpoint con validación Zod
  - Archivo: `backend/controllers/transactions/transaction-controller.ts`

### Media
- [x] **Migrar AuthContext a Zustand**: Según ARQUITECTURA.md línea 133
  - [x] Store creado: `frontend/stores/authStore.ts`
  - [x] Estado UI (isLoggingIn, isRegistering, authError) en Zustand
  - [x] Datos remotos (user, account) en React Query
  - [x] Eliminar Context y exponer hooks directamente (migración completa)
  - [x] Documentación: `docs/ARQUITECTURA/decision-auth.md`

---

## Fase 4: Mejoras UX
- [ ] Tema oscuro/claro
- [ ] Responsive design
- [ ] PWA (instalable)
- [ ] Notificaciones (gastos inusuales)

## Fase 5: Features Avanzados
- [ ] Presupuestos por categoría
- [ ] Alertas cuando se excede presupuesto
- [ ] Exportar reportes (PDF, Excel)
- [ ] Multi-cuenta bancaria
- [ ] Compartir gastos (familia)

## Fase 6: Optimización
- [ ] Caché de consultas frecuentes
- [ ] Lazy loading en frontend
- [ ] Compresión de respuestas API
- [ ] Auditoría de seguridad

---

## Notas Técnicas

### Auth Fase 1 (localStorage)
```
Login → JWT generado → Guardado en localStorage → Enviado en header Authorization
```

### Auth Fase 3 (HttpOnly Cookie)
```
Login → JWT generado → Cookie HttpOnly + Secure + SameSite → Enviado automáticamente
```

### Stack
- Frontend: Next.js + Tailwind 3.4.17
- Backend: Express + TypeScript
- BD: MySQL (Aiven)
- Auth: JWT (bcrypt para passwords)
