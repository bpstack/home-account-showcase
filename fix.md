# Guía de Implementación: Fix del Unlocker + PIN Universal

## Resumen del problema

Hay **3 bugs encadenados** que permiten acceder a la app con contraseña/PIN incorrectos:

1. `deriveAndSetUserKey()` pone `isUnlocked = true` **antes** de verificar nada (Argon2id siempre produce una CryptoKey válida con cualquier input)
2. `unlockAccounts()` captura errores de AES-GCM individualmente y los ignora
3. El layout detecta `isUnlocked = true` y redirige al dashboard **antes** de que `unlockAccounts` termine

**Resultado:** El usuario entra al dashboard con 0 cuentas desbloqueadas.

## Objetivos

- [x] Mantener la UX actual (pedir PIN/password en cada F5)
- [x] Que el unlock funcione de verdad (PIN incorrecto = error, no acceso)
- [x] Verification Blob: feedback instantáneo de "PIN incorrecto" sin intentar descifrar Account Keys
- [x] PIN universal 6-8 dígitos numéricos para todos los usuarios (login normal y OAuth)
- [x] Cambiar PIN desde `/profile?panel=settings&tab=security`
- [x] Validación Zod en backend y frontend

---

## FASE 1: Migración de BD — Nuevo campo `verification_blob` ✅ COMPLETADA

### 1.1 SQL Migration ✅

~~Crear archivo: `docs/modules/backend/mysql/15_verification_blob.sql`~~

```sql
ALTER TABLE users ADD COLUMN verification_blob TEXT NULL AFTER key_salt;
```

**Ejecutado en Aiven/MySQL** — 2026-02-12. Verificado:
- Columna `verification_blob` (TEXT, NULL) creada después de `key_salt`
- Todos los usuarios existentes tienen `verification_blob = NULL` (migración suave)
- Documentación actualizada en: `docs/modules/backend/mysql/15_verification_blob.sql`, `01_users.sql`, `schema.sql`

**¿Qué es?** Un texto conocido (`"HOME_ACCOUNT_VERIFIED_2026"`) cifrado con la User Key. Si al descifrar con un PIN da ese texto, el PIN es correcto. Si AES-GCM falla → PIN incorrecto. Feedback instantáneo sin tocar Account Keys.

---

## FASE 2: Backend

### 2.1 Nuevo validator para PIN — `backend/validators/auth-validators.ts`

Añadir al final del archivo:

```typescript
/**
 * Schema de validación para PIN (6-8 dígitos numéricos)
 */
export const pinSchema = z.object({
  pin: z
    .string()
    .min(6, 'El PIN debe tener al menos 6 dígitos')
    .max(8, 'El PIN debe tener máximo 8 dígitos')
    .regex(/^\d+$/, 'El PIN solo puede contener números'),
})

/**
 * Schema para cambiar PIN (requiere verificación actual)
 */
export const changePinSchema = z.object({
  currentPassword: z.string().min(1, 'Se requiere la contraseña o PIN actual'),
  newPin: z
    .string()
    .min(6, 'El PIN debe tener al menos 6 dígitos')
    .max(8, 'El PIN debe tener máximo 8 dígitos')
    .regex(/^\d+$/, 'El PIN solo puede contener números'),
  newKeySalt: z.string().min(1, 'Se requiere el nuevo salt'),
  verificationBlob: z.string().min(1, 'Se requiere el verification blob'),
  reEncryptedKeys: z.array(
    z.object({
      accountId: z.string(),
      encryptedKey: z.string(),
    })
  ),
})

export type PinInput = z.infer<typeof pinSchema>
export type ChangePinInput = z.infer<typeof changePinSchema>
```

### 2.2 Nuevo endpoint: `POST /api/auth/change-pin` — `backend/controllers/auth/auth-controller.ts`

Añadir este nuevo export al final del archivo (antes del `export const logout`):

```typescript
export const changePin = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = changePinSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw new AppError(validationResult.error.issues[0]?.message || 'Invalid data', 400)
  }

  const { currentPassword, newPin, newKeySalt, verificationBlob, reEncryptedKeys } =
    validationResult.data

  await UserRepository.changePin(
    req.user!.id,
    currentPassword,
    newPin,
    newKeySalt,
    verificationBlob,
    reEncryptedKeys
  )

  // Limpiar cookies para forzar re-login (misma lógica que changePassword)
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
  res.clearCookie('csrfToken', { path: '/' })

  res.status(200).json({
    success: true,
    message: 'PIN changed successfully. Please log in again.',
  })
})
```

**No olvides** importar `changePinSchema` en los imports del archivo:

```typescript
import {
  registerSchema,
  loginSchema,
  changePinSchema,       // ← NUEVO
  type RegisterInput,
  type LoginInput,
  type ChangePinInput,   // ← NUEVO
} from '../../validators/auth-validators.js'
```

### 2.3 Nuevo método en repositorio: `UserRepository.changePin` — `backend/repositories/auth/user-repository.ts`

Añadir este método en la clase `UserRepository` (después de `changePassword`):

