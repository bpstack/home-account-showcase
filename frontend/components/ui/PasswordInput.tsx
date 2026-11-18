'use client'

import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, type InputProps } from './Input'

interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailing'> {
  /** What the field holds, for the show/hide button's label: "contraseña", "PIN"… */
  subject?: string
}

/** An `Input` for secrets, with a button that shows or hides what was typed. */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ subject = 'contraseña', ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    return (
      <Input
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={props.disabled}
            aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${subject}`}
            aria-pressed={visible}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        }
      />
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
