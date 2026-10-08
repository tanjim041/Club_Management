import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface ContentContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'nav' | 'header' | 'footer'
}

/**
 * Standard content container for Festivo public pages:
 * - Maximum width: 1280px
 * - Centered with margin-inline: auto
 * - Horizontal padding: 20px (mobile) | 32px (tablet sm:) | 48px (desktop lg:)
 */
export function ContentContainer({
  children,
  className,
  as: Component = 'div',
  ...props
}: ContentContainerProps) {
  return (
    <Component
      className={cn(
        'mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
