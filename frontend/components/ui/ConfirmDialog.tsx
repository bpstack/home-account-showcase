'use client'

import React from 'react'
import { Modal, ModalFooter } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (_open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  variant = 'danger',
  isLoading = false,
  size = 'sm',
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: 'text-danger',
      bg: 'bg-danger/10',
      border: 'border-danger/20',
      confirmVariant: 'danger' as const,
    },
    warning: {
      icon: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/20',
      confirmVariant: 'default' as const,
    },
    info: {
      icon: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      confirmVariant: 'default' as const,
    },
  }

  const style = variantStyles[variant]

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} title={title} size={size}>
      <div className="space-y-4">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={style.confirmVariant}
          onClick={() => {
            onConfirm()
            onOpenChange(false)
          }}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (_open: boolean) => void
  title?: string
  itemName?: string
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = '¿Estás seguro?',
  itemName,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        itemName
          ? `¿Eliminar "${itemName}"? Esta acción no se puede deshacer.`
          : '¿Eliminar este elemento? Esta acción no se puede deshacer.'
      }
      confirmLabel="Eliminar"
      onConfirm={onConfirm}
      variant="danger"
      isLoading={isLoading}
    />
  )
}

interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (_open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Continuar',
  onConfirm,
  isLoading = false,
}: ConfirmActionDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      variant="info"
      isLoading={isLoading}
    />
  )
}
