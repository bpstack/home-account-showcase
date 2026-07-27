# AGENTS.md

Guía para cualquier agente de código (Claude Code, OpenCode, Codex…) que trabaje en este repositorio.

Este archivo cubre **solo la verificación de documentación de dependencias**. Las notas de
arquitectura del proyecto se mantienen fuera del control de versiones a propósito y no se
reproducen aquí.

Monorepo de tres paquetes: **`backend/`** (Express + MySQL), **`frontend/`** (Next.js) y
**`video/`** (Remotion). No hay workspace de pnpm: **cada paquete se instala y se ejecuta por
separado**, con su propio `node_modules` y su propio `package.json`.

## Documentación actualizada (MCP context7)

Este proyecto tiene disponible el **MCP de context7** (https://context7.com/). Antes de proponer
código para las dependencias listadas abajo, consulta la documentación de la **versión exacta
instalada** — no la última publicada, no la que recuerdes.

Este repo es, con diferencia, **el que más se aleja de los defaults del modelo**, y en direcciones
opuestas dentro del mismo árbol: el backend va en **Express 5** (por delante), y el frontend en
**Tailwind 3** y **ESLint 8 con `.eslintrc.json`** (por detrás). Ver la tabla de trampas.

### Flujo

1. `resolve-library-id` con el nombre de la librería.
2. `query-docs` con el ID resuelto, la versión de la tabla y el tema concreto.
3. Si la versión exacta no está indexada, usa la minor más cercana **por debajo** y di
   explícitamente en la respuesta qué versión consultaste.

Comprobar que está disponible antes de confiar en él: `claude mcp list` (o `opencode mcp list` en
OpenCode) → `context7` Connected. Si no lo está, **dilo en la respuesta** y sigue con conocimiento
propio; no finjas haberlo consultado.

⚠️ **El pin de versión no siempre filtra.** Verificado en otro repo con Express: consultando el ID
de la v4 seguían apareciendo snippets de la v5. **Si un resultado de context7 contradice la tabla de
trampas de abajo, manda la tabla.**

⚠️ **Los snippets no están escritos para `strict`.** La API que describen suele ser correcta, pero
omiten las guardas de null y fallan el typecheck. El síntoma engaña: parece un problema de versión y
no lo es.

### ⚠️ Tres paquetes, tres entornos distintos

No son intercambiables, y confundirlos es el error más fácil:

|                | `backend/` | `frontend/` | `video/`     |
| -------------- | ---------- | ----------- | ------------ |
| `engines.node` | **22.x**   | **24.x**    | sin declarar |
| React          | —          | **19.2.3**  | **19.2.4**   |
| TypeScript     | 5.9.3      | 5.9.3       | 5.9.3        |
| zod            | **4.3.5**  | **4.3.6**   | —            |
| Instalación    | propia     | propia      | propia       |

**`engines.node` difiere entre backend (22) y frontend (24)**: con `engine-strict` activo, usar el
Node equivocado hace fallar el install. Y las versiones de React y zod **no coinciden** entre
paquetes: no des por hecho que lo que compila en uno compila en otro.

### Versiones instaladas (fuente de verdad: `node_modules`, no los rangos `^`)

**`backend/`**

| Paquete              | Versión    | Nota                                                    |
| -------------------- | ---------- | ------------------------------------------------------- |
| `express`            | **5.2.1**  | ⚠️ **v5**, no v4 — ver trampas                          |
| `mysql2`             | **3.16.0** | SQL en crudo, sin ORM                                   |
| `zod`                | **4.3.5**  | ⚠️ **v4**                                               |
| `jose`               | **6.1.3**  | v6                                                      |
| `bcrypt`             | **6.0.0**  | ⚠️ **v6**                                               |
| `multer`             | **2.0.2**  | ⚠️ **v2**, no v1 — ver trampas                          |
| `express-rate-limit` | **8.2.1**  | v8 sobre Express 5                                      |
| `passport`           | **0.7.0**  | Pre-1.0                                                 |
| `dotenv`             | **17.2.3** | ⚠️ **v17** — muy por delante de los ejemplos habituales |
| `tsx`                | **4.21.0** | **No hay paso de build**: se ejecuta TypeScript directo |
| `typescript`         | **5.9.3**  |                                                         |
| `eslint`             | **8.57.1** | ⚠️ **v8 con `.eslintrc.json`** — ver trampas            |
| `@types/node`        | **25.0.5** | ⚠️ Tipos de Node 25 con `engines.node` **22.x**         |
| `@anthropic-ai/sdk`  | **0.71.2** | Pre-1.0: rompe entre minors                             |

**`frontend/`**

| Paquete                 | Versión     | Nota                                                         |
| ----------------------- | ----------- | ------------------------------------------------------------ |
| `next`                  | **16.1.1**  | App Router                                                   |
| `eslint-config-next`    | **15.5.9**  | 🔴 **Una major por detrás de `next`** — ver trampas          |
| `react` / `react-dom`   | **19.2.3**  | v19                                                          |
| `tailwindcss`           | **3.4.17**  | ⚠️ **v3, no v4.** Pineada exacta                             |
| `@tanstack/react-query` | **5.90.16** | v5                                                           |
| `zustand`               | **5.0.9**   | ⚠️ **v5**. Otros proyectos del propietario van en v4         |
| `zod`                   | **4.3.6**   | ⚠️ v4                                                        |
| `@noble/hashes`         | **2.0.1**   | ⚠️ **v2** — la API cambió respecto a v1                      |
| `serwist`               | **9.5.3**   | Con `@serwist/next` **9.5.6** (versiones distintas entre sí) |
| `eslint`                | **8.57.1**  | ⚠️ **v8 con `.eslintrc.json`**                               |
| `typescript`            | **5.9.3**   |                                                              |
| `@types/node`           | **25.0.5**  | ⚠️ Tipos de Node 25                                          |

**`video/`**

| Paquete    | Versión     | Nota                                    |
| ---------- | ----------- | --------------------------------------- |
| `remotion` | **4.0.242** | Con `@remotion/cli` en la misma versión |
| `react`    | **19.2.4**  | ⚠️ Distinta del frontend (19.2.3)       |

### Trampas de versión (consultar también — aquí el modelo suele asumir mal)

| Paquete              | Versión     | Trampa                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `express`            | **5.2.1**   | Es **v5**: los errores async **sí** se propagan solos (no hace falta wrapper), `req.query` es **de solo lectura**, y los patrones de ruta son de path-to-regexp v8 — **`*` suelto ya no vale**, hay que nombrar el comodín (`/*splat`). Es **lo contrario** de lo que aplica en Express 4, que es lo que devuelve casi todo ejemplo |
| `eslint`             | **8.57.1**  | 🔴 **v8 con `.eslintrc.json`**, no flat config. **Todos los demás repos del propietario van en ESLint 9/10 con `eslint.config.mjs`**. No conviertas a `defineConfig()` ni a flat: aquí no aplica                                                                                                                                    |
| `eslint-config-next` | **15.5.9**  | 🔴 **Desalineado con `next` 16.1.1**, una major entera por detrás. Si una regla de lint contradice la doc de Next 16, es esto. No lo "arregles" subiéndolo sin permiso                                                                                                                                                              |
| `tailwindcss`        | **3.4.17**  | Es **v3**: `tailwind.config` + directivas `@tailwind`. **NO** `@import "tailwindcss"` ni `@theme` de v4. Otros proyectos del propietario van en v4 — no copies de ellos                                                                                                                                                             |
| `zustand`            | **5.0.9**   | Es **v5**: exige `create<T>()(...)` currificado en TS y quitó los selectores por defecto. Los ejemplos de v4 no compilan aquí                                                                                                                                                                                                       |
| `multer`             | **2.0.2**   | Es **v2**: cambió el manejo de errores y opciones respecto a v1, que es lo que devuelve casi todo ejemplo                                                                                                                                                                                                                           |
| `bcrypt`             | **6.0.0**   | Es **v6**                                                                                                                                                                                                                                                                                                                           |
| `@noble/hashes`      | **2.0.1**   | Es **v2**: los subpaths y la API cambiaron respecto a v1                                                                                                                                                                                                                                                                            |
| `zod`                | **4.3.x**   | Es **v4**: `z.email()` de nivel superior, no `z.string().email()` (deprecado). Nada de la API v3                                                                                                                                                                                                                                    |
| `dotenv`             | **17.2.3**  | v17: el comportamiento por defecto de logs/override cambió respecto a las 8.x/16.x de los ejemplos                                                                                                                                                                                                                                  |
| `@anthropic-ai/sdk`  | **0.71.2**  | **Pre-1.0**: la API rompe entre minors. Verifica siempre contra esta versión exacta                                                                                                                                                                                                                                                 |
| `remotion`           | **4.0.242** | El manifest declara un rango más bajo; lo instalado es esto                                                                                                                                                                                                                                                                         |

### ⚠️ Los tipos de Node van por delante del Node que se ejecuta

`@types/node` es **25.0.5** en backend y frontend, pero `engines.node` es **22.x** en el backend.
Los tipos describen APIs que en Node 22 pueden no existir: si `tsc` acepta algo del runtime de Node,
verifícalo contra la doc de **Node 22**, no contra lo que permita el autocompletado. **No lo
"arregles" por iniciativa propia**: es decisión del propietario.

### ⚠️ Los routers de Express necesitan anotación de tipo explícita

Comprobado escribiendo un router nuevo: `const router = Router()` **no compila**. Da

```
error TS2742: The inferred type of 'router' cannot be named without a reference to
'.pnpm/@types+express-serve-static-core@5.1.0/…'. This is likely not portable.
```

Es la combinación de los tipos de Express 5 con el `node_modules` **aislado de pnpm**: TS no puede
nombrar el tipo inferido. La forma correcta, y la que **ya usan todos los routers del repo**, es:

```ts
import { Router } from "express";
const router: Router = Router();
```

Ningún ejemplo publicado de Express trae esa anotación, porque asumen `node_modules` plano. **Si
copias un router de la doc, añádela.**

### ⚠️ Línea base de las comprobaciones — `backend` ya sale en rojo

Medido con el árbol limpio (2026-07-27):

| Comando                        | Resultado                                              |
| ------------------------------ | ------------------------------------------------------ |
| `cd backend && pnpm typecheck` | ✅ **0 errores**                                       |
| `cd backend && pnpm lint`      | 🔴 **43 errores**, todos `prettier/prettier` (formato) |

Los 43 están repartidos por 14 archivos de `controllers/`, `validators/`, `scripts/` y
`services/import/`. **Son preexistentes**: si tras un cambio siguen siendo 43, no los has provocado
tú. Lo que no vale es **subir** esa cifra. Y **no los arregles en masa** con `--fix`: ensuciaría el
diff de cualquier tarea con cientos de líneas de formato ajenas al cambio.

Nota: el backend usa **estilo sin punto y coma**. Si escribes con `;`, el lint te marcará cada línea.

### Comprobaciones antes de dar algo por bueno

```bash
cd backend  && pnpm typecheck   # tsc --noEmit
cd frontend && pnpm lint        # eslint
cd frontend && pnpm build       # next build (es lo que detecta los errores de tipos)
```

**No hay suite de tests automatizada.** Eso hace que estos tres comandos sean el único filtro: pásalos
siempre, y no des por verificado nada que no los haya pasado.

### Límites

- context7 sirve para **verificar**, no para migrar. No apliques cambios de versión ni
  "modernices" código que funciona sin que se pida explícitamente. En concreto: **no propongas
  subir a Tailwind 4, ni migrar ESLint a flat config, ni alinear `eslint-config-next` con Next 16.**
- Si la doc actual recomienda un patrón distinto al que ya usa el repo, **no reescribas**:
  señálalo y sigue la convención existente salvo que el propietario decida lo contrario.
- Activación **reactiva y acotada**: solo código nuevo o modificado en la tarea en curso.
  Nunca como barrido ("revisa todo el proyecto contra la doc actual").
- No lo uses para lógica de negocio, refactors o debugging propio — solo para la API de la librería.
- **Este repositorio es PÚBLICO.** No añadas a este archivo, ni a ningún otro versionado, detalles
  de arquitectura de seguridad, nombres de variables de entorno, esquemas de base de datos ni rutas
  locales. Si necesitas ese contexto, está fuera del control de versiones.

## Convenciones

- Mensajes de commit **en inglés**, imperativo, asunto conciso + cuerpo cuando el cambio no sea
  trivial. **Nunca** `Co-Authored-By` ni "Generated with…".
- No se hace `push` sin OK explícito del propietario. Los commits locales se acumulan.
- Formato de Markdown: Prettier por defecto. Tablas estilo GitHub-flavored.
