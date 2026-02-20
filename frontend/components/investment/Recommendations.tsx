// components/investment/Recommendations.tsx
// Investment recommendations component

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRecommendations, useInvestmentOverview } from '@/lib/queries/investment'
import { useCryptoStore } from '@/stores/cryptoStore'
import { DisclaimerAlert } from './DisclaimerAlert'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { TrendingUp, PiggyBank, Wallet, Coins, Info, AlertCircle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Tooltip as CustomTooltip, InfoTooltip } from '@/components/ui/Tooltip'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const RECOMMENDATION_TOOLTIP =
  'Las recomendaciones se actualizan según las condiciones actuales del mercado (S&P 500, MSCI World, bonos, crypto). Ejemplos: si el mercado está en tendencia alcista, puede sugerir más acciones; si hay volatilidad alta o corrección, puede aumentar bonos o efectivo para proteger tu capital. El Plan de Inversión adapta la distribución de activos (acciones, bonos, efectivo) según tu perfil de riesgo y la tendencia de los mercados. Estos valores cambian diariamente basándose en indicadores como momento, volatilidad, yields de bonos y precio de Bitcoin.'

interface RecommendationsProps {
  accountId: string
  profile?: string
  monthlyAmount?: number
  selectedMonthSavings?: number
}

export function Recommendations({
  accountId,
  profile,
  monthlyAmount: _monthlyAmount,
  selectedMonthSavings,
}: RecommendationsProps) {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useRecommendations(
    accountId,
    profile ? { profile } : undefined
  )
  const { data: overviewData } = useInvestmentOverview(accountId, { refetchOnMount: false })
  const isAccountUnlocked = useCryptoStore((s) => s.isAccountUnlocked)

  const investmentPercentage = overviewData?.profile?.investmentPercentage || 20
  // Use selected month savings (0 if no data for that month)
  const baseSavings = selectedMonthSavings ?? 0
  const investmentAmount = (baseSavings * investmentPercentage) / 100

  // Refetch when profile becomes available
  useEffect(() => {
    if (overviewData?.profile && !data) {
      refetch()
    }
  }, [overviewData?.profile, data, refetch])

  if (isLoading || !isAccountUnlocked) {
    return <RecommendationsSkeleton />
  }

  const isAIError = data?.error?.includes('IA no disponible') || data?.error?.includes('rate limit')
  const needsProfile = !overviewData?.profile

  if (isError || !data || !data.assetAllocation) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-gray-900 dark:to-gray-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
            Plan de Inversión Mensual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DisclaimerAlert type="recommendations" />
          {isAIError ? (
            <div className="text-center py-4">
              <p className="text-amber-600 dark:text-amber-400 mb-2">
                IA temporalmente no disponible
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Inténtalo de nuevo en unos minutos
              </p>
            </div>
          ) : needsProfile ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Completa tu perfil de inversor para ver recomendaciones personalizadas
              </p>
              <Button variant="outline" onClick={() => router.push('/investment?tab=profile')}>
                Completar Perfil
              </Button>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Error al cargar recomendaciones
            </div>
          )}
          <div className="text-center">
            <Button variant="ghost" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Asegurar que los valores del asset allocation son números válidos
  const stocks = Number(data.assetAllocation?.stocks) || 0
  const bonds = Number(data.assetAllocation?.bonds) || 0
  const crypto = Number(data.assetAllocation?.crypto) || 0
  const cash = Number(data.assetAllocation?.cash) || 0

  return (
    <Card className="h-full border-border/50 bg-background/50 dark:bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4 sm:pb-6 border-b border-border/40">
        <CardTitle>
          <div className="flex items-center gap-2 sm:gap-3 sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">Plan de Inversión</span>
            </div>
            <span className="hidden sm:inline-flex text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/50 items-center gap-1">
              {investmentPercentage}% ahorro
              <InfoTooltip
                content="Porcentaje de tu capacidad de ahorro destinado a inversión, según tu perfil de riesgo."
                className="w-3 h-3"
              />
            </span>
          </div>
          <div className="flex justify-center sm:hidden mt-2">
            <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/50 inline-flex items-center gap-1">
              {investmentPercentage}% ahorro
              <InfoTooltip
                content="Porcentaje de tu capacidad de ahorro destinado a inversión, según tu perfil de riesgo."
                className="w-3.5 h-3.5"
              />
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DisclaimerAlert type="recommendations" />

        {/* Resumen - Mobile optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/50 flex flex-col justify-center min-w-0">
            <div className="text-sm sm:text-3xl font-bold text-foreground tracking-tight truncate">
              {formatCurrency(investmentAmount)}
            </div>
            <div className="text-[9px] sm:text-xs font-semibold text-muted-foreground mt-0.5 sm:mt-1 uppercase tracking-wider flex items-center justify-center gap-0.5">
              Mensual
              <InfoTooltip
                content="Cantidad mensual recomendada para invertir. Calculada como capacidad de ahorro × porcentaje de inversión."
                className="w-3 h-3"
              />
            </div>
          </div>
          <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center">
            <div className="text-sm sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stocks + crypto}%
            </div>
            <div className="text-[9px] sm:text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 sm:mt-1 flex items-center justify-center gap-0.5">
              R. Variable
              <InfoTooltip
                content="Renta variable: acciones y criptomonedas. Mayor riesgo pero mayor potencial de rentabilidad a largo plazo."
                className="w-3 h-3"
              />
            </div>
          </div>
          <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 flex flex-col justify-center">
            <div className="text-sm sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {bonds + cash}%
            </div>
            <div className="text-[9px] sm:text-xs font-medium text-blue-600/80 dark:text-blue-400/80 mt-0.5 sm:mt-1 flex items-center justify-center gap-0.5">
              R. Fija
              <InfoTooltip
                content="Renta fija: bonos y liquidez. Menor riesgo con rendimientos más estables y predecibles."
                className="w-3 h-3"
              />
            </div>
          </div>
        </div>

        {/* Gráfico de distribución - Responsive como CategoryPieChart */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Acciones', value: stocks, color: '#22c55e' },
                    { name: 'Bonos', value: bonds, color: '#3b82f6' },
                    { name: 'Crypto', value: crypto, color: '#f59e0b' },
                    { name: 'Liquidez', value: cash, color: '#6b7280' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="85%"
                  paddingAngle={3}
                  dataKey="value"
                >
                  {[0, 1, 2, 3].map((index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={['#22c55e', '#3b82f6', '#f59e0b', '#6b7280'][index]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number | undefined) => `${value ?? 0}%`}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda horizontal compacta */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] sm:text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#22c55e]" />
              Acciones
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#3b82f6]" />
              Bonos
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#f59e0b]" />
              Crypto
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#6b7280]" />
              Liquidez
            </span>
          </div>
        </div>

        {/* Lista de recomendaciones */}
        <div className="space-y-3">
          {data.recommendations.map((rec, index) => (
            <RecommendationCard key={index} recommendation={rec} amount={investmentAmount} />
          ))}
        </div>

        {/* Market context */}
        {data.marketContext && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span className="text-muted-foreground flex-1">{data.marketContext}</span>
              <CustomTooltip content={RECOMMENDATION_TOOLTIP}>
                <AlertCircle className="h-4 w-4 text-amber-500 cursor-help hover:text-amber-600 transition-colors" />
              </CustomTooltip>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ========================
// Subcomponents
// ========================

const ASSET_INFO: Record<
  string,
  {
    description: string
    rentType: 'variable' | 'fija'
    riskDescription: Record<string, string>
    tips: string
  }
> = {
  ETF: {
    description:
      'Fondo cotizado que replica un índice bursátil. Diversificación automática en múltiples empresas con un solo producto.',
    rentType: 'variable',
    riskDescription: {
      low: 'ETFs de bonos o índices amplios con baja volatilidad.',
      medium: 'ETFs de índices globales con volatilidad moderada.',
      high: 'ETFs sectoriales o apalancados con alta volatilidad.',
    },
    tips: 'Ideal para inversión a largo plazo. Reinvierte dividendos automáticamente.',
  },
  BOND_FUND: {
    description:
      'Fondo de inversión en deuda pública o corporativa. Genera intereses regulares con menor volatilidad que las acciones.',
    rentType: 'fija',
    riskDescription: {
      low: 'Bonos de países desarrollados con alta calificación crediticia.',
      medium: 'Bonos corporativos o de duración media.',
      high: 'Bonos de alto rendimiento (high yield) o mercados emergentes.',
    },
    tips: 'Actúa como estabilizador en la cartera. Menor rentabilidad esperada pero más predecible.',
  },
  CRYPTO: {
    description:
      'Activos digitales descentralizados. Alta volatilidad con potencial de grandes ganancias o pérdidas.',
    rentType: 'variable',
    riskDescription: {
      low: 'Stablecoins respaldadas por monedas fiduciarias.',
      medium: 'Criptomonedas establecidas como Bitcoin o Ethereum.',
      high: 'Altcoins con alta especulación y liquidez limitada.',
    },
    tips: 'Nunca inviertas más de lo que puedas permitirte perder. Considera DCA (compra periódica).',
  },
  STOCK: {
    description:
      'Acciones individuales de empresas. Propiedad directa en compañías específicas con mayor riesgo concentrado.',
    rentType: 'variable',
    riskDescription: {
      low: 'Empresas consolidadas con dividendos estables (blue chips).',
      medium: 'Empresas de gran capitalización con crecimiento moderado.',
      high: 'Empresas pequeñas, startups o sectores muy cíclicos.',
    },
    tips: 'Requiere más seguimiento que los ETFs. Diversifica entre varios sectores.',
  },
  SAVINGS: {
    description:
      'Cuentas de ahorro o fondos monetarios. Máxima liquidez y seguridad con rentabilidad muy baja.',
    rentType: 'fija',
    riskDescription: {
      low: 'Depósitos garantizados hasta 100.000€ por el FGD.',
      medium: 'Fondos monetarios de bajo riesgo.',
      high: 'No aplica - productos de ahorro son de bajo riesgo.',
    },
    tips: 'Perfecto para fondo de emergencia o objetivos a muy corto plazo.',
  },
}

const RISK_LABELS: Record<string, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
}

function RecommendationCard({ recommendation, amount }: { recommendation: any; amount: number }) {
  const typeIcons = {
    ETF: <TrendingUp className="h-4 w-4" />,
    BOND_FUND: <Wallet className="h-4 w-4" />,
    CRYPTO: <Coins className="h-4 w-4" />,
    STOCK: <TrendingUp className="h-4 w-4" />,
    SAVINGS: <PiggyBank className="h-4 w-4" />,
  }

  const typeColors = {
    ETF: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    BOND_FUND: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    CRYPTO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    STOCK: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    SAVINGS: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  }

  const riskColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  }

  const recommendationAmount = (amount * recommendation.percentage) / 100
  const assetInfo = ASSET_INFO[recommendation.type as keyof typeof ASSET_INFO]
  const rentLabel = assetInfo?.rentType === 'variable' ? 'Renta Variable' : 'Renta Fija'

  const tooltipContent = assetInfo
    ? `${recommendation.name} — ${rentLabel}. ${assetInfo.description} Riesgo ${RISK_LABELS[recommendation.risk]}: ${assetInfo.riskDescription[recommendation.risk]} ${assetInfo.tips}`
    : recommendation.reason

  return (
    <div className="p-2 sm:p-3 rounded-lg border border-border/40 dark:bg-zinc-900 dark:border-white/5 hover:bg-muted/10 transition-colors group">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <CustomTooltip content={tooltipContent} side="right" className="max-w-[280px]">
            <div
              className={cn(
                'p-1.5 sm:p-2 rounded-lg shrink-0 cursor-help',
                typeColors[recommendation.type as keyof typeof typeColors] ||
                  'bg-muted text-muted-foreground'
              )}
            >
              {typeIcons[recommendation.type as keyof typeof typeIcons]}
            </div>
          </CustomTooltip>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">
                {recommendation.name}
              </h4>
              <span className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">
                {recommendation.symbol}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {recommendation.reason}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-semibold text-xs sm:text-sm text-foreground">
            {formatCurrency(recommendationAmount)}
          </div>
          <div
            className={cn(
              'text-[8px] sm:text-[9px] font-bold mt-1 inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded border',
              riskColors[recommendation.risk as keyof typeof riskColors] === 'text-green-600'
                ? 'bg-green-500/5 border-green-500/10 text-green-600 dark:text-green-400'
                : riskColors[recommendation.risk as keyof typeof riskColors] === 'text-yellow-600'
                  ? 'bg-yellow-500/5 border-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  : 'bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400'
            )}
          >
            {recommendation.risk.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <Card className="border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-gray-900 dark:to-gray-800/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <TrendingUp className="h-5 w-5" />
          Plan de Inversión Mensual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </CardContent>
    </Card>
  )
}
