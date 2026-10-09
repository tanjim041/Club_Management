import { AlertCircle, ArrowRight, Calendar, CalendarX, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUpcomingFestsQuery } from '../landing-api'
import { FestCard, FestCardSkeleton } from './fest-card'

export function UpcomingFestsSection() {
  const { data: fests, isLoading, isError, error, refetch, isFetching } = useUpcomingFestsQuery()

  return (
    <section aria-labelledby="upcoming-fests-heading" className="mt-20">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-300">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Featured Carnival</span>
          </div>
          <h2
            id="upcoming-fests-heading"
            className="font-serif mt-3 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl"
          >
            Explore the Carnival
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Three days of technology, innovation, and creativity, featuring programming
            competitions, robotics, gaming tournaments, quizzes, olympiads, exhibitions, and
            project showcases for students, participants, and technology enthusiasts.
          </p>
        </div>

        <Link
          to="/fests"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          <span>View all fests</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Database-Backed Content States */}
      <div className="mt-8">
        {/* Loading State */}
        {isLoading && (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
            aria-label="Loading upcoming fests"
          >
            <FestCardSkeleton />
            <FestCardSkeleton />
            <FestCardSkeleton />
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div
            role="alert"
            className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-10 text-center shadow-lg"
          >
            <AlertCircle className="h-10 w-10 text-rose-400" aria-hidden="true" />
            <h3 className="mt-4 text-base font-semibold text-rose-200">Unable to load fests</h3>
            <p className="mt-2 text-xs leading-5 text-rose-300/80 sm:text-sm">
              {error instanceof Error ? error.message : 'An unexpected error occurred while querying Supabase records.'}
            </p>
            <button
              type="button"
              onClick={() => { void refetch() }}
              disabled={isFetching}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 border border-rose-500/30 hover:bg-rose-500/30 transition-colors focus-visible:outline-2 focus-visible:outline-rose-400 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isFetching ? 'Retrying…' : 'Retry'}</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && (!fests || fests.length === 0) && (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center shadow-inner">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-800 text-slate-400">
              <CalendarX className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">No upcoming fests scheduled yet</h3>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400 sm:text-sm">
              Organizers are putting together the next lineup of campus fests. Check back soon or register your club to host.
            </p>
            <Link
              to="/signup"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-400"
            >
              Host a Fest with Your Club
            </Link>
          </div>
        )}

        {/* Data Cards Grid */}
        {!isLoading && !isError && fests && fests.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 card-grid-interactive">
            {fests.map((fest) => (
              <FestCard key={fest.id} fest={fest} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
