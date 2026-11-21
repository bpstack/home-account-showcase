import { describe, expect, it } from 'vitest'
import { internalPath } from './internalPath'

// Requirement: a redirect taken from the URL or storage only ever goes to a path of this app;
// never runs a script and never leaves the site.
describe('internalPath', () => {
  it('accepts paths of this app, with their query', () => {
    expect(internalPath('/dashboard')).toBe('/dashboard')
    expect(internalPath('/invite/abc123')).toBe('/invite/abc123')
    expect(internalPath('/unlock?from=%2Fsettings')).toBe('/unlock?from=%2Fsettings')
  })

  it('refuses scripts and other schemes', () => {
    expect(internalPath('javascript:alert(1)')).toBeNull()
    expect(internalPath('JavaScript:alert(1)')).toBeNull()
    expect(internalPath('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(internalPath('https://evil.example')).toBeNull()
  })

  it('refuses addresses that browsers read as another site', () => {
    expect(internalPath('//evil.example')).toBeNull()
    expect(internalPath('/\\evil.example')).toBeNull()
    expect(internalPath('/\t/evil.example')).toBeNull()
    expect(internalPath('/\n/evil.example')).toBeNull()
  })

  it('refuses empty values', () => {
    expect(internalPath(null)).toBeNull()
    expect(internalPath(undefined)).toBeNull()
    expect(internalPath('')).toBeNull()
  })
})
