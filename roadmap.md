# Home Account - Roadmap

## Fase 1: MVP Base
- [x] Diseño de tablas MySQL
- [x] Crear tablas en Aiven
- [x] Configuración conexión BD
- [x] Auth: JWT en localStorage
- [x] CRUD Usuarios (registro, login)
- [x] CRUD Accounts (auto-creación al registrar)
- [x] CRUD Categorías
- [ ] CRUD Subcategorías
- [ ] CRUD Transacciones
- [ ] Frontend: Páginas básicas (login, registro, dashboard)

## Fase 2: Funcionalidad Core
- [ ] Importar XLS del banco (parsear extractos)
- [ ] Mapeo categorías banco → categorías usuario
- [ ] Dashboard con resumen mensual
- [ ] Filtros por fecha, categoría, tipo
- [ ] Gráficos básicos (gastos por categoría)

## Fase 3: Seguridad
- [ ] Migrar JWT localStorage → HttpOnly Cookie
- [ ] Protección CSRF
- [ ] Rate limiting en endpoints
- [ ] Validación de inputs (Zod en backend)

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
