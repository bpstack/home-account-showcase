// components/ui/Tooltip.tsx

'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)

  // Calculate position after tooltip mounts
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) {
      setCoords(null)
      return
    }

    const tr = triggerRef.current.getBoundingClientRect()
    const tt = tooltipRef.current.getBoundingClientRect()
    const pad = 8

    let top = 0
    let left = 0

    switch (side) {
      case 'top':
        top = tr.top - tt.height - pad
        left = tr.left + (tr.width - tt.width) / 2
        break
      case 'bottom':
        top = tr.bottom + pad
        left = tr.left + (tr.width - tt.width) / 2
        break
      case 'left':
        top = tr.top + (tr.height - tt.height) / 2
        left = tr.left - tt.width - pad
        break
      case 'right':
        top = tr.top + (tr.height - tt.height) / 2
        left = tr.right + pad
        break
    }

    // Clamp to viewport
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (left < pad) left = pad
    if (left + tt.width > vw - pad) left = vw - tt.width - pad
    if (top < pad) top = pad
    if (top + tt.height > vh - pad) top = vh - tt.height - pad

    setCoords({ top, left })
  }, [isOpen, side])

  // Close on outside tap/click
  useEffect(() => {
    if (!isOpen) return
    const handleOutside = (e: Event) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    // Use setTimeout to avoid the current click/touch from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutside)
      document.addEventListener('touchstart', handleOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [isOpen])

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation()
        setIsOpen((prev) => !prev)
      }}
    >
      {children}
      {isOpen &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            className={cn(
              'fixed z-[9999] px-3 py-2 text-sm bg-popover text-popover-foreground rounded-md shadow-md shadow-black/5 border border-border/50',
              'w-max max-w-xs break-words',
              coords ? 'visible' : 'invisible',
              className
            )}
            style={{
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
            }}
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  )
}

// Info icon with tooltip - common pattern
export function InfoTooltip({
  content,
  side,
  className,
}: {
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}) {
  return (
    <Tooltip content={content} side={side}>
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
