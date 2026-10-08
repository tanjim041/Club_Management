import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl font-medium transition-[background-color,border-color,color,transform] duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-page)] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed font-sans',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold hover:bg-[var(--color-accent-hover)] active:scale-[0.98] shadow-sm',
        secondary:
          'border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)] active:scale-[0.98]',
        ghost:
          'text-[var(--color-text-body)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]',
        outline:
          'border border-[var(--color-border-subtle)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] hover:border-[var(--color-text-muted)] active:scale-[0.98]',
        danger:
          'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.98]',
      },
      size: {
        default: 'px-4 py-2.5 text-sm gap-2',
        sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
        lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
