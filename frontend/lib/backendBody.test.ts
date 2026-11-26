import { describe, expect, it } from 'vitest'
import { readBackendBody } from './backendBody'

describe('the body the proxy passes on from the backend', () => {
  it('is the JSON the backend sent', async () => {
    const res = new Response(JSON.stringify({ success: true, count: 3 }), { status: 200 })
    await expect(readBackendBody(res)).resolves.toEqual({ success: true, count: 3 })
  })

  it("is a JSON error for Express's HTML 404, so the proxy can keep the 404", async () => {
    const res = new Response('<!DOCTYPE html><pre>Cannot PUT /api/ai/provider</pre>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
    await expect(readBackendBody(res)).resolves.toEqual({ success: false, error: 'No encontrado' })
  })

  it('is a JSON error for an empty or HTML page from the host, whatever its status', async () => {
    const res = new Response('<html>Service Unavailable</html>', { status: 503 })
    await expect(readBackendBody(res)).resolves.toMatchObject({ success: false })
  })
})
