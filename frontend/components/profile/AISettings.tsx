'use client'

import { useState, useEffect } from 'react'
import { ai, type AIStatus } from '@/lib/apiClient'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Bot, Loader2, Zap } from 'lucide-react'

/**
 * Read-only view of the AI in use. The provider is set in the server configuration, not here
 * (ADR-014): this only says whether any AI is active and, if so, which one.
 */
export function AISettings() {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ai.getStatus()
      .then((data) => {
        if (!cancelled) setStatus(data)
      })
      .catch((err) => {
        console.error('Error loading AI status:', err)
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const active = status?.active ?? false
  const rateLimit = status?.rateLimit

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-text-primary dark:text-white">
          Inteligencia Artificial
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          La IA que usa el asistente de Inversión. La elige la configuración del servidor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-accent" />
              <CardTitle>Estado de la IA</CardTitle>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                active ? 'bg-success/10 text-success' : 'bg-layer-2 text-text-secondary'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${active ? 'bg-success' : 'bg-text-secondary'}`}
              />
              {active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {failed ? (
            <p className="text-sm text-text-secondary">
              No se ha podido consultar el estado de la IA. Inténtalo más tarde.
            </p>
          ) : !active ? (
            <p className="text-sm text-text-secondary">
              No hay ninguna IA activa: el asistente de Inversión no está disponible. El test de
              perfil y el plan del mes funcionan igual, porque no usan IA.
            </p>
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-text-secondary">Proveedor</dt>
                  <dd className="text-text-primary font-medium">{status?.provider}</dd>
                </div>
                {status?.model && (
                  <div className="min-w-0">
                    <dt className="text-text-secondary">Modelo</dt>
                    <dd className="text-text-primary break-all">
                      <code>{status.model}</code>
                    </dd>
                  </div>
                )}
              </dl>

              {rateLimit && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-accent/10 border-accent/30">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-text-primary">
                      {rateLimit.isUnlimited
                        ? 'Peticiones sin límite'
                        : `Te quedan ${rateLimit.remaining} de ${rateLimit.maxRequests} peticiones esta hora`}
                    </span>
                  </div>
                  {!rateLimit.isUnlimited &&
                    rateLimit.resetTime &&
                    rateLimit.remaining < rateLimit.maxRequests && (
                      <span className="text-xs text-text-primary">
                        Se renueva a las{' '}
                        {new Date(rateLimit.resetTime).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