```typescript
/**
 * Cambiar PIN de cifrado E2E
 * - Verifica password/PIN actual (bcrypt)
 * - Hashea el nuevo PIN como password_hash (si era OAuth sin password, ahora tendrá uno)
 * - Actualiza key_salt, verification_blob y re-cifra Account Keys
 */
static async changePin(
  id: string,
  currentPassword: string,
  newPin: string,
  newKeySalt: string,
  verificationBlob: string,
  reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }>
): Promise<boolean> {
  const connection = await db.getConnection()

  try {
    // Verificar password/PIN actual
    const [rows] = await connection.query<UserRow[]>(
      `SELECT password_hash FROM users WHERE id = ?`,
      [id]
    )

    const user = rows[0]
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Si el usuario tiene password_hash, verificarlo
    // Si no (OAuth puro que sólo tenía PIN en setup-pin), no podemos verificar con bcrypt
    // porque el PIN original nunca se hasheó en el backend
    if (user.password_hash) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash)
      if (!isValid) {
        throw new AppError('Current password/PIN is incorrect', 401)
      }
    }
    // NOTA: Si password_hash es NULL (usuario OAuth sin password),
    // la verificación real se hace en el frontend con el verification_blob.
    // El backend confía en que si el frontend pudo descifrar las Account Keys
    // con el PIN actual, el PIN era correcto.

    await connection.beginTransaction()

    // Hashear el nuevo PIN como password_hash
    const hashedPin = await bcrypt.hash(newPin, SALT_ROUNDS)

    // Actualizar password_hash, key_salt y verification_blob
    await connection.query(
      `UPDATE users 
       SET password_hash = ?, key_salt = ?, verification_blob = ?, updated_at = NOW() 
       WHERE id = ?`,
      [hashedPin, newKeySalt, verificationBlob, id]
    )

    // Actualizar Account Keys re-cifradas
    for (const key of reEncryptedKeys) {
      await connection.query(
        `UPDATE account_keys
         SET encrypted_key = ?, key_version = key_version + 1
         WHERE account_id = ? AND user_id = ?`,
        [key.encryptedKey, key.accountId, id]
      )
    }

    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
```

### 2.4 Actualizar `getKeys` para devolver `verification_blob`

En `backend/controllers/auth/auth-controller.ts`, modifica `getKeys`:

```typescript
export const getKeys = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserRepository.getByIdWithKeySalt(req.user!.id)
  if (!user) {
    throw new AppError('User not found', 404)
  }

  const encryptedKeys = await AccountKeyRepository.getByUserId(req.user!.id)

  res.status(200).json({
    success: true,
    key_salt: user.key_salt,
    verification_blob: user.verification_blob,   // ← NUEVO
    encrypted_keys: encryptedKeys,
  })
})
```

Para que esto funcione, necesitas que `getByIdWithKeySalt` también devuelva `verification_blob`.

### 2.5 Actualizar `getByIdWithKeySalt` en `user-repository.ts`

Busca el método `getByIdWithKeySalt` y modifica el SELECT:

```typescript
static async getByIdWithKeySalt(id: string): Promise<(User & { key_salt: string; verification_blob: string | null }) | null> {
  const [rows] = await db.query<UserRow[]>(
    `SELECT id, email, name, key_salt, verification_blob, created_at, updated_at
     FROM users
     WHERE id = ?`,
    [id]
  )

  return rows[0] || null
}
```

### 2.6 Actualizar `login` response para incluir `verification_blob`

En `auth-controller.ts`, modifica el response del `login`:

```typescript
// En la función login, justo después de obtener encryptedKeys:
const userFull = await UserRepository.getByIdWithKeySalt(userWithSalt.id)

res.status(200).json({
  success: true,
  user,
  key_salt: userWithSalt.key_salt,
  verification_blob: userFull?.verification_blob || null,   // ← NUEVO
  encrypted_keys: encryptedKeys,
  csrfToken,
})
```

### 2.7 Actualizar `register` para generar `verification_blob`

En el flow de registro normal (email+password), el frontend enviará el `verification_blob` como parte del body.

En `backend/validators/auth-validators.ts`, añade al `registerSchema`:

```typescript
export const registerSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  accountName: z.string().max(100, 'El nombre de la cuenta es muy largo').optional(),
  skipDefaultAccount: z.boolean().optional(),
  encryptedAccountKey: z.string().optional(),
  verificationBlob: z.string().optional(),   // ← NUEVO
})
```

En `UserRepository.create()`, guarda el `verificationBlob`:

