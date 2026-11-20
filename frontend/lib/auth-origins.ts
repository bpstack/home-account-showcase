// Origins allowed to call the auth routes (login, register, refresh, me, logout, OAuth callback).
// Only addresses the project owns: a *.vercel.app name belongs to whoever claims it first, so a
// pattern over that domain lets in sites anyone can create.
const allowedOrigins = [
  'http://localhost:3000',
  'https://home-account-showcase-etn9.vercel.app',
  'https://home-account.stackbp.es',
]

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true // same-origin request: the browser sends no Origin
  return allowedOrigins.includes(origin)
}
