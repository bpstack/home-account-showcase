/**
 * The session the backend hands over in its Set-Cookie headers.
 *
 * The browser only holds cookies on the frontend's domain: the Next route handlers read the
 * backend's Set-Cookie headers and set the same values with their own options. This is the pure
 * part of that copy, shared by every route that talks to the backend about the session.
 */

export const SESSION_COOKIES = ['accessToken', 'refreshToken', 'csrfToken'] as const

export type SessionCookieName = (typeof SESSION_COOKIES)[number]

/** A value to set, or `null` when the backend cleared the cookie. Missing: left as it is. */
export type SessionCookies = Partial<Record<SessionCookieName, string | null>>

/**
 * Reads the session cookies from Set-Cookie header lines, one cookie per line (as
 * `Headers.getSetCookie()` returns them: a single joined header cannot be split safely, because
 * the date of `Expires` contains a comma). An empty value, `Max-Age` of zero or less, or an
 * `Expires` in the past means the backend cleared that cookie.
 */
export function parseSessionCookies(setCookieLines: string[], now = Date.now()): SessionCookies {
  const session: SessionCookies = {}

  for (const line of setCookieLines) {
    const [pair, ...attributes] = line.split(';')
    const separator = pair.indexOf('=')
    if (separator < 0) continue

    const name = pair.slice(0, separator).trim()
    if (!(SESSION_COOKIES as readonly string[]).includes(name)) continue
    const value = pair.slice(separator + 1).trim()

    let cleared = value === ''
    for (const attribute of attributes) {
      const [key, ...rest] = attribute.split('=')
      const attributeValue = rest.join('=').trim()
      const attributeName = key.trim().toLowerCase()
      if (attributeName === 'max-age' && Number(attributeValue) <= 0) cleared = true
      if (attributeName === 'expires' && Date.parse(attributeValue) <= now) cleared = true
    }

    session[name as SessionCookieName] = cleared ? null : value
  }

  return session
}

/**
 * The Cookie header for the backend: the browser's session, with the access and refresh tokens of
 * a fresh one. The CSRF cookie is always the browser's: it must match the X-CSRF-Token header the
 * browser sent with this same request (the fresh one reaches the browser for the next request).
 */
export function backendCookieHeader(
  current: Partial<Record<SessionCookieName, string | undefined>>,
  fresh: SessionCookies = {}
): string {
  return SESSION_COOKIES.map((name) => {
    const value = name === 'csrfToken' || fresh[name] === undefined ? current[name] : fresh[name]
    return value ? `${name}=${value}` : ''
  })
    .filter(Boolean)
    .join('; ')
}
