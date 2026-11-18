# AGENTS.md — frontend

**Lee primero [`../AGENTS.md`](../AGENTS.md)**: layer 1, seguridad, flujo de context7, versiones
compartidas con el backend y límites. Aquí solo va lo propio de `frontend/`.

**Next.js 16** con App Router. Node **24**, mínimo el del `engines.node`, el mismo que el backend.

## Versiones instaladas (fuente de verdad: `node_modules`, no los rangos `^`)

| Paquete                 | Versión     | Nota                             |
| ----------------------- | ----------- | -------------------------------- |
| `next`                  | **16.4.6**  | App Router                       |
| `eslint-config-next`    | **16.4.6**  | Con `eslint` 9.39.5, flat config |
| `tailwindcss`           | **3.4.17**  | ⚠️ v3, no v4. Pineada exacta     |
| `zustand`               | **5.0.9**   | ⚠️ v5                            |
| `react` / `react-dom`   | **19.2.3**  |                                  |
| `@tanstack/react-query` | **5.90.16** |                                  |
| `zod`                   | **4.6.7**   | ⚠️ v4 — trampa en la raíz        |
| `serwist`               | **9.5.13**  | Con `@serwist/turbopack` 9.5.13  |

### Trampas de versión (aquí el modelo suele asumir mal)

- **El service worker va con `@serwist/turbopack`, no con `@serwist/next`**: `@serwist/next` solo
  corre con webpack y Next 16 compila con Turbopack. `app/sw.ts` se sirve en `/serwist/sw.js` desde
  `app/serwist/[path]/route.ts`, no en `public/sw.js`. Los ejemplos con `withSerwistInit` y
  `swDest` son de `@serwist/next`: aquí no valen.
- **`serwist` y `@serwist/turbopack` van fijados exactos y en la misma versión**: si se separan,
  pnpm instala dos copias de `serwist`.
- **`tailwindcss` 3**: `tailwind.config` + directivas `@tailwind`. **NO** `@import "tailwindcss"` ni
  `@theme` de v4. Otros proyectos del propietario van en v4: no copies de ellos.
- **`zustand` 5**: exige `create<T>()(...)` currificado en TS y quitó los selectores por defecto.
  Los ejemplos de v4 no compilan aquí, y otros proyectos del propietario van en v4.

## Comprobaciones

`pnpm run verify` = `pnpm run lint` (`eslint . --max-warnings=0`) y después `pnpm run build`
(`next build`, que es lo que detecta los errores de tipos). Es lo que ejecuta el CI: **un aviso de
lint ya lo pone en rojo**.

**Excepción declarada (regla 14): `react-hooks/set-state-in-effect` y
`react-hooks/preserve-manual-memoization` están desactivadas** en `eslint.config.mjs`. Motivo: son
reglas del React Compiler sobre rendimiento de render, no sobre errores, y el proyecto no usa el
compilador (ni `reactCompiler` en `next.config.ts` ni el plugin instalado). Con ellas, 21 avisos en
18 componentes, varios de sesión y cifrado. Alcance: esas dos reglas, todo el frontend, hasta que se
adopte el React Compiler (decisión del propietario, 2026-11-18). Las demás de `react-hooks` 7 siguen
activas: no metas componentes dentro de otros, JSX dentro de `try/catch` ni llamadas a funciones
antes de declararlas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