```typescript
// En la query INSERT de create():
await connection.query(
  `INSERT INTO users (id, email, password_hash, key_salt, verification_blob, name)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [userId, email, hashedPassword, keySalt, encryptedAccountKey ? null : null, name]
)
```

**Mejor enfoque:** El `verification_blob` se genera en el **frontend** después de derivar la User Key y se envía al backend. Hay dos opciones:

**Opción A (recomendada):** Guardar el blob en el registro. Esto requiere que el frontend derive la UK durante el registro, genere el blob y lo envíe al backend. El backend lo guarda en `users.verification_blob`.

Modifica el `INSERT` en `UserRepository.create()`:

```typescript
// Añade verificationBlob al DTO y al INSERT
await connection.query(
  `INSERT INTO users (id, email, password_hash, key_salt, verification_blob, name)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [userId, email, hashedPassword, keySalt, verificationBlob || null, name]
)
```

Añade `verificationBlob?: string` al tipo `RegisterDTO` en `backend/models/auth/index.ts` (busca la interface).

### 2.8 Ruta nueva — `backend/routes/auth/auth-routes.ts`

Añadir la ruta:

```typescript
import { register, login, me, logout, refresh, getKeys, changePassword, changePin } from '../../controllers/auth/auth-controller.js'

// ... rutas existentes ...

// Añadir después de change-password:
router.post('/change-pin', authenticateToken, checkCSRF, changePin)
```

### 2.9 Endpoint para guardar `verification_blob` (para usuarios existentes y setup-pin)

Necesitas un endpoint que permita guardar SOLO el `verification_blob` sin cambiar password. Esto es para:
- Usuarios existentes que no tenían blob (migración suave)
- `setup-pin` de usuarios OAuth

Añade en `auth-controller.ts`:

```typescript
export const saveVerificationBlob = asyncHandler(async (req: Request, res: Response) => {
  const { verificationBlob } = req.body

  if (!verificationBlob || typeof verificationBlob !== 'string') {
    throw new AppError('Verification blob is required', 400)
  }

  await db.query(
    `UPDATE users SET verification_blob = ? WHERE id = ?`,
    [verificationBlob, req.user!.id]
  )

  res.status(200).json({ success: true })
})
```

Y la ruta:

```typescript
router.post('/verification-blob', authenticateToken, checkCSRF, saveVerificationBlob)
```

Importa `db` en el controller si no está ya (`import db from '../../config/db.js'`).

---

## FASE 3: Frontend — Crypto

### 3.1 Nueva función en `frontend/lib/crypto.ts` — Generar/Verificar Blob

Añade estas dos funciones al final de la sección "DATA ENCRYPTION":

```typescript
// ============================================
// VERIFICATION BLOB
// ============================================

const VERIFICATION_PLAINTEXT = 'HOME_ACCOUNT_VERIFIED_2026'

/**
 * Genera un verification blob cifrando un texto conocido con la User Key.
 * Se almacena en BD. Al unlock, se intenta descifrar:
 * - Si da VERIFICATION_PLAINTEXT → PIN correcto
 * - Si AES-GCM falla → PIN incorrecto
 */
export async function generateVerificationBlob(userKey: CryptoKey): Promise<string> {
  return encrypt(VERIFICATION_PLAINTEXT, userKey)
}

/**
 * Verifica si un PIN/password es correcto intentando descifrar el blob.
 * @returns true si el PIN es correcto, false si no
 */
export async function verifyUserKey(
  verificationBlob: string,
  userKey: CryptoKey
): Promise<boolean> {
  try {
    const result = await decrypt(verificationBlob, userKey)
    return result === VERIFICATION_PLAINTEXT
  } catch {
    return false
  }
}
```

**Exporta** también `VERIFICATION_PLAINTEXT` o no (mejor no, es un detalle interno).

### 3.2 Fix del `cryptoStore.ts` — Separar derivación de unlock

Este es el cambio más importante. En `frontend/stores/cryptoStore.ts`:

#### 3.2.1 Cambiar `deriveAndSetUserKey` — NO poner `isUnlocked = true`

```typescript
deriveAndSetUserKey: async (password: string, salt: string) => {
  set({ isUnlocking: true, error: null })
  try {
    const userKey = await deriveUserKey(password, salt)
    // ⚠️ CAMBIO: Solo guarda userKey, NO pone isUnlocked = true
    set({ userKey, isUnlocking: false })
  } catch (error) {
    set({ error: 'Error al derivar clave de usuario', isUnlocking: false })
    throw error
  }
},
```

#### 3.2.2 Cambiar `unlockAccounts` — Modo estricto (all-or-nothing)

```typescript
unlockAccounts: async (accounts) => {
  const { userKey } = get()
  if (!userKey) throw new Error('User key not available')

  const newAccountKeys = new Map<string, AccountKeyInfo>()

  // Descifrar todas las cuentas — si UNA falla, TODAS fallan
  for (const { accountId, encryptedKey, keyVersion } of accounts) {
    try {
      const accountKey = await decryptAccountKey(encryptedKey, userKey)
      newAccountKeys.set(accountId, { key: accountKey, version: keyVersion })
    } catch (e) {
      // PIN incorrecto — limpiar todo y lanzar error
      set({ userKey: null, accountKeys: new Map(), isUnlocked: false, error: 'Wrong password' })
      throw new Error('Wrong password')
    }
  }

  // TODAS las cuentas se descifraron → ahora sí, isUnlocked = true
  set({ accountKeys: newAccountKeys, isUnlocked: true })
},
```

**Nota:** Se eliminó `setUnlocked()` como acción separada. Ahora `isUnlocked = true` solo se pone al final de `unlockAccounts` si todo fue bien.

#### 3.2.3 Eliminar la acción `setUnlocked`

Elimina de la interface `CryptoActions`:

```typescript
// ELIMINAR esta línea:
setUnlocked: () => void
```

Y del store:

```typescript
// ELIMINAR este bloque:
setUnlocked: () => {
  set({ isUnlocked: true, error: null })
},
```

**Cuidado:** `setUnlocked()` se usa en `setup-pin/page.tsx`. Hay que cambiarlo (ver Fase 4).

### 3.3 Actualizar `useAuth.ts` — Función `unlock` con verification blob

```typescript
const unlock = async (password: string) => {
  const cryptoStore = useCryptoStore.getState()

  // 1. Fetch keys + verification_blob del backend
  const { key_salt, verification_blob, encrypted_keys } = await auth.getKeys()

  if (!key_salt || !encrypted_keys || encrypted_keys.length === 0) {
    throw new Error('No encryption keys found')
  }

  // 2. Derivar User Key (NO pone isUnlocked = true)
  await cryptoStore.deriveAndSetUserKey(password, key_salt)

  // 3. Verificar con blob ANTES de intentar descifrar Account Keys
  if (verification_blob) {
    const userKey = useCryptoStore.getState().userKey
    if (!userKey) throw new Error('User key not available')

    const isValid = await verifyUserKey(verification_blob, userKey)
    if (!isValid) {
      cryptoStore.lock()  // Limpiar todo
      throw new Error('Wrong password')
    }
  }

  // 4. Descifrar Account Keys (pone isUnlocked = true al final)
  await cryptoStore.unlockAccounts(
    encrypted_keys.map((k) => ({
      accountId: k.account_id,
      encryptedKey: k.encrypted_key,
      keyVersion: k.key_version,
    }))
  )
}
```

**Importar** `verifyUserKey` desde `@/lib/crypto`:

```typescript
import { verifyUserKey } from '@/lib/crypto'
```

### 3.4 Actualizar `login` en `useAuth.ts`

En la función `login`, el flujo es similar. Busca el bloque `// 🔐 ENCRYPTION` y cámbialo:

```typescript
// 🔐 ENCRYPTION: Derive User Key and unlock accounts
if (key_salt && encrypted_keys && encrypted_keys.length > 0) {
  const cryptoStore = useCryptoStore.getState()

  // Derive UK from password (ya no pone isUnlocked = true)
  await cryptoStore.deriveAndSetUserKey(password, key_salt)

  // Unlock all accounts (pone isUnlocked = true al final si todo va bien)
  await cryptoStore.unlockAccounts(
    encrypted_keys.map((k) => ({
      accountId: k.account_id,
      encryptedKey: k.encrypted_key,
      keyVersion: k.key_version,
    }))
  )
}
```

No necesitas verificar el blob aquí porque el backend ya validó el password con bcrypt.

### 3.5 Actualizar `register` en `useAuth.ts`

Después de `deriveAndSetUserKey` en el registro, genera y envía el verification blob:

```typescript
// 🔐 ENCRYPTION: Set up crypto store after registration
if (key_salt) {
  const cryptoStore = useCryptoStore.getState()
  await cryptoStore.deriveAndSetUserKey(password, key_salt)

  if (accountId && !options?.skipDefaultAccount) {
    const encKey = await cryptoStore.createAccountKey(accountId)
    await accounts.saveAccountKey(accountId, encKey)
  }

  // Generar y guardar verification blob
  const userKey = useCryptoStore.getState().userKey
  if (userKey) {
    const blob = await generateVerificationBlob(userKey)
    await auth.saveVerificationBlob(blob)
  }

  // Marcar como desbloqueado manualmente (register no pasa por unlockAccounts)
  // Necesitas mantener un método para esto — ver nota abajo
}
```

**Nota:** En el registro, no hay Account Keys que descifrar (se acaban de crear). Necesitas un método `setUnlockedAfterRegistration()` o simplemente hacer `set({ isUnlocked: true })` directamente. Puedes renombrar `setUnlocked` a algo como `forceUnlockAfterSetup` y usarlo solo en registro y setup-pin:

```typescript
// En cryptoStore:
forceUnlockAfterSetup: () => {
  const { userKey } = get()
  if (!userKey) throw new Error('Cannot force unlock without user key')
  set({ isUnlocked: true, error: null })
},
```

### 3.6 Actualizar `apiClient.ts` — Nuevas funciones auth

Añade al objeto `auth` en `frontend/lib/apiClient.ts`:

```typescript
// Dentro del objeto auth = { ... }

getKeys: async () => {
  const response = await fetch(`${AUTH_PROXY_URL}/keys`, {
    method: 'GET',
    credentials: 'include',
  })
  const data = await response.json()
  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Error al obtener claves')
  }

  return data as {
    success: boolean
    key_salt: string
    verification_blob: string | null    // ← NUEVO
    encrypted_keys: Array<{
      account_id: string
      encrypted_key: string
      key_version: number
    }>
  }
},

// ← NUEVO: Cambiar PIN
changePin: async (
  currentPassword: string,
  newPin: string,
  newKeySalt: string,
  verificationBlob: string,
  reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }>
) => {
  const csrfToken = getCSRFToken()
  const response = await fetch(`${AUTH_PROXY_URL}/change-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify({ currentPassword, newPin, newKeySalt, verificationBlob, reEncryptedKeys }),
    credentials: 'include',
  })
  const data = await response.json()
  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Error al cambiar PIN')
  }
  if (typeof window !== 'undefined') {
    document.cookie = 'csrfToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
  return data as { success: boolean; message: string }
},

