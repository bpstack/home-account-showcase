import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

/** A multi-line field that looks like `Input`. */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded-md border border-layer-3 bg-layer-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary',
        'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)

Textarea.displayName = 'Textarea'

export { Textarea }
