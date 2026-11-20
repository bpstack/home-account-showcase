'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
  id?: string
  'aria-label'?: string
  /** What the value means aloud: "5.000,00 €" instead of "5000" */
  'aria-valuetext'?: string
}

/** A range slider in the theme accent (the browser draws the filled track). */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      className={cn(
        'h-6 w-full cursor-pointer accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)

Slider.displayName = 'Slider'
