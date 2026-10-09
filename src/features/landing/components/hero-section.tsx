import { ArrowRight, Calendar, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { TechText } from '../../../components/ui/tech-text'
import { useFeaturedEventsQuery, useUpcomingFestsQuery } from '../landing-api'

export function HeroSection() {
  const { data: fests = [] } = useUpcomingFestsQuery()
  const { data: events = [] } = useFeaturedEventsQuery()

  const featuredFest = fests[0]
  const supportingEvent = events[0]

  const festImage =
    featuredFest?.banner_url ||
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'

  const supportingImage =
    supportingEvent?.cover_image_url ||
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'

  return (
    <section aria-labelledby="hero-title" className="pt-4 sm:pt-6 lg:pt-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
        {/* Left Column (~55% width on desktop): Editorial Headings & Actions */}
        <div className="flex flex-col lg:col-span-7">
          {/* Subtle Category Kicker with Technical Monospace Label */}
          <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Campus Clubs & Competitions</span>
          </div>

          {/* Restrained TechText Wordmark */}
          <div className="relative my-2.5 h-11 w-full max-w-[280px] sm:h-14 sm:max-w-[340px]">
            <TechText
              text="Festivo"
              fontFamily="'Cormorant Garamond', 'Space Grotesk', serif"
              fontWeight={700}
              fontSize={74}
              letterSpacing={-0.02}
              color="var(--color-text-primary)"
              accentColor="var(--color-accent)"
              reveal="letter"
              lineStyle="dashed"
              dashLength={4}
              dashGap={2}
              strokeWidth={1.5}
              specks={5}
              selection={true}
              labels={false}
              draggable={false}
              sweep={false}
            />
          </div>

          {/* Main Editorial Headline with Serif and Italic Accent */}
          <h1
            id="hero-title"
            className="font-serif font-semibold tracking-[-0.02em] leading-[1.08] text-text-primary"
            style={{ fontSize: 'clamp(2.5rem, 5.2vw, 4.25rem)' }}
          >
            Find your people.
            <br />
            <span className="font-serif italic font-normal text-accent tracking-normal">
              Make your next move.
            </span>
          </h1>

          {/* Description */}
          <p className="mt-5 max-w-xl text-base leading-[1.6] text-[var(--color-text-body)] sm:text-lg">
            Explore campus clubs, discover competitions, and turn participation into memorable experiences.
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link to="/clubs" id="hero-explore-clubs-btn">
              <Button size="lg" className="px-6 py-3.5 text-sm sm:text-base font-semibold">
                Explore Clubs
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              </Button>
            </Link>

            <Link to="/events" id="hero-explore-events-btn">
              <Button variant="secondary" size="lg" className="px-6 py-3.5 text-sm sm:text-base">
                Explore Events
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column (~45% width on desktop): Asymmetric Editorial Visual Composition */}
        <div className="relative lg:col-span-5" aria-label="Campus event highlights">
          {/* Main Featured Visual Tile */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-2xl magazine-card-hover group">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-surface)]">
              <img
                src={festImage}
                alt={featuredFest?.title || 'Featured Campus Festival'}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-page)] via-[var(--color-page)]/40 to-transparent" />

              {/* Editorial Pill */}
              <div className="absolute top-3 left-3">
                <span className="rounded-full bg-[var(--color-page)]/80 backdrop-blur-md border border-[var(--color-border-subtle)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  Featured Festival
                </span>
              </div>
            </div>

            {/* Event Info Strip */}
            <div className="p-4 sm:p-5">
              <h2 className="font-heading text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-xl line-clamp-1">
                {featuredFest?.title || 'Campus Innovation Festival 2026'}
              </h2>

              <div className="mt-2.5 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-[var(--color-text-muted)]">
                {featuredFest?.starts_at && (
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(featuredFest.starts_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  <span className="truncate max-w-[200px]">
                    {featuredFest?.location_name || 'Auditorium • Main Campus'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Supporting Event Card (Asymmetric overlapping layout) */}
          <div className="mt-4 sm:-mt-6 sm:ml-10 relative z-10 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 backdrop-blur-md p-4 shadow-xl magazine-card-hover">
            <div className="flex items-center gap-3.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                <img
                  src={supportingImage}
                  alt={supportingEvent?.title || 'Event preview'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {supportingEvent?.category || 'Competition'}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">• Spotlight</span>
                </div>
                <h3 className="font-heading text-sm font-semibold text-[var(--color-text-primary)] truncate">
                  {supportingEvent?.title || 'Annual Programming Contest'}
                </h3>
                <Link
                  to="/events"
                  className="editorial-link mt-1 text-xs text-[var(--color-accent)] font-medium"
                >
                  Explore details <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
