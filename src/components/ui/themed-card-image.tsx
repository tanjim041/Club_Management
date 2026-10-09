import { useState } from 'react'
import {
  Camera,
  Cpu,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Trophy,
} from 'lucide-react'

export interface ThemedCardImageProps {
  src?: string | null
  alt: string
  category?: string | null
  className?: string
  aspectRatioClassName?: string
  priority?: boolean
  zoomOnHover?: boolean
}

export function ThemedCardImage({
  src,
  alt,
  category = 'General',
  className = '',
  aspectRatioClassName = 'aspect-[16/9]',
  priority = false,
  zoomOnHover = true,
}: ThemedCardImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const catLower = (category || '').toLowerCase()

  // Select appropriate icon and color gradient based on category
  const getCategoryTheme = () => {
    if (
      catLower.includes('photo') ||
      catLower.includes('media') ||
      catLower.includes('art') ||
      catLower.includes('visual')
    ) {
      return {
        icon: Camera,
        gradient: 'from-[#1A202C] via-[#2D3748] to-[#1E2533]',
        accent: 'text-amber-400',
        patternColor: 'rgba(251, 191, 36, 0.08)',
        label: 'Visual Arts & Photography',
      }
    }
    if (
      catLower.includes('tech') ||
      catLower.includes('robot') ||
      catLower.includes('program') ||
      catLower.includes('code') ||
      catLower.includes('hackathon') ||
      catLower.includes('it club')
    ) {
      return {
        icon: Cpu,
        gradient: 'from-[#0F172A] via-[#1E293B] to-[#0F172A]',
        accent: 'text-[#93B4E8]',
        patternColor: 'rgba(147, 180, 232, 0.08)',
        label: 'Technology & Computing',
      }
    }
    if (
      catLower.includes('business') ||
      catLower.includes('career') ||
      catLower.includes('case') ||
      catLower.includes('venture') ||
      catLower.includes('finance')
    ) {
      return {
        icon: Trophy,
        gradient: 'from-[#141B2D] via-[#1F2942] to-[#141B2D]',
        accent: 'text-indigo-400',
        patternColor: 'rgba(129, 140, 248, 0.08)',
        label: 'Business & Career',
      }
    }
    if (
      catLower.includes('social') ||
      catLower.includes('service') ||
      catLower.includes('welfare') ||
      catLower.includes('volunteer') ||
      catLower.includes('relief') ||
      catLower.includes('blood')
    ) {
      return {
        icon: HeartHandshake,
        gradient: 'from-[#0D1F1C] via-[#152E2A] to-[#0D1F1C]',
        accent: 'text-emerald-400',
        patternColor: 'rgba(52, 211, 153, 0.08)',
        label: 'Community & Service',
      }
    }
    if (
      catLower.includes('science') ||
      catLower.includes('research') ||
      catLower.includes('physic') ||
      catLower.includes('astro') ||
      catLower.includes('olympiad')
    ) {
      return {
        icon: GraduationCap,
        gradient: 'from-[#16172E] via-[#212342] to-[#16172E]',
        accent: 'text-violet-400',
        patternColor: 'rgba(167, 139, 250, 0.08)',
        label: 'Science & Discovery',
      }
    }
    return {
      icon: Globe2,
      gradient: 'from-[#141923] via-[#1D2433] to-[#141923]',
      accent: 'text-[#93B4E8]',
      patternColor: 'rgba(147, 180, 232, 0.08)',
      label: 'Campus Activity',
    }
  }

  const theme = getCategoryTheme()
  const Icon = theme.icon

  const shouldRenderImg = Boolean(src && !hasError)

  return (
    <div
      className={`relative w-full overflow-hidden bg-[var(--color-surface-raised)] select-none ${aspectRatioClassName} ${className}`}
    >
      {shouldRenderImg ? (
        <>
          {/* Underlying placeholder while image loads */}
          {!isLoaded && (
            <div
              className="absolute inset-0 animate-pulse bg-[var(--color-surface)]"
              aria-hidden="true"
            />
          )}

          <img
            src={src!}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`h-full w-full object-cover transition-all duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${zoomOnHover ? 'festivo-card-image' : ''}`}
          />
        </>
      ) : (
        /* Themed illustrated fallback */
        <div
          role="img"
          aria-label={alt || `${theme.label} generic illustration`}
          className={`h-full w-full bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center p-4 text-center relative overflow-hidden`}
        >
          {/* Subtle architectural dot grid */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(${theme.patternColor} 1.5px, transparent 1.5px)`,
              backgroundSize: '16px 16px',
            }}
          />

          {/* Center stylized category emblem */}
          <div className="relative z-1 flex flex-col items-center gap-2">
            <div className="p-3 rounded-2xl bg-[var(--color-surface)]/80 border border-[var(--color-border-subtle)] shadow-inner backdrop-blur-sm">
              <Icon className={`h-6 w-6 ${theme.accent}`} aria-hidden="true" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)] line-clamp-1">
              {theme.label}
            </span>
          </div>
        </div>
      )}

      {/* Atmospheric gradient overlay at bottom for card text readability */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/25 to-transparent opacity-85"
        aria-hidden="true"
      />
    </div>
  )
}
