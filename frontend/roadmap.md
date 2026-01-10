# Frontend Roadmap - Home Account

## Estrategia de Renderizado

### Decisión
- **Páginas públicas**: Static/SSR (SEO, carga rápida)
- **Páginas privadas**: Client Components (interactividad, datos dinámicos)

### Por página

| Ruta | Componente | Renderizado | Razón |
|------|------------|-------------|-------|
| `/` | Landing | Static | SEO, marketing |
| `/login` | Login | Static | No cambia |
| `/register` | Register | Static | No cambia |
| `/dashboard` | Dashboard | Client | Datos usuario, interactivo |
| `/transactions` | Transactions | Client | CRUD, filtros, paginación |
| `/categories` | Categories | Client | CRUD, edición |
| `/import` | Import | Client | Upload, preview, mapeo |
| `/reports` | Reports | Client | Gráficos, filtros |
| `/settings` | Settings | Client | Configuración usuario |

---

## Estructura de Carpetas

```
app/
├── (public)/                 # Rutas públicas (sin auth)
│   ├── page.tsx             # Landing (Static)
│   ├── login/page.tsx       # Login (Static)
│   └── register/page.tsx    # Register (Static)
│
├── (private)/               # Rutas privadas (requieren auth)
│   ├── layout.tsx           # Layout con sidebar, verifica auth
│   ├── dashboard/page.tsx   # Dashboard (Client)
│   ├── transactions/
│   │   ├── page.tsx         # Lista transacciones
│   │   └── [id]/page.tsx    # Detalle/edición
│   ├── categories/page.tsx  # Gestión categorías
│   ├── import/page.tsx      # Importar XLS
│   ├── reports/page.tsx     # Reportes y gráficos
│   └── settings/page.tsx    # Configuración
│
├── layout.tsx               # Root layout
├── globals.css              # Tailwind
└── not-found.tsx            # 404

components/
├── ui/                      # Componentes base (Button, Input, Modal...)
├── forms/                   # Formularios (LoginForm, TransactionForm...)
├── charts/                  # Gráficos (PieChart, BarChart...)
├── tables/                  # Tablas (TransactionsTable...)
└── layout/                  # Layout (Sidebar, Header, Navbar...)

lib/
├── api.ts                   # Funciones fetch al backend
├── auth.ts                  # Lógica de autenticación
├── utils.ts                 # Utilidades generales
└── constants.ts             # Constantes

hooks/
├── useAuth.ts               # Hook de autenticación
├── useTransactions.ts       # Hook para transacciones
└── useCategories.ts         # Hook para categorías

types/
├── user.ts                  # Tipos de usuario
├── transaction.ts           # Tipos de transacción
├── category.ts              # Tipos de categoría
└── api.ts                   # Tipos de respuestas API
```

---

## Patrón de Data Fetching

### Client Components con fetch
```tsx
'use client'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />
  return <DashboardContent data={data} />
}
```

### Con custom hook (recomendado)
```tsx
'use client'

export default function Dashboard() {
  const { data, loading, error } = useDashboard()

  if (loading) return <Skeleton />
  if (error) return <Error message={error} />
  return <DashboardContent data={data} />
}
```

---

## Autenticación (Fase 1 - localStorage)

```tsx
// lib/auth.ts
export const auth = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token: string) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  isAuthenticated: () => !!localStorage.getItem('token'),
}

// lib/api.ts
export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const token = auth.getToken()

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  })
}
```

---

## Fases de Desarrollo Frontend

### Fase 1: Estructura + Mock Data
- [ ] Crear estructura de carpetas
- [ ] Componentes UI base (Button, Input, Card, Modal)
- [ ] Layout (Sidebar, Header)
- [ ] Páginas con mock data
- [ ] Navegación funcional

### Fase 2: Autenticación
- [ ] Páginas login/register
- [ ] Hook useAuth
- [ ] Protección de rutas
- [ ] Persistencia en localStorage

### Fase 3: Conectar Backend
- [ ] Configurar API_URL
- [ ] Funciones fetch
- [ ] Reemplazar mock data por API real
- [ ] Manejo de errores

### Fase 4: Features Core
- [ ] CRUD Transacciones
- [ ] CRUD Categorías
- [ ] Importación XLS
- [ ] Dashboard con resumen

### Fase 5: Polish
- [ ] Loading states
- [ ] Error boundaries
- [ ] Validación de formularios
- [ ] Responsive design

---

## Librerías a considerar

| Necesidad | Opción | Razón |
|-----------|--------|-------|
| Gráficos | recharts | Simple, bien documentado |
| Formularios | react-hook-form | Performante, fácil validación |
| Validación | zod | Mismo que backend |
| Fechas | date-fns | Ligero, funcional |
| Tablas | @tanstack/react-table | Flexible, headless |
| Toast/Notif | react-hot-toast | Simple, bonito |
| Icons | lucide-react | Consistente, tree-shakeable |
| XLS parsing | xlsx | Ya instalado en el proyecto |
