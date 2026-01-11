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
- [~] Filtros por fecha, categoría, tipo (falta filtro por tipo income/expense)
- [~] Gráficos básicos (falta instalar recharts e implementar pie/bar/line charts)

## Fase 3: Seguridad

### 3.1 Sistema de Tokens (Desarrollo Local)
- [ ] Access Token: 5 min expiración, almacenado en memoria (variable JS)
- [ ] Refresh Token: 8 horas expiración, almacenado en localStorage
- [ ] Envío via header `Authorization: Bearer <token>` (evita problemas CORS/cookies en local)
- [ ] Refresh automático silencioso mientras hay actividad
- [ ] Logout automático si refresh token expira (8h → login obligatorio)

### 3.2 Backend Agnóstico
- [ ] Middleware unificado: extrae token de header Authorization O cookie
- [ ] Misma lógica auth para ambos entornos (solo cambia el canal de transporte)
- [ ] Endpoint POST /auth/refresh para renovar access token

### 3.3 Protección Frontend
- [ ] Interceptor para refresh automático (401 → refresh → retry request)
- [ ] Si refresh falla → logout y redirige a /login
- [ ] Access token en memoria (no persiste al cerrar pestaña)

### 3.4 Rate Limiting & Brute Force
- [ ] Rate limiting SOLO en /auth/login
- [ ] Bloqueo tras 7 intentos fallidos de login
- [ ] Desbloqueo automático tras X minutos o manual

### 3.5 Validación
- [ ] Zod en backend para validar inputs
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
