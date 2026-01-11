'use client'

import { useState, useEffect } from 'react'
import { ai, type AIStatus, type AITestResult } from '@/lib/apiClient'
import { Card, CardHeader, CardTitle, CardContent, Button, Select } from '@/components/ui'
import { Bot, CheckCircle, XCircle, Loader2, Zap } from 'lucide-react'

const PROVIDER_OPTIONS = [
  { value: 'none', label: 'Deshabilitado' },
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'groq', label: 'Groq' },
  { value: 'ollama', label: 'Ollama (Local)' },
]

export default function SettingsPage() {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<string>('none')
  const [originalProvider, setOriginalProvider] = useState<string>('none')
  const [testingProvider, setTestingProvider] = useState(false)
  const [testResult, setTestResult] = useState<AITestResult | null>(null)
  const [saving, setSaving] = useState(false)

  const hasChanges = selectedProvider !== originalProvider

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    try {
      setLoading(true)
      const data = await ai.getStatus()
      setStatus(data)
      const currentProvider = data.activeProvider?.toLowerCase() || 'none'
      setSelectedProvider(currentProvider)
      setOriginalProvider(currentProvider)
    } catch (err) {
      console.error('Error loading AI status:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleProviderChange(newProvider: string) {
    setSelectedProvider(newProvider)
    setTestResult(null)
  }

  async function handleSave() {
    try {
      setSaving(true)
      await ai.setProvider(selectedProvider)
      setOriginalProvider(selectedProvider)
      await loadStatus()
    } catch (err) {
      console.error('Error changing provider:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setSelectedProvider(originalProvider)
    setTestResult(null)
  }

  async function handleTestConnection() {
    if (selectedProvider === 'none') return

    try {
      setTestingProvider(true)
      setTestResult(null)
      const result = await ai.testConnection(selectedProvider)
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Error de conexión',
      })
    } finally {
      setTestingProvider(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const providerInfo = status?.providers?.[selectedProvider]
  const isActive = selectedProvider !== 'none'
  const isOllama = selectedProvider === 'ollama'
  const isConfigured = providerInfo?.configured ?? false

  const getStatusText = () => {
    if (!isActive) return 'IA deshabilitada'
    if (isOllama) return 'Requiere Docker/Ollama local'
    if (isConfigured) return 'API Key configurada'
    return 'API Key no configurada'
  }

  const getStatusColor = () => {
    if (!isActive) return 'bg-gray-400'
    if (isOllama) return 'bg-blue-500'
    if (isConfigured) return 'bg-success'
    return 'bg-warning'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Configuración</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configura los proveedores de IA para el parsing de transacciones
        </p>
      </div>

      {/* AI Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-accent" />
              <CardTitle>Inteligencia Artificial</CardTitle>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                status?.enabled
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.enabled ? 'bg-success animate-pulse' : 'bg-danger'
                }`}
              />
              {status?.enabled ? 'Habilitada' : 'Deshabilitada'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Provider Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Proveedor de IA
                </label>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    options={PROVIDER_OPTIONS}
                    className="w-full sm:w-72"
                    disabled={saving}
                  />
                  {hasChanges && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        isLoading={saving}
                      >
                        Guardar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {selectedProvider === 'none' && !hasChanges && (
                <p className="text-xs text-text-secondary sm:mt-6">
                  Solo se usará el algoritmo base para parsear transacciones
                </p>
              )}
            </div>

            {/* Pending changes notice */}
            {hasChanges && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">
                  Tienes cambios sin guardar. Pulsa "Guardar" para aplicarlos.
                </p>
              </div>
            )}

            {/* AI Status Panel - Only show when provider is selected */}
            {isActive && (
              <div className="bg-layer-2 border border-layer-3 rounded-lg p-4 space-y-4">
                {/* Status Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
                    <span className="text-sm text-text-primary">{getStatusText()}</span>
                  </div>
                  {providerInfo?.model && (
                    <span className="text-xs text-text-secondary">
                      Modelo: <code className="text-text-primary">{providerInfo.model}</code>
                    </span>
                  )}
                </div>

                {/* Provider Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-layer-3">
                  <div className="flex items-center gap-2 text-sm">
                    {isConfigured ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger" />
                    )}
                    <span className="text-text-secondary">
                      {isConfigured ? 'Configurado en servidor' : 'No configurado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-text-secondary" />
                    <span className="text-text-secondary">
                      Proveedor: <span className="text-text-primary font-medium">{selectedProvider}</span>
                    </span>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      testResult.success
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-danger/10 text-danger border border-danger/20'
                    }`}
                  >
                    {testResult.success ? (
                      <div className="flex items-center justify-between">
                        <span>Conexión exitosa</span>
                        <span className="text-xs opacity-75">{testResult.responseTime}ms</span>
                      </div>
                    ) : (
                      <span>{testResult.error}</span>
                    )}
                  </div>
                )}

                {/* Test Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={!isConfigured || testingProvider}
                  className="w-full sm:w-auto"
                >
                  {testingProvider ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Probando conexión...
                    </>
                  ) : (
                    'Probar conexión'
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Providers Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proveedores Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(status?.providers || {}).map(([key, provider]) => (
              <div
                key={key}
                className={`p-3 rounded-lg border transition-all ${
                  selectedProvider === key
                    ? 'border-accent bg-accent/5'
                    : 'border-layer-3 bg-layer-2'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-text-primary capitalize">{key}</span>
                  {provider.configured ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-text-secondary" />
                  )}
                </div>
                <p className="text-xs text-text-secondary truncate">{provider.model}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
