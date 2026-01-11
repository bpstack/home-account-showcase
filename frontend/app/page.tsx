'use client'

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  ThemeToggle,
} from '@/components/ui'

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Home Account</h1>
            <p className="text-text-secondary">Control de gastos domésticos</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Demo Components */}
        <div className="space-y-8">
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Diferentes variantes de botones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button isLoading>Loading</Button>
              </div>
            </CardContent>
          </Card>

          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>Campos de entrada</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Email" placeholder="tu@email.com" />
                <Input label="Password" type="password" placeholder="••••••••" />
                <Input label="Con error" error="Este campo es requerido" />
                <Input label="Deshabilitado" disabled placeholder="No editable" />
              </div>
            </CardContent>
          </Card>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card hover>
              <CardHeader>
                <CardTitle>Gastos</CardTitle>
                <CardDescription>Este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-danger">-2,450.00 €</p>
              </CardContent>
            </Card>

            <Card hover>
              <CardHeader>
                <CardTitle>Ingresos</CardTitle>
                <CardDescription>Este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-success">+3,200.00 €</p>
              </CardContent>
            </Card>

            <Card hover>
              <CardHeader>
                <CardTitle>Balance</CardTitle>
                <CardDescription>Este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-accent">+750.00 €</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
