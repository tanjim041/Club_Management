import { useMemo, useState } from 'react'
import { ArrowRight, Compass, ExternalLink, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { useClubsQuery } from '../landing/landing-api'

export function ClubDirectoryPage() {
  const { data: clubs = [], isLoading, isError, refetch } = useClubsQuery()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = useMemo(() => ['All', ...new Set(clubs.map((club) => club.category).filter((value): value is string => Boolean(value)))], [clubs])

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesSearch =
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesSearch && (selectedCategory === 'All' || club.category === selectedCategory)
    })
  }, [clubs, searchQuery, selectedCategory])

  return (
    <div className="content-container space-y-8 py-6 sm:py-8 lg:py-10">
      {/* Editorial Header Row */}
      <div className="border-b border-[var(--color-border-subtle)] pb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          <Compass className="h-3.5 w-3.5" />
          <span>Campus Directory</span>
        </div>
        <h1 className="font-heading mt-3 text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl">
          Student Clubs & Societies
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-[1.6] text-[var(--color-text-body)] sm:text-base">
          Discover registered campus organizations, join activity segments, explore annual fests, and celebrate student achievements.
        </p>

        {/* Search & Filter Controls */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clubs by name or keywordsâ€¦"
              className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]/60 transition-colors focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold'
                    : 'border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Count Status */}
      <div className="flex items-center justify-between px-1 text-xs text-[var(--color-text-muted)]">
        <span>
          Showing <strong className="text-[var(--color-text-primary)]">{filteredClubs.length}</strong>{' '}
          {filteredClubs.length === 1 ? 'club' : 'clubs'}
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[var(--color-accent)] hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Clubs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-72 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-[var(--color-surface)] p-10 text-center text-sm text-rose-300">
          <p>Failed to load student clubs.</p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()} className="mt-4">
            Try again
          </Button>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="py-12 text-center border-y border-[var(--color-border-subtle)]">
          <Sparkles className="mx-auto h-8 w-8 text-[var(--color-accent)]" />
          <h3 className="font-heading mt-3 text-base font-semibold text-[var(--color-text-primary)]">
            No matching student organizations found
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Try adjusting your search terms or selecting a different category filter.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('All')
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div
          className={`grid gap-6 sm:gap-8 ${
            filteredClubs.length === 1
              ? 'grid-cols-1 max-w-md'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filteredClubs.map((club) => {
            const initials = club.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')

            return (
              <article
                key={club.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] magazine-card-hover hover:border-[var(--color-accent)]/50"
              >
                <div>
                  {/* Banner */}
                  <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)]">
                    {club.cover_image_url && <img src={club.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(var(--color-accent)_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-[var(--color-page)]/80 backdrop-blur-md border border-[var(--color-border-subtle)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        Campus Chapter
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4">
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt={`${club.name} logo`}
                          className="h-12 w-12 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-page)] object-cover shadow-lg"
                        />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-accent)] shadow-lg">
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                      {club.name}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-[1.6] text-[var(--color-text-body)]">
                      {club.description ||
                        'Dedicated to student activities and community collaboration.'}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-5 py-3.5 bg-[var(--color-page)]">
                  <Link
                    to={`/clubs/${club.slug}`}
                    className="editorial-link text-xs font-semibold text-[var(--color-accent)]"
                  >
                    View Club <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>

                  {club.website_url && (
                    <a
                      href={club.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
