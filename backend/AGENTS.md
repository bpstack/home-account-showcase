# AGENTS.md — backend

**Lee primero [`../AGENTS.md`](../AGENTS.md)**: layer 1, seguridad, flujo de context7, versiones
compartidas con el frontend y límites. Aquí solo va lo propio de `backend/`.

API en **Express 5** con **mysql2** (SQL en crudo, sin ORM). Se ejecuta TypeScript directo con
`tsx`: **no hay paso de build**. Node **24**, mínimo el del `engines.node`.

## Versiones instaladas (fuente de verdad: `node_modules`, no los rangos `^`)

| Paquete              | Versión    | Nota                         |
| -------------------- | ---------- | ---------------------------- |
| `express`            | **5.2.1**  | ⚠️ v5 — ver trampas          |
| `multer`             | **2.0.2**  | ⚠️ v2 — ver trampas          |
| `bcrypt`             | **6.0.0**  | ⚠️ v6 — ver trampas          |
| `dotenv`             | **17.2.3** | ⚠️ v17 — ver trampas         |
| `@anthropic-ai/sdk`  | **0.71.2** | ⚠️ Pre-1.0 — ver trampas     |
| `zod`                | **4.3.5**  | ⚠️ v4 — trampa en la raíz    |
| `mysql2`             | **3.16.0** | SQL en crudo, sin ORM        |
| `jose`               | **6.1.3**  |                              |
| `express-rate-limit` | **8.2.1**  | v8, sobre Express 5          |
| `passport`           | **0.7.0**  | Pre-1.0                      |
| `tsx`                | **4.21.0** | Ejecuta TS sin paso de build |

### Trampas de versión (aquí el modelo suele asumir mal)

- **`express` 5**: los errores async **sí** se propagan solos (no hace falta wrapper), `req.query`
  es **de solo lectura**, y los patrones de ruta son de path-to-regexp v8: **`*` suelto ya no
  vale**, hay que nombrar el comodín (`/*splat`). Es **lo contrario** de Express 4, que es lo que
  devuelve casi todo ejemplo.
- **`multer` 2**: cambió el manejo de errores y las opciones respecto a v1, que es lo que devuelve
  casi todo ejemplo.
- **`bcrypt`**: es **v6**.
- **`dotenv` 17**: el comportamiento por defecto de logs y override cambió respecto a las 8.x/16.x
  de los ejemplos.
- **`@anthropic-ai/sdk` 0.71**: pre-1.0, la API rompe entre minors. Verifica siempre contra esta
  versión exacta.

## ⚠️ Los routers de Express necesitan anotación de tipo explícita

`const router = Router()` **no compila**:

```
error TS2742: The inferred type of 'router' cannot be named without a reference to
'.pnpm/@types+express-serve-static-core@5.1.0/…'. This is likely not portable.
```

Es la combinación de los tipos de Express 5 con el `node_modules` **aislado de pnpm**. La forma
correcta, y la que **ya usan todos los routers del repo**:

```ts
import { Router } from 'express'
const router: Router = Router()
```

Ningún ejemplo publicado de Express trae esa anotación. **Si copias un router de la doc, añádela.**

## Comprobaciones

`pnpm run verify` = `pnpm run typecheck` (`tsc --noEmit`) y después `pnpm run lint` (`eslint .
--ext .ts,.tsx --max-warnings=0`). Es lo que ejecuta el CI: **un aviso de lint ya lo pone en rojo**.

El backend usa **estilo sin punto y coma**. Si escribes con `;`, el lint te marcará cada línea.