// ← NUEVO: Guardar verification blob
saveVerificationBlob: async (verificationBlob: string) => {
  const csrfToken = getCSRFToken()
  const response = await fetch(`${AUTH_PROXY_URL}/verification-blob`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify({ verificationBlob }),
    credentials: 'include',
  })
  const data = await response.json()
  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Error al guardar blob de verificación')
  }
  return data as { success: boolean }
},
```

### 3.7 Proxy route en Next.js

Comprueba que tu proxy en `frontend/app/api/proxy/` reenvía correctamente las nuevas rutas `/auth/change-pin` y `/auth/verification-blob`. Si el proxy es un catch-all (`[...path]/route.ts`), no necesitas hacer nada. Si son rutas explícitas, añade las nuevas.

---

## FASE 4: Frontend — UI del PIN en SecuritySettings

### 4.1 Reemplazar `SecuritySettings` en `SettingsPanel.tsx`

Reemplaza el componente `SecuritySettings` completo con esta nueva versión que tiene **dos secciones**: cambiar contraseña (para usuarios con login normal) y cambiar PIN (para todos):

```tsx
function SecuritySettings() {
  const router = useRouter()
  const { user } = useAuth()

  // Detectar tipo de usuario
  // Si oauth_provider existe y no es 'local', es OAuth
  // TODO: Necesitarás exponer oauth_provider en el user object desde el backend
  // Por ahora, todos los usuarios ven la sección de PIN

  return (
    <div className="space-y-6">
      <ChangePinSection />
      <ChangePasswordSection />
    </div>
  )
}

