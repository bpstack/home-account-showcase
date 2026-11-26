/**
 * The body of a backend response, for the proxy to pass on. The backend answers JSON, but not
 * always: Express's own 404 for an unknown route is HTML, and so may be what the host sends while
 * the server wakes up. Reading those as JSON threw, and the proxy turned a 404 or a 503 into a
 * 502 «connection error». A body that is not JSON now keeps its status with a JSON error.
 */
export async function readBackendBody(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return {
      success: false,
      error: res.status === 404 ? 'No encontrado' : 'Respuesta no válida del servidor',
    }
  }
}
