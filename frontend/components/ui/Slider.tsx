// components/ui/Slider.tsx
// Simple range slider component

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
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className, disabled }, ref) => {
    const percentage = ((value[0] - min) / (max - min)) * 100

    return (
      <div className={cn('relative', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => onValueChange([Number(e.target.value)])}
          disabled={disabled}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        {value[0] !== undefined && (
          <div
            className="absolute pointer-events-none h-1 bg-primary rounded-full"
            style={{
              left: 0,
              width: `${percentage}%`,
            }}
          />
        )}
      </div>
    )
  }
)

Slider.displayName = 'Slider'
