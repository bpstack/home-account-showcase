# AGENTS.md — frontend

**Lee primero [`../AGENTS.md`](../AGENTS.md)**: layer 1, seguridad, flujo de context7, versiones
compartidas con el backend y límites. Aquí solo va lo propio de `frontend/`.

**Next.js 16** con App Router. Node **24.x** (`engines.node`) — **otro Node que el del backend**.

## Versiones instaladas (fuente de verdad: `node_modules`, no los rangos `^`)

| Paquete                 | Versión     | Nota                              |
| ----------------------- | ----------- | --------------------------------- |
| `next`                  | **16.1.1**  | App Router                        |
| `eslint-config-next`    | **15.5.9**  | 🔴 Una major por detrás de `next` |
| `tailwindcss`           | **3.4.17**  | ⚠️ v3, no v4. Pineada exacta      |
| `zustand`               | **5.0.9**   | ⚠️ v5                             |
| `react` / `react-dom`   | **19.2.3**  |                                   |
| `@tanstack/react-query` | **5.90.16** |                                   |
| `zod`                   | **4.3.6**   | ⚠️ v4 — trampa en la raíz         |
| `serwist`               | **9.5.3**   | `@serwist/next` va en **9.5.6**   |

### Trampas de versión (aquí el modelo suele asumir mal)

- **`eslint-config-next` 15.5.9 frente a `next` 16.1.1**: una major entera por detrás. Si una regla
  de lint contradice la doc de Next 16, es esto. No lo "arregles" subiéndolo sin permiso.
- **`tailwindcss` 3**: `tailwind.config` + directivas `@tailwind`. **NO** `@import "tailwindcss"` ni
  `@theme` de v4. Otros proyectos del propietario van en v4: no copies de ellos.
- **`zustand` 5**: exige `create<T>()(...)` currificado en TS y quitó los selectores por defecto.
  Los ejemplos de v4 no compilan aquí, y otros proyectos del propietario van en v4.

## Comprobaciones

`pnpm run verify` = `pnpm run build` (`next build`, que es lo que detecta los errores de tipos). Es
lo que ejecuta el CI.

**Excepción declarada (regla 14): `pnpm run lint` queda fuera de `verify`** hasta que salga limpio
con `--max-warnings=0` (2026-11-17: no sale). El detalle y el arreglo están en `docs/TODO.md`.
