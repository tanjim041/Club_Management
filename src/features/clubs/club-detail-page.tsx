import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Compass,
  ExternalLink,
  Globe,
  History,
  ImageIcon,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  Share2,
  Tag,
  Trophy,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { LoadingState } from '../../components/states/page-states'
import { usePublicClubProfileQuery } from '../landing/landing-api'
import { EventCard } from '../landing/components/event-card'
import { EventDetailsDialog } from '../landing/components/event-details-dialog'
import type { PublishedEvent } from '../landing/landing-types'

function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions): string | null {
  if (!value) return null

  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, options ?? { dateStyle: 'medium' }).format(date)
}

function ProfileEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Trophy
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-10 text-center animate-fade-in-up">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-accent)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-heading mt-4 text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-1.5 mx-auto max-w-md text-xs leading-[1.6] text-[var(--color-text-muted)]">{description}</p>
    </div>
  )
}

export function ClubDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePublicClubProfileQuery(slug)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'segments' | 'events' | 'achievements' | 'past-events' | 'gallery'
  >('overview')
  const [selectedEvent, setSelectedEvent] = useState<PublishedEvent | null>(null)

  if (isLoading) {
    return <LoadingState label="Loading club profile…" />
  }

  if (isError) {
    return (
      <div className="content-container py-16 text-center">
        <RefreshCw className="mx-auto h-10 w-10 text-[var(--color-accent)]" />
        <h2 className="font-heading mt-4 text-2xl font-bold text-[var(--color-text-primary)]">Unable to load this club profile</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--color-text-muted)]">
          {error instanceof Error ? error.message : 'Please try again in a moment.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" size="default" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Try again
          </Button>
          <Link to="/clubs">
            <Button variant="ghost" size="default">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Club Directory
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="content-container py-16 text-center">
        <Compass className="mx-auto h-10 w-10 text-[var(--color-accent)]" />
        <h2 className="font-heading mt-4 text-2xl font-bold text-[var(--color-text-primary)]">Club Not Found</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          This club is unavailable or does not have a public profile.
        </p>
        <Link to="/clubs" className="mt-6 inline-block">
          <Button variant="secondary" size="default">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Club Directory
          </Button>
        </Link>
      </div>
    )
  }

  const { club, segments, achievements, showcases, galleryItems, events, fests = [] } = profile
  const initials = club.name
    .split(' ')
    .map((name) => name[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  const categoryLabel = club.category?.trim() || 'Student Club'
  const headingLine = club.tagline.trim() || 'Public club profile'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'segments', label: 'Segments', icon: Layers },
    { id: 'events', label: 'Fests & Events', icon: Calendar },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'past-events', label: 'Previous Events', icon: History },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  ] as const

  return (
    <div className="content-container space-y-8 py-6 sm:py-8 lg:py-10">
      <div>
        <Link
          to="/clubs"
          className="editorial-link inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Student Clubs</span>
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xl">
        <div className="relative h-48 w-full overflow-hidden border-b border-[var(--color-border-subtle)] bg-gradient-to-r from-page via-surface to-surface-hover sm:h-56">
          {club.cover_image_url && (
            <img
              src={club.cover_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[var(--color-page)]/25" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(var(--color-accent)_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute right-4 top-4">
            <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-page)]/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] backdrop-blur-md">
              {categoryLabel}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              {club.logo_url ? (
                <img
                  src={club.logo_url}
                  alt={`${club.name} logo`}
                  className="h-24 w-24 rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-page)] object-cover shadow-2xl sm:h-28 sm:w-28"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-surface)] text-2xl font-bold text-[var(--color-accent)] shadow-2xl sm:h-28 sm:w-28">
                  {initials}
                </div>
              )}

              <div className="pb-1">
                <h1 className="font-heading text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-3xl lg:text-4xl">
                  {club.name}
                </h1>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{headingLine}</p>
              </div>
            </div>

            {(club.website_url || club.facebook_url) && (
              <div className="flex flex-wrap items-center gap-2.5 pb-1">
                {club.website_url && (
                  <a
                    href={club.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <Globe className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    Website
                    <ExternalLink className="h-3 w-3 text-[var(--color-text-muted)]" />
                  </a>
                )}
                {club.facebook_url && (
                  <a
                    href={club.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <Share2 className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    Facebook
                    <ExternalLink className="h-3 w-3 text-[var(--color-text-muted)]" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-[var(--color-border-subtle)] pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">About the Club</h2>
            {club.description ? (
              <p className="mt-2 max-w-4xl text-sm leading-[1.6] text-[var(--color-text-body)]">{club.description}</p>
            ) : (
              <p className="mt-2 text-sm leading-[1.6] text-[var(--color-text-muted)]">No public description has been published yet.</p>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-page)] px-6 sm:px-8">
          <nav
            role="tablist"
            className="scrollbar-none flex space-x-2 overflow-x-auto py-2.5 sm:space-x-3"
            aria-label="Club sections"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-150 ${
                    isSelected
                      ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-accent-foreground)] shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="space-y-6 pt-2">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 animate-fade-in-up lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6">
                <h3 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">About</h3>
                {club.description ? (
                  <p className="mt-3 text-xs leading-[1.6] text-[var(--color-text-body)]">{club.description}</p>
                ) : (
                  <p className="mt-3 text-xs leading-[1.6] text-[var(--color-text-muted)]">This club has not published an overview yet.</p>
                )}
              </div>

              {/* Flagship Fests Banner (if any) */}
              {fests.length > 0 && (
                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">Flagship Fests</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">Major multi-day celebrations and summits by {club.name}.</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                      {fests.length} {fests.length === 1 ? 'fest' : 'fests'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fests.map((fest) => (
                      <Link
                        key={fest.id}
                        to={`/fests/${club.slug}/${fest.slug}`}
                        className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-accent)]"
                      >
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                            Campus Fest
                          </span>
                          <h4 className="font-heading mt-1 text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                            {fest.title}
                          </h4>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-[1.6] text-[var(--color-text-body)]">
                            {fest.description}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-[11px] text-[var(--color-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[var(--color-accent)]" />
                            {formatDate(fest.starts_at)}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-[var(--color-accent)]">
                            Explore <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6">
                <h3 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">Published Upcoming Events</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Events currently published by {club.name}.</p>
                {events.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {events.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-left transition-all hover:border-[var(--color-accent)]"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                          {event.category || 'Event'}
                        </span>
                        <h4 className="font-heading mt-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">{event.title}</h4>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                          <Calendar className="h-3 w-3" />
                          {formatDate(event.starts_at) || 'Date to be announced'}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-5 text-xs text-[var(--color-text-muted)]">
                    No published upcoming events are available yet.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6">
                <h3 className="font-heading text-sm font-semibold text-[var(--color-text-primary)]">Club Information</h3>
                <div className="space-y-3 text-xs text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>{categoryLabel}</span>
                  </div>
                  {club.website_url && (
                    <a
                      href={club.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[var(--color-accent)] hover:underline"
                    >
                      <Globe className="h-4 w-4 text-accent" />
                      <span className="truncate">Website</span>
                    </a>
                  )}
                  {club.facebook_url && (
                    <a
                      href={club.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[var(--color-accent)] hover:underline"
                    >
                      <Share2 className="h-4 w-4 text-sky-400" />
                      <span className="truncate">Facebook</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 sm:p-8">
              <h3 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Club Activity Segments</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Published activity tracks and specialized interest groups.</p>

              {segments.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {segments.map((segment, index) => (
                    <article key={segment.id} className="overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                      {segment.image_url && (
                        <img src={segment.image_url} alt="" className="h-28 w-full object-cover" />
                      )}
                      <div className="space-y-2 p-5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-page)] font-heading text-xs font-bold text-[var(--color-accent)]">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <h4 className="font-heading text-sm font-semibold text-[var(--color-text-primary)]">{segment.title}</h4>
                        {segment.description ? (
                          <p className="text-xs leading-[1.6] text-[var(--color-text-body)]">{segment.description}</p>
                        ) : (
                          <p className="text-xs text-[var(--color-text-muted)]">No description has been published.</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-8 text-center text-xs text-[var(--color-text-muted)]">
                  No activity segments have been published yet.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-8 animate-fade-in-up">
            {/* 1. Flagship Fests */}
            {fests.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Annual Fests & Carnivals</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">Flagship gatherings, multi-segment competitions, and conventions.</p>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">{fests.length} {fests.length === 1 ? 'fest' : 'fests'}</span>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {fests.map((fest) => (
                    <article
                      key={fest.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] magazine-card-hover hover:border-[var(--color-accent)]/50"
                    >
                      <div>
                        {fest.banner_url ? (
                          <div className="relative h-40 w-full overflow-hidden border-b border-[var(--color-border-subtle)]">
                            <img src={fest.banner_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] to-transparent opacity-60" />
                          </div>
                        ) : (
                          <div className="relative h-32 w-full bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)]">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(var(--color-accent)_1px,transparent_1px)] [background-size:16px_16px]" />
                          </div>
                        )}
                        <div className="p-5">
                          <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                            Campus Fest
                          </span>
                          <h4 className="font-heading mt-2 text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                            {fest.title}
                          </h4>
                          <p className="mt-2 line-clamp-3 text-xs leading-[1.6] text-[var(--color-text-body)]">
                            {fest.description}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                              {formatDate(fest.starts_at)} – {formatDate(fest.ends_at)}
                            </span>
                            {fest.location_name && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                                {fest.location_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-page)] px-5 py-3">
                        <Link
                          to={`/fests/${club.slug}/${fest.slug}`}
                          className="editorial-link inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)]"
                        >
                          Explore Fest Program <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Hosted Events */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">Hosted Events & Competitions</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">Scheduled competitions, segments, and activities organized by {club.name}.</p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {events.length} {events.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {events.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} onSelect={(selected) => setSelectedEvent(selected)} />
                  ))}
                </div>
              ) : (
                <ProfileEmptyState
                  icon={Calendar}
                  title="No Published Upcoming Events"
                  description="This club has not published any individual event segments yet."
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6 animate-fade-in-up">
            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => {
                  const date = formatDate(achievement.achieved_on)
                  return (
                    <article key={achievement.id} className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                      {achievement.image_url && (
                        <img src={achievement.image_url} alt="" className="h-40 w-full object-cover" />
                      )}
                      <div className="p-5">
                        <Trophy className="h-5 w-5 text-[var(--color-accent)]" />
                        <h3 className="font-heading mt-3 text-base font-semibold text-[var(--color-text-primary)]">{achievement.title}</h3>
                        {achievement.description && (
                          <p className="mt-2 text-xs leading-[1.6] text-[var(--color-text-body)]">{achievement.description}</p>
                        )}
                        {(achievement.awarded_by || date) && (
                          <p className="mt-4 text-[11px] text-[var(--color-text-muted)]">
                            {[achievement.awarded_by, date].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <ProfileEmptyState
                icon={Trophy}
                title="No Club Milestones Published Yet"
                description="This club has not published achievements or competition milestones yet."
              />
            )}
          </div>
        )}

        {activeTab === 'past-events' && (
          <div className="space-y-6 animate-fade-in-up">
            {showcases.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {showcases.map((showcase) => {
                  const occurredOn = formatDate(showcase.occurred_on)
                  const card = (
                    <article className="h-full overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-accent)]/50">
                      {showcase.cover_image_url && (
                        <img src={showcase.cover_image_url} alt="" className="h-40 w-full object-cover" />
                      )}
                      <div className="p-5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                          {showcase.showcase_type}
                        </span>
                        <h3 className="font-heading mt-1 text-base font-semibold text-[var(--color-text-primary)]">{showcase.title}</h3>
                        {showcase.description && (
                          <p className="mt-2 text-xs leading-[1.6] text-[var(--color-text-body)]">{showcase.description}</p>
                        )}
                        {occurredOn && <p className="mt-4 text-[11px] text-[var(--color-text-muted)]">{occurredOn}</p>}
                      </div>
                    </article>
                  )

                  return showcase.external_url ? (
                    <a
                      key={showcase.id}
                      href={showcase.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {card}
                    </a>
                  ) : (
                    <div key={showcase.id}>{card}</div>
                  )
                })}
              </div>
            ) : (
              <ProfileEmptyState
                icon={History}
                title="No Past Event Highlights Published Yet"
                description="This club has not published event recaps, competition results, or other historical showcases yet."
              />
            )}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-fade-in-up">
            {galleryItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {galleryItems.map((item) => {
                  const takenAt = formatDate(item.taken_at)
                  return (
                    <figure key={item.id} className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                      <img
                        src={item.image_url}
                        alt={item.alt_text || `${club.name} gallery image`}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {(item.caption || takenAt) && (
                        <figcaption className="p-4">
                          {item.caption && <p className="text-xs leading-[1.5] text-[var(--color-text-body)]">{item.caption}</p>}
                          {takenAt && <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{takenAt}</p>}
                        </figcaption>
                      )}
                    </figure>
                  )
                })}
              </div>
            ) : (
              <ProfileEmptyState
                icon={ImageIcon}
                title="No Gallery Items Published Yet"
                description="This club has not published any gallery images yet."
              />
            )}
          </div>
        )}
      </div>

      <EventDetailsDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
