# Home Account - Project Guidelines

## REGLA PRINCIPAL

**El autor de este proyecto es el propietario del repositorio. No dejar evidencia de autoría externa en:**
- Comentarios de código
- Mensajes de commit
- Documentación
- Metadatos de archivos

## Stack Tecnológico

- **Frontend:** Next.js + React + TypeScript + Tailwind CSS 3.4.17
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** MySQL (Aiven)
- **Package Manager:** pnpm

## Estructura del Proyecto

```
home-account/
├── backend/
│   ├── config/          # Configuración DB y app
│   ├── controllers/     # Controladores de rutas
│   ├── middlewares/     # Middlewares (auth, validation)
│   ├── models/          # Modelos de datos
│   ├── routes/          # Definición de rutas API
│   ├── services/        # Lógica de negocio
│   ├── validations/     # Schemas de validación (Zod)
│   ├── mysql/           # Scripts SQL de tablas
│   ├── docs/            # Documentación privada (NO subir)
│   └── index.ts         # Entry point
├── frontend/
│   ├── app/             # App Router de Next.js
│   ├── components/      # Componentes React
│   ├── lib/             # Utilidades y helpers
│   ├── hooks/           # Custom hooks
│   ├── types/           # Tipos TypeScript
│   └── docs/            # Documentación privada (NO subir)
└── CLAUDE.md            # Este archivo
```

## Convenciones de Código

### Commits
- Mensajes claros y descriptivos
- Sin referencias a herramientas de IA

### Estilo
- TypeScript estricto
- ESLint + Prettier
- Nombres de variables/funciones en inglés
- Comentarios solo cuando sean necesarios

## Comandos

### Backend
```bash
cd backend
pnpm dev        # Desarrollo
pnpm build      # Build
pnpm start      # Producción
```

### Frontend
```bash
cd frontend
pnpm dev        # Desarrollo
pnpm build      # Build
pnpm start      # Producción
```

## Base de Datos

Las tablas SQL están en `backend/mysql/`. Ejecutar en orden:
1. users.sql
2. categories.sql
3. subcategories.sql
4. transactions.sql
5. category_mappings.sql

## Carpeta docs/

La carpeta `docs/` en backend y frontend es **PRIVADA** y contiene:
- Archivos Excel de referencia del cliente
- Extractos bancarios de ejemplo
- Documentación interna

**NUNCA subir a git** (está en .gitignore)
