// components/ui/Tooltip.tsx
// Tooltip component with proper accessibility

'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect()
      const tooltipRect = tooltipRef.current!.getBoundingClientRect()
      const scrollX = window.scrollX
      const scrollY = window.scrollY

      let top = 0
      let left = 0

      switch (side) {
        case 'top':
          top = triggerRect.top + scrollY - tooltipRect.height - 8
          break
        case 'bottom':
          top = triggerRect.bottom + scrollY + 8
          break
        case 'left':
          left = triggerRect.left + scrollX - tooltipRect.width - 8
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2
          break
        case 'right':
          left = triggerRect.right + scrollX + 8
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2
          break
      }

      switch (align) {
        case 'start':
          left = triggerRect.left + scrollX
          break
        case 'center':
          left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2
          break
        case 'end':
          left = triggerRect.right + scrollX - tooltipRect.width
          break
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, side, align])

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'fixed z-[100] px-3 py-2 text-sm bg-popover text-popover-foreground rounded-md shadow-md shadow-black/5',
            'max-w-xs break-words animate-in fade-in-0 zoom-in-95 duration-200',
            'border border-border/50',
            className
          )}
          style={{
            top: position.top,
            left: position.left
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// Info icon with tooltip - common pattern
export function InfoTooltip({
  content,
  className
}: {
  content: string
  className?: string
}) {
  return (
    <Tooltip content={content}>
      <span
        className={cn(
          'inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-muted text-muted-foreground',
          'cursor-help hover:bg-muted/80 transition-colors',
          className
        )}
      >
        ?
      </span>
    </Tooltip>
  )
}
