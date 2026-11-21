/**
 * A redirect target taken from the URL or from storage, accepted only if it is a path of this
 * app. Anything else (`javascript:`, `https://other.site`, `//other.site`, `/\other.site`, which
 * browsers read as `//`) returns null, and the caller falls back to its default.
 */
export function internalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }
  // Control characters (tabs, newlines) are dropped by URL parsers and could join into `//`
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code < 0x20 || code === 0x7f) return null
  }

  // Last word to the URL parser itself: the target must stay on this origin
  const base = 'https://app.invalid'
  try {
    return new URL(value, base).origin === base ? value : null
  } catch {
    return null
  }
}