function ChangePinSection() {
  const router = useRouter()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Validación local del PIN (misma que Zod en backend)
  const validatePin = (pin: string): string | null => {
    if (pin.length < 6) return 'El PIN debe tener al menos 6 dígitos'
    if (pin.length > 8) return 'El PIN debe tener máximo 8 dígitos'
    if (!/^\d+$/.test(pin)) return 'El PIN solo puede contener números'
    return null
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validar PIN nuevo
    const pinError = validatePin(newPin)
    if (pinError) {
      setMessage({ type: 'error', text: pinError })
      return
    }

    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'Los PINs no coinciden' })
      return
    }

    setIsLoading(true)

    try {
      // 1. Obtener datos actuales
      const keysData = await auth.getKeys()
      const { key_salt: currentKeySalt, encrypted_keys } = keysData

      if (!encrypted_keys || encrypted_keys.length === 0) {
        setMessage({ type: 'error', text: 'No hay claves de cifrado configuradas' })
        setIsLoading(false)
        return
      }

      // 2. Derivar UK actual con el PIN/password actual
      const currentUK = await deriveUserKey(currentPin, currentKeySalt)

      // 3. Verificar que el PIN actual es correcto intentando descifrar una Account Key
      try {
        await decryptAccountKey(encrypted_keys[0].encrypted_key, currentUK)
      } catch {
        setMessage({ type: 'error', text: 'PIN o contraseña actual incorrectos' })
        setIsLoading(false)
        return
      }

      // 4. Generar nuevo salt y derivar nueva UK
      const newKeySalt = generateKeySalt()
      const newUK = await deriveUserKey(newPin, newKeySalt)

      // 5. Generar verification blob con la nueva UK
      const verificationBlob = await generateVerificationBlob(newUK)

      // 6. Re-cifrar todas las Account Keys
      const reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }> = []

      for (const key of encrypted_keys) {
        const decryptedAK = await decryptAccountKey(key.encrypted_key, currentUK)
        const reEncryptedAK = await encryptAccountKey(decryptedAK, newUK)
        reEncryptedKeys.push({
          accountId: key.account_id,
          encryptedKey: reEncryptedAK,
        })
      }

      // 7. Enviar al backend
      await auth.changePin(currentPin, newPin, newKeySalt, verificationBlob, reEncryptedKeys)

      // 8. Limpiar crypto store
      useCryptoStore.getState().lock()

      setMessage({
        type: 'success',
        text: 'PIN cambiado correctamente. Redirigiendo a login...',
      })

      setTimeout(() => router.push('/login'), 2000)
    } catch (error) {
      const err = error as Error
      setMessage({ type: 'error', text: err.message || 'Error al cambiar el PIN' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Cambiar PIN de cifrado</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          El PIN protege tus datos cifrados. Se te pedirá cada vez que inicies sesión o recargues la página.
        </p>
      </div>

      <div className="p-4">
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePin} className="space-y-4">
          <Input
            id="currentPin"
            type="password"
            label="PIN o contraseña actual"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Input
            id="newPin"
            type="password"
            label="Nuevo PIN (6-8 dígitos)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            required
            inputMode="numeric"
            maxLength={8}
            placeholder="••••••"
          />

          <Input
            id="confirmPin"
            type="password"
            label="Confirmar nuevo PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            required
            inputMode="numeric"
            maxLength={8}
            placeholder="••••••"
          />

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Importante:</strong> Al cambiar tu PIN, se re-cifrarán todas tus claves de cuenta,
              se cerrará tu sesión y deberás volver a iniciar sesión con el nuevo PIN.
            </p>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Cambiando PIN...' : 'Cambiar PIN'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

**Imports necesarios** (añadir al inicio de `SettingsPanel.tsx` si no están):

```typescript
import { deriveUserKey, encryptAccountKey, decryptAccountKey, generateKeySalt, generateVerificationBlob } from '@/lib/crypto'
```

### 4.2 Actualizar `ChangePasswordSection` (antiguo `SecuritySettings`)

Renombra la función `SecuritySettings` actual a `ChangePasswordSection`. Mantén la lógica existente pero añade el `verificationBlob` al cambiar contraseña:

En el bloque donde genera `newKeySalt` y re-cifra, añade:

```typescript
// Después de generar newUK:
const verificationBlob = await generateVerificationBlob(newUK)

// Pasar verificationBlob al backend (necesitarás modificar también changePassword en el backend)
await auth.changePassword(currentPassword, newPassword, newKeySalt, reEncryptedKeys, verificationBlob)
```

O simplemente, si prefieres no tocar `changePassword`, puedes llamar a `auth.saveVerificationBlob(blob)` justo después del `changePassword`.

### 4.3 Actualizar `setup-pin/page.tsx`

Cambia `setUnlocked()` por `forceUnlockAfterSetup()` y añade la generación del blob:

```typescript
// En el handleSubmit:
await deriveAndSetUserKey(pin, keysData.key_salt)
await generateAndSaveAccountKey(csrfToken || undefined)

// Generar y guardar verification blob
const userKey = useCryptoStore.getState().userKey
if (userKey) {
  const blob = await generateVerificationBlob(userKey)
  // Guardar en backend (necesitas CSRF token)
  await fetch('/api/proxy/auth/verification-blob', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify({ verificationBlob: blob }),
    credentials: 'include',
  })
}

// Usar forceUnlockAfterSetup en vez de setUnlocked
useCryptoStore.getState().forceUnlockAfterSetup()
```

---

## FASE 5: Resumen de todos los archivos que tocar

### Backend (6 archivos)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `validators/auth-validators.ts` | Añadir `pinSchema`, `changePinSchema`, `verificationBlob` en `registerSchema` |
| 2 | `controllers/auth/auth-controller.ts` | Añadir `changePin`, `saveVerificationBlob`. Modificar `getKeys` y `login` para incluir `verification_blob` |
| 3 | `repositories/auth/user-repository.ts` | Añadir `changePin()`. Modificar `getByIdWithKeySalt()` para incluir `verification_blob`. Añadir `verificationBlob` al `create()` |
| 4 | `routes/auth/auth-routes.ts` | Añadir rutas `/change-pin` y `/verification-blob` |
| 5 | `models/auth/index.ts` | Añadir `verification_blob` al tipo `User`/`UserRow` y `RegisterDTO` |
| 6 | **SQL** | `ALTER TABLE users ADD COLUMN verification_blob TEXT NULL` |

### Frontend (6 archivos)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `lib/crypto.ts` | Añadir `generateVerificationBlob()` y `verifyUserKey()` |
| 2 | `stores/cryptoStore.ts` | Fix `deriveAndSetUserKey` (no poner isUnlocked), fix `unlockAccounts` (all-or-nothing), eliminar `setUnlocked`, añadir `forceUnlockAfterSetup` |
| 3 | `hooks/useAuth.ts` | Fix `unlock()` con verification blob. Fix `login()`. Fix `register()` para generar blob |
| 4 | `lib/apiClient.ts` | Añadir `auth.changePin()`, `auth.saveVerificationBlob()`. Actualizar tipo de retorno de `auth.getKeys()` |
| 5 | `components/profile/SettingsPanel.tsx` | Nueva sección `ChangePinSection`. Imports de crypto |
| 6 | `app/(public)/setup-pin/page.tsx` | Usar `forceUnlockAfterSetup()`, generar verification blob |

---

## Orden de implementación recomendado

```
1. SQL Migration (1 min)
   └── ALTER TABLE users ADD COLUMN verification_blob TEXT NULL

2. Backend models (5 min)
   └── Actualizar types/interfaces con verification_blob

3. Backend validators (5 min)
   └── Añadir pinSchema, changePinSchema

4. Backend repository (15 min)
   └── changePin(), getByIdWithKeySalt(), create() con blob

5. Backend controller (10 min)
   └── changePin, saveVerificationBlob, actualizar getKeys y login

6. Backend routes (2 min)
   └── Añadir las 2 rutas nuevas

7. Frontend crypto.ts (5 min)
   └── generateVerificationBlob(), verifyUserKey()

8. Frontend cryptoStore.ts (10 min)
   └── Fix deriveAndSetUserKey, fix unlockAccounts, forceUnlockAfterSetup

9. Frontend useAuth.ts (10 min)
   └── Fix unlock(), login(), register()

10. Frontend apiClient.ts (5 min)
    └── changePin(), saveVerificationBlob(), actualizar getKeys type

11. Frontend SettingsPanel.tsx (15 min)
    └── ChangePinSection component

12. Frontend setup-pin/page.tsx (5 min)
    └── forceUnlockAfterSetup + verification blob

13. Testing manual (15 min)
    └── Ver checklist abajo
```

**Tiempo estimado total: ~1.5-2 horas**

---

## Checklist de testing

- [ ] **Registro nuevo usuario** → se crea `verification_blob` en BD → accede al dashboard
- [ ] **Login con password correcto** → desbloquea → dashboard
- [ ] **F5 en dashboard** → va a `/unlock` → PIN/password correcto → vuelve al dashboard
- [ ] **F5 en dashboard** → va a `/unlock` → PIN/password **incorrecto** → muestra "Contraseña incorrecta" → **NO accede**
- [ ] **OAuth login (Google)** → `setup-pin` → crea PIN → dashboard → F5 → unlock con PIN → funciona
- [ ] **OAuth login** → F5 → unlock con PIN **incorrecto** → error → **NO accede**
- [ ] **Cambiar PIN** en `/profile?panel=settings&tab=security` → introduce PIN actual + nuevo PIN → success → redirige a login → login con nuevo PIN → funciona
- [ ] **Cambiar PIN con PIN actual incorrecto** → muestra error → no cambia nada
- [ ] **Verificar en BD** que `verification_blob` se actualiza al cambiar PIN
- [ ] **Verificar en BD** que `key_salt` se actualiza al cambiar PIN
- [ ] **Verificar en BD** que `account_keys.encrypted_key` se actualiza al cambiar PIN

---

## Notas importantes

1. **Los usuarios existentes sin `verification_blob`**: El sistema funciona sin blob (el `if (verification_blob)` lo hace opcional). La primera vez que cambien PIN o contraseña, se generará. También puedes correr un script de migración que les pida re-logear.

2. **`inputMode="numeric"`** en los inputs de PIN muestra el teclado numérico en móviles.

3. ~~**El PIN se hashea con bcrypt en el backend** (`password_hash`), así que para usuarios OAuth que antes no tenían password, ahora tendrán su PIN hasheado ahí. Esto permite verificar el PIN actual en el backend al cambiarlo.~~ **CORREGIDO** — ver FASE 6.

4. **No toques el layout** (`app/(private)/layout.tsx`). El fix está en que `isUnlocked` ya no se pone a `true` prematuramente.

---

## FASE 6: Separación PIN ≠ Contraseña ✅ COMPLETADA

**Fecha:** 2026-02-12
**Problema detectado:** Al cambiar el PIN en `/profile?panel=settings&tab=security`, `changePin()` sobrescribía `password_hash` con `bcrypt(newPin)`, destruyendo la contraseña de login del usuario.

### 6.1 Diseño: Dos conceptos independientes

```
┌─────────────────────────────────────────────────────────────────┐
│               CONTRASEÑA vs PIN — Responsabilidades              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   CONTRASEÑA (password_hash)          PIN (key_salt + blob)      │
│   ─────────────────────────           ─────────────────────      │
│   • Autenticación (login)             • Cifrado E2E              │
│   • bcrypt hash en BD                 • Argon2id → User Key      │
│   • Solo usuarios locales             • TODOS los usuarios       │
│   • Se valida en backend              • Se valida en frontend    │
│     (bcrypt.compare)                    (verification blob)      │
│   • Cambiar: POST /change-password    • Cambiar: POST /change-pin│
│   • NO toca key_salt ni keys          • NO toca password_hash    │
│                                                                  │
│   OAuth users: password_hash = NULL   OAuth users: PIN obligatorio│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Cambios realizados

#### Backend — `user-repository.ts` → `changePin()`

**Antes (bug):**
```typescript
// ❌ Sobreescribía password_hash con bcrypt(newPin)
const hashedPin = await bcrypt.hash(newPin, SALT_ROUNDS)
await connection.query(
  `UPDATE users SET password_hash = ?, key_salt = ?, verification_blob = ? WHERE id = ?`,
  [hashedPin, newKeySalt, verificationBlob, id]
)
```

**Después (fix):**
```typescript
// ✅ Solo toca key_salt y verification_blob, NUNCA password_hash
await connection.query(
  `UPDATE users SET key_salt = ?, verification_blob = ?, updated_at = NOW() WHERE id = ?`,
  [newKeySalt, verificationBlob, id]
)
```

La verificación del PIN actual se hace en el **frontend** descifrando una Account Key con la UK derivada del PIN introducido. El endpoint está protegido por JWT + CSRF, por lo que no necesita verificación bcrypt adicional.

#### Backend — `user-repository.ts` → `login()`

Ahora el SELECT incluye `verification_blob` para que el frontend pueda verificar si la contraseña de login coincide con la fuente de cifrado:

```sql
SELECT id, email, name, password_hash, key_salt, verification_blob, created_at, updated_at
FROM users WHERE email = ?
```

#### Backend — `user-repository.ts` → `getById()`

Ahora devuelve `oauth_provider` para que el frontend sepa qué tipo de usuario es:

```sql
SELECT id, email, name, oauth_provider, created_at, updated_at
FROM users WHERE id = ?
```

#### Frontend — `useAuth.ts` → `login()`

El login ahora detecta si la contraseña de login es la misma que la fuente de cifrado:

```typescript
// Si hay verification_blob, verificar si password == fuente de cifrado
if (verification_blob) {
  const isValid = await verifyUserKey(verification_blob, userKey)
  if (!isValid) {
    // Password ≠ PIN → usuario tiene PIN separado
    // Queda autenticado pero locked → layout redirige a /unlock
    cryptoStore.lock()
  } else {
    // Password ES la fuente de cifrado → desbloquear normalmente
    await cryptoStore.unlockAccounts(...)
  }
}
```

#### Frontend — `SettingsPanel.tsx` → Sección de seguridad

- `ChangePinSection`: Visible para **todos** los usuarios. Cambia solo `key_salt` + `verification_blob` + re-cifra Account Keys.
- `ChangePasswordSection`: Visible solo para usuarios **no-OAuth** (`!user?.oauth_provider || user.oauth_provider === 'local'`).
- Si el usuario tiene PIN separado, cambiar contraseña solo cambia `password_hash` (autenticación), sin tocar el cifrado.

#### Frontend — `ChangePasswordSection` → Detección inteligente

Al cambiar la contraseña, el componente detecta si la contraseña actual es la fuente de cifrado:

```typescript
// Verificar si la contraseña es también la fuente de cifrado
if (verification_blob) {
  passwordIsEncryptionSource = await verifyUserKey(verification_blob, currentUK)
}

if (passwordIsEncryptionSource) {
  // Re-cifrar claves con nueva contraseña + generar nuevo verification blob
} else {
  // Solo cambiar password_hash, no tocar cifrado (user tiene PIN separado)
}
```

### 6.3 Matriz de flujos resultante

| Acción | Qué se modifica en BD | Qué NO se toca |
|--------|----------------------|-----------------|
| **Cambiar PIN** | `key_salt`, `verification_blob`, `account_keys.encrypted_key` | `password_hash` |
| **Cambiar contraseña** (sin PIN separado) | `password_hash`, `key_salt`, `verification_blob`, `account_keys.encrypted_key` | — |
| **Cambiar contraseña** (con PIN separado) | `password_hash` | `key_salt`, `verification_blob`, `account_keys.encrypted_key` |

### 6.4 Matriz de visibilidad en UI

| Tipo de usuario | Sección PIN | Sección Contraseña |
|-----------------|-------------|--------------------|
| Local (email/password) | ✅ Visible | ✅ Visible |
| OAuth (Google/GitHub) | ✅ Visible | ❌ Oculta |

### 6.5 Flujo de login con PIN separado

```
1. Usuario introduce email + password en /login
2. Backend valida bcrypt(password) → OK → JWT
3. Frontend recibe { key_salt, verification_blob, encrypted_keys }
4. Frontend: UK = Argon2id(password, key_salt)
5. Frontend: verifyUserKey(verification_blob, UK) → FALSE (password ≠ PIN)
6. Frontend: cryptoStore.lock() → isUnlocked = false
7. Layout detecta !isUnlocked → redirect a /unlock
8. Usuario introduce su PIN en /unlock
9. Frontend: UK = Argon2id(PIN, key_salt)
10. Frontend: verifyUserKey(verification_blob, UK) → TRUE
11. Frontend: unlockAccounts(encrypted_keys) → isUnlocked = true
12. Layout detecta isUnlocked → redirect a /dashboard
```

### 6.6 Archivos modificados (FASE 6)

| Archivo | Cambio |
|---------|--------|
| `backend/repositories/auth/user-repository.ts` | `changePin()` no toca `password_hash`. `login()` devuelve `verification_blob`. `getById()` devuelve `oauth_provider` |
| `backend/controllers/auth/auth-controller.ts` | Login response incluye `verification_blob` correctamente (sin `as any`) |
| `frontend/hooks/useAuth.ts` | `login()` detecta PIN separado y deja locked si password ≠ PIN |
| `frontend/lib/apiClient.ts` | `login` response type incluye `verification_blob` y `oauth_provider` |
| `frontend/stores/authStore.ts` | `User` interface incluye `oauth_provider` |
| `frontend/components/profile/SettingsPanel.tsx` | `ChangePasswordSection` oculta para OAuth. Detección inteligente de re-cifrado |
