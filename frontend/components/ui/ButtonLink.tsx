import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './Button'

type ButtonLinkProps = ComponentProps<typeof Link> & Parameters<typeof buttonVariants>[0]

/** A link that looks like a `Button`: for actions that navigate. */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
