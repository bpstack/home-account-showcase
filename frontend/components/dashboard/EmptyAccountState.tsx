'use client'

import { PlusCircle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
// Import Button from new unified component if available, or current Button
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

interface EmptyAccountStateProps {
    onAddTransaction: () => void
}

export function EmptyAccountState({ onAddTransaction }: EmptyAccountStateProps) {
    const { account } = useAuth()

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-500 min-h-[400px]">
            <div className="max-w-md w-full space-y-6 text-center">
                <div className="mx-auto w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <PlusCircle className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">
                        ¡Bienvenido a {account?.name || 'tu cuenta'}!
                    </h2>
                    <p className="text-muted-foreground">
                        Esta cuenta está lista para usarse. Hemos configurado las categorías por defecto para ti.
                    </p>
                </div>

                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4 text-left">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <p className="font-medium text-sm text-foreground">¿Por qué está vacío esto?</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Aún no has registrado ninguna transacción en esta cuenta. Las estadísticas aparecerán automáticamente cuando añadas tu primer ingreso o gasto.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="pt-2">
                    <Button onClick={onAddTransaction} size="lg" className="w-full sm:w-auto font-medium">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Añadir primera transacción
                    </Button>
                </div>
            </div>
        </div>
    )
}
