import { useState, useEffect } from 'react'
import {
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FolderKanban,
  History,
  ImageIcon,
  Info,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { ErrorState, LoadingState, UnauthorizedState } from '../../components/states/page-states'
import { RequireRole, useAuth } from './auth-context'
import {
  useAuthorizedClubsQuery,
  useOrganizerClubEventsQuery,
  useOrganizerClubRegistrationsQuery,
  useOrganizerStatsQuery,
  useParticipantRegistrationsQuery,
} from '../dashboard/dashboard-api'
import { useFeaturedEventsQuery } from '../landing/landing-api'
import { ClubContentEditor, ClubProfileEditor } from '../clubs/club-management'

// ---------------------------------------------------------------------------
// 1. Participant Dashboard
// ---------------------------------------------------------------------------
function ParticipantDashboard() {
  const { profile, user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'profile' | 'schedule'>('overview')
  const { data: registrations = [], isLoading: isLoadingRegs, isError: registrationsError, error: registrationsLoadError, refetch: refetchRegistrations } = useParticipantRegistrationsQuery(user?.id)
  const { data: allEvents = [] } = useFeaturedEventsQuery()

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Participant'
  const confirmedSchedule = registrations.filter((item) => item.status === 'confirmed').sort((a, b) =>
    (a.events?.starts_at || '').localeCompare(b.events?.starts_at || ''))

  return (
    <div className="content-container space-y-6 py-4 sm:py-6">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link to="/" className="hover:text-[var(--color-text-primary)]">Festivo</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--color-accent)] font-semibold">Participant Workspace</span>
        </nav>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
            <User className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            {profile?.full_name || user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={() => { void signOut() }}>
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Dashboard Layout: Sidebar + Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 space-y-1">
            {[
              { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
              { id: 'registrations' as const, label: 'My Registrations', icon: FolderKanban, count: registrations.length },
              { id: 'schedule' as const, label: 'My Schedule', icon: Calendar },
              { id: 'profile' as const, label: 'Participant Profile', icon: User },
            ].map((nav) => {
              const Icon = nav.icon
              const isSelected = activeTab === nav.id
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveTab(nav.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-surface-raised)] text-[var(--color-accent)] border border-[var(--color-border-subtle)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    {nav.label}
                  </span>
                  {typeof nav.count === 'number' && (
                    <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {nav.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)] space-y-2">
            <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Quick Discovery
            </p>
            <p className="text-[11px] leading-[1.6] text-[var(--color-text-body)]">
              Explore open challenges and get involved with campus student clubs.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/events" className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1">
                Browse Events <ChevronRight className="h-3 w-3" />
              </Link>
              <Link to="/clubs" className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1">
                Find Clubs <ChevronRight className="h-3 w-3" />
              </Link>
              <Link to="/event-matcher" className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1">
                Event Matcher <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* 1. Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Welcome Banner */}
              <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 sm:p-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  Welcome back
                </span>
                <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  Hello, {firstName}.
                </h1>
                <p className="mt-1 text-sm leading-[1.6] text-[var(--color-text-body)]">
                  {profile?.institution ? `Representing ${profile.institution}. ` : ''}
                  Here is the status of your campus event participation and upcoming opportunities.
                </p>

                {/* Metric Summary Cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Active Registrations</span>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {registrations.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Profile Status</span>
                    <p className="mt-1 text-base font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {profile?.profile_completed ? 'Verified & Complete' : 'Standard'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Available Campus Events</span>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-accent)]">
                      {allEvents.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-surface-raised)] text-[var(--color-accent)]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <h3 className="font-heading text-sm font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">Explore Events</h3>
                  </div>
                  <p className="text-xs leading-[1.6] text-[var(--color-text-body)]">
                    Browse programming contests, robotics tournaments, and project exhibitions.
                  </p>
                  <Link to="/events" className="inline-block pt-1">
                    <Button size="sm">Explore Events Catalog</Button>
                  </Link>
                </div>

                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-surface-raised)] text-[var(--color-accent)]">
                      <Bot className="h-4 w-4" />
                    </div>
                    <h3 className="font-heading text-sm font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">Ask Festivo</h3>
                  </div>
                  <p className="text-xs leading-[1.6] text-[var(--color-text-body)]">
                    Get answers about rules, schedules, venues, and personalized recommendations.
                  </p>
                  <Link to="/assistant" className="inline-block pt-1">
                    <Button variant="outline" size="sm">Open AI Assistant</Button>
                  </Link>
                </div>

                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-surface-raised)] text-[var(--color-accent)]">
                      <Compass className="h-4 w-4" />
                    </div>
                    <h3 className="font-heading text-sm font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">Campus Clubs</h3>
                  </div>
                  <p className="text-xs leading-[1.6] text-[var(--color-text-body)]">
                    Discover active student societies, tracks, and connect with peer coordinators.
                  </p>
                  <Link to="/clubs" className="inline-block pt-1">
                    <Button variant="secondary" size="sm">View Club Directory</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 2. My Registrations Tab */}
          {activeTab === 'registrations' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">My Registrations</h2>
                  <p className="text-xs leading-[1.6] text-[var(--color-text-muted)]">
                    Your confirmed entries, team status, and participation records.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/my-registrations"><Button size="sm" variant="secondary">Open My Registrations</Button></Link>
                  <Link to="/events"><Button size="sm">Browse More Events</Button></Link>
                </div>
              </div>

              {isLoadingRegs ? (
                <LoadingState label="Loading your registrationsâ€¦" />
              ) : registrationsError ? (
                <ErrorState title="Could not load registrations" description={registrationsLoadError instanceof Error ? registrationsLoadError.message : 'Please try again.'} onRetry={() => { void refetchRegistrations() }} />
              ) : registrations.length === 0 ? (
                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-12 text-center">
                  <FolderKanban className="mx-auto h-10 w-10 text-[var(--color-accent)]" />
                  <h3 className="mt-4 font-heading text-base font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">No Registrations Yet</h3>
                  <p className="mt-1.5 max-w-sm mx-auto text-xs leading-[1.6] text-[var(--color-text-body)]">
                    You have not registered for any events. Browse the events catalog to find multi-track challenges.
                  </p>
                  <Link to="/events" className="mt-6 inline-block">
                    <Button size="sm">Browse Events</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {registrations.map((reg) => {
                    const statusBg =
                      reg.status === 'confirmed'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : reg.status === 'waitlisted'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400'

                    const teamName = reg.metadata?.team_name

                    return (
                      <div
                        key={reg.id}
                        className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBg}`}>
                              {reg.status === 'waitlisted' ? `Waitlisted #${reg.current_waitlist_position ?? reg.waitlist_position ?? '—'}` : reg.status}
                            </span>
                            {reg.events?.category && (
                              <span className="rounded-md bg-[var(--color-surface-raised)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]">
                                {reg.events.category}
                              </span>
                            )}
                            {reg.events?.registration_mode === 'team' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-raised)] px-2 py-0.5 text-[11px] text-[var(--color-accent)]">
                                <Users className="h-3 w-3" /> Team Entry
                              </span>
                            )}
                          </div>
                          <h4 className="font-heading text-base font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                            {reg.events?.title || 'Registered Event'}
                          </h4>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {reg.events?.fests?.title || 'Campus Festival'}
                          </p>
                          <Link to={`/my-registrations/${reg.id}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--color-accent)] hover:underline">View registration details</Link>
                          {teamName && (
                            <div className="text-xs text-[var(--color-text-body)] flex items-center gap-1.5 pt-0.5">
                              <span className="text-[var(--color-text-muted)]">Team:</span>
                              <span className="font-semibold text-[var(--color-text-primary)]">{teamName}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-[var(--color-text-muted)] sm:text-right space-y-1.5 shrink-0">
                          <div className="flex items-center sm:justify-end gap-1.5 text-amber-300">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {reg.events?.starts_at
                                ? new Date(reg.events.starts_at).toLocaleDateString()
                                : 'TBA'}
                            </span>
                          </div>
                          {reg.events?.venue && (
                            <div className="flex items-center sm:justify-end gap-1.5 text-sky-400">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{reg.events.venue}</span>
                            </div>
                          )}
                          <div className="text-[11px] text-[var(--color-text-muted)] sm:text-right pt-0.5">
                            Registered: {new Date(reg.registered_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h2 className="font-heading text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">My Event Schedule</h2>
                <p className="text-xs leading-[1.6] text-[var(--color-text-muted)]">
                  Timelines and locations for all events you are enrolled in.
                </p>
                <Link to="/my-schedule" className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-[var(--color-accent)] hover:underline">Open full schedule and calendar export</Link>
              </div>

              {isLoadingRegs ? <LoadingState label="Loading your schedule..." /> : registrationsError ? <ErrorState title="Could not load schedule" description="Please try again." onRetry={() => { void refetchRegistrations() }} /> : confirmedSchedule.length === 0 ? (
                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-10 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-[var(--color-accent)]" />
                  <p className="mt-3 font-heading text-sm font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">No Scheduled Events</p>
                  <p className="mt-1 text-xs leading-[1.6] text-[var(--color-text-body)]">
                    Once you register for events, your chronological timeline will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {confirmedSchedule.map((reg, idx) => (
                    <div
                      key={reg.id}
                      className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 flex items-center gap-4"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-surface-raised)] text-[var(--color-accent)] font-semibold text-sm">
                        0{idx + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-heading text-sm font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                          {reg.events?.title || 'Event'}
                        </h4>
                        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 mt-0.5">
                          <span>{reg.events?.venue || 'Venue TBA'}</span>
                          <span>â€¢</span>
                          <span className="text-amber-300">
                            {reg.events?.starts_at ? new Date(reg.events.starts_at).toLocaleDateString() : 'Date TBA'}
                          </span>
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--color-surface-raised)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)]">
                        Confirmed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Participant Profile</h2>
                  <p className="text-xs leading-[1.6] text-[var(--color-text-muted)]">Your registered details and participant preferences.</p>
                </div>
                <Link to="/complete-profile">
                  <Button variant="secondary" size="sm">Edit Profile</Button>
                </Link>
              </div>

              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[var(--color-text-muted)]">Full Name</span>
                    <p className="mt-1 font-medium text-[var(--color-text-primary)] text-sm">{profile?.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Account Email</span>
                    <p className="mt-1 font-medium text-[var(--color-text-primary)] text-sm">{user?.email}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Institution</span>
                    <p className="mt-1 font-medium text-[var(--color-text-primary)] text-sm">{profile?.institution || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Phone</span>
                    <p className="mt-1 font-medium text-[var(--color-text-primary)] text-sm">{profile?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Experience Level</span>
                    <p className="mt-1 font-medium text-[var(--color-text-primary)] text-sm capitalize">{profile?.experience_level || 'Beginner'}</p>
                  </div>
                </div>

                {/* Interests & Skills Tags */}
                {profile?.interests && profile.interests.length > 0 && (
                  <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                    <span className="text-xs text-[var(--color-text-muted)]">Interests</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {profile.interests.map((int, i) => (
                        <span key={i} className="rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] px-2.5 py-1 text-xs text-[var(--color-accent)] font-medium">
                          {int}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Club Organizer Dashboard
// ---------------------------------------------------------------------------
function OrganizerDashboard() {
  const { user, signOut } = useAuth()
  const { clubSlug } = useParams<{ clubSlug?: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<
    'overview' | 'profile' | 'segments' | 'events' | 'registrations' | 'achievements' | 'past-events' | 'gallery' | 'settings'
  >('overview')
  const [registrationFilter, setRegistrationFilter] = useState<'all' | 'confirmed' | 'waitlisted' | 'cancelled' | 'attended'>('all')
  const [registrationSearch, setRegistrationSearch] = useState('')

  const { data: clubs = [], isLoading, isError, error, refetch } = useAuthorizedClubsQuery(user?.id)
  const currentClub = clubSlug ? clubs.find((c) => c.slug === clubSlug) : clubs[0]
  const { data: metrics = { festCount: 0, eventCount: 0, regCount: 0 }, isError: metricsError } = useOrganizerStatsQuery(currentClub?.id)
  const { data: clubEvents = [], isError: eventsError } = useOrganizerClubEventsQuery(currentClub?.id)
  const { data: clubRegistrations = [], isLoading: isLoadingRegistrations, isError: registrationsError } = useOrganizerClubRegistrationsQuery(currentClub?.id)

  // Redirect to first club's scoped route if visiting /organizer directly
  useEffect(() => {
    if (!isLoading && clubs.length > 0 && !clubSlug) {
      navigate(`/organizer/${clubs[0].slug}`, { replace: true })
    }
  }, [isLoading, clubs, clubSlug, navigate])

  if (isLoading) {
    return <LoadingState label="Loading club operations dashboardâ€¦" />
  }

  if (isError) {
    return (
      <div className="content-container py-12">
        <ErrorState
          title="Could not load authorized clubs"
          description={error instanceof Error ? error.message : 'Please try again.'}
          onRetry={() => { void refetch() }}
        />
      </div>
    )
  }

  if (clubs.length === 0) {
    return (
      <div className="content-container py-12">
        <UnauthorizedState
          title="No Club Assigned"
          description="Your account is not assigned as an organizer to any student clubs. Please contact your campus administrator."
        />
      </div>
    )
  }

  if (clubSlug && !currentClub) {
    return (
      <div className="content-container py-12">
        <UnauthorizedState
          title="Club Access Denied"
          description={`You do not have organizer privileges for "${clubSlug}". Choose an authorized club from your workspace.`}
        />
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/organizer/${clubs[0].slug}`)}>
            Switch to {clubs[0].name}
          </Button>
        </div>
      </div>
    )
  }

  if (!currentClub) {
    return <div className="content-container py-12"><UnauthorizedState /></div>
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Club Profile', icon: Info },
    { id: 'segments', label: 'Segments', icon: Layers },
    { id: 'events', label: 'Fests & Events', icon: Calendar, count: clubEvents.length },
    { id: 'registrations', label: 'Registrations', icon: FolderKanban, count: clubRegistrations.length },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'past-events', label: 'Past Events', icon: History },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  return (
    <div className="content-container space-y-6 py-4 sm:py-6">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link to="/" className="hover:text-[var(--color-text-primary)]">Festivo</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--color-accent)] font-semibold">Organizer Workspace</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--color-text-primary)]">{currentClub.name}</span>
        </nav>

        {/* Club Selector / Switcher */}
        <div className="flex items-center gap-3">
          {clubs.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">Active Club:</span>
              <select
                value={currentClub.slug}
                onChange={(e) => navigate(`/organizer/${e.target.value}`)}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none cursor-pointer"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              {currentClub.name}
            </span>
          )}

          <Button variant="ghost" size="sm" onClick={() => { void signOut() }}>
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar Nav */}
        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 space-y-1">
            {navItems.map((nav) => {
              const Icon = nav.icon
              const isSelected = activeTab === nav.id
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveTab(nav.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-surface-raised)] text-[var(--color-accent)] border border-[var(--color-border-subtle)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    {nav.label}
                  </span>
                  {'count' in nav && typeof nav.count === 'number' && (
                    <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {nav.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)] space-y-2">
            <p className="font-semibold text-[var(--color-text-primary)]">Public Showcase</p>
            <p className="text-[11px] leading-[1.6] text-[var(--color-text-body)]">
              View how your club profile and events appear to students across campus.
            </p>
            <Link to={`/clubs/${currentClub.slug}`} className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 pt-1">
              Public Page <ChevronRight className="h-3 w-3" />
            </Link>
            <Link to="/analytics" className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 pt-1">
              Analytics & Copilot <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>

        {/* Dashboard Content */}
        <div className="lg:col-span-9 space-y-6">
          {(metricsError || eventsError) && (
            <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
              Some club data could not be loaded. Refresh the page to try again.
            </div>
          )}
          {/* 1. Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-lg font-bold text-[var(--color-accent)]">
                    {currentClub.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="font-heading text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">{currentClub.name}</h1>
                    <p className="text-xs text-[var(--color-text-muted)]">Club Operations Management</p>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Hosted Fests</span>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{metrics.festCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Confirmed Events</span>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-accent)]">{metrics.eventCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Total Registrations</span>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{metrics.regCount}</p>
                  </div>
                </div>
              </div>

              {/* Upcoming Events Overview */}
              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-base font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">Upcoming Events</h3>
                  <Link to="/events" className="text-xs font-semibold text-[var(--color-accent)] hover:underline">
                    View Catalog
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {clubEvents.slice(0, 4).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs"
                    >
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)]">{event.title}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {event.category} â€¢ {event.venue || 'Venue TBA'}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-accent)]">
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Club Profile */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in-up"><ClubProfileEditor key={currentClub.id} club={currentClub} /></div>
          )}

          {/* 3. Segments */}
          {activeTab === 'segments' && (
            <div className="animate-fade-in-up"><ClubContentEditor key={currentClub.id} club={currentClub} kind="segments" /></div>
          )}

          {/* 4. Events */}
          {activeTab === 'events' && (
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-4 animate-fade-in-up">
              <h3 className="font-heading text-base font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">Fests & Events</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Catalog of scheduled competitions.</p>

              <div className="space-y-2">
                {clubEvents.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[var(--color-text-primary)]">{ev.title}</span>
                      <span className="text-[var(--color-text-muted)] ml-2">({ev.registration_mode})</span>
                    </div>
                    <span className="text-[var(--color-accent)] font-mono">{ev.capacity} {ev.registration_mode === 'team' ? 'teams' : 'people'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Registrations */}
          {activeTab === 'registrations' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                    Participant Registrations & Gate Roster
                  </h3>
                  <p className="text-xs leading-[1.6] text-[var(--color-text-muted)]">
                    Real-time registration submissions, team rosters, waitlist standings, and gate attendance for {currentClub.name}.
                  </p>
                </div>
              </div>

              {/* 4 Derived Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
                  <span className="text-[11px] text-[var(--color-text-muted)]">Total Registrations</span>
                  <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{clubRegistrations.length}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <span className="text-[11px] text-emerald-400">Confirmed Entries</span>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {clubRegistrations.filter((r) => r.status === 'confirmed').length}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <span className="text-[11px] text-amber-400">Waitlist Queue</span>
                  <p className="mt-1 text-xl font-bold text-amber-400">
                    {clubRegistrations.filter((r) => r.status === 'waitlisted').length}
                  </p>
                </div>
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                  <span className="text-[11px] text-sky-400">Gate Verified</span>
                  <p className="mt-1 text-xl font-bold text-sky-400">
                    {clubRegistrations.reduce((total, r) => total + r.checked_in_people, 0)}
                  </p>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={registrationSearch}
                    onChange={(e) => setRegistrationSearch(e.target.value)}
                    placeholder="Search attendee, event, or team..."
                    className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] pl-9 pr-3 py-2 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {(
                    [
                      { id: 'all', label: 'All', count: clubRegistrations.length },
                      {
                        id: 'confirmed',
                        label: 'Confirmed',
                        count: clubRegistrations.filter((r) => r.status === 'confirmed').length,
                      },
                      {
                        id: 'waitlisted',
                        label: 'Waitlist',
                        count: clubRegistrations.filter((r) => r.status === 'waitlisted').length,
                      },
                      {
                        id: 'attended',
                        label: 'Gate Verified',
                        count: clubRegistrations.reduce((total, r) => total + r.checked_in_people, 0),
                      },
                      {
                        id: 'cancelled',
                        label: 'Cancelled',
                        count: clubRegistrations.filter((r) => r.status === 'cancelled').length,
                      },
                    ] as const
                  ).map((filter) => {
                    const isActive = registrationFilter === filter.id
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setRegistrationFilter(filter.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                          isActive
                            ? 'bg-[var(--color-surface-raised)] text-[var(--color-accent)] border border-[var(--color-border-subtle)]'
                            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        {filter.label}
                        <span className="text-[10px] opacity-75 font-mono">({filter.count})</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Registration List / Table */}
              {isLoadingRegistrations ? (
                <LoadingState label="Loading attendee records..." />
              ) : registrationsError ? (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                  Could not load club registrations. Ensure you have organizer privileges.
                </div>
              ) : (
                (() => {
                  const filtered = clubRegistrations.filter((reg) => {
                    if (registrationFilter === 'confirmed' && reg.status !== 'confirmed') return false
                    if (registrationFilter === 'waitlisted' && reg.status !== 'waitlisted') return false
                    if (registrationFilter === 'cancelled' && reg.status !== 'cancelled') return false
                    if (registrationFilter === 'attended' && reg.checked_in_people === 0) return false

                    if (registrationSearch.trim()) {
                      const term = registrationSearch.toLowerCase()
                      const name = reg.profiles?.full_name?.toLowerCase() || ''
                      const eventTitle = reg.events?.title?.toLowerCase() || ''
                      const teamName = reg.metadata?.team_name?.toLowerCase() || ''
                      const institution = reg.profiles?.institution?.toLowerCase() || ''
                      return (
                        name.includes(term) ||
                        eventTitle.includes(term) ||
                        teamName.includes(term) ||
                        institution.includes(term)
                      )
                    }
                    return true
                  })

                  if (filtered.length === 0) {
                    return (
                      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-12 text-center text-xs text-[var(--color-text-muted)]">
                        <FolderKanban className="mx-auto h-8 w-8 text-[var(--color-text-muted)] opacity-50" />
                        <p className="mt-3 font-semibold text-[var(--color-text-primary)]">No matching registrations found</p>
                        <p className="mt-1">Try clearing your search query or switching filters.</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-3">
                      {filtered.map((reg) => {
                        const statusPill =
                          reg.status === 'confirmed'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : reg.status === 'waitlisted'
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'

                        const isGateVerified = reg.checked_in_people > 0
                        const teamName = reg.metadata?.team_name
                        const teamRoster = reg.metadata?.team_roster

                        return (
                          <div
                            key={reg.id}
                            className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
                          >
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusPill}`}>
                                  {reg.status === 'waitlisted' ? `Waitlisted #${reg.waitlist_position ?? 1}` : reg.status}
                                </span>

                                {reg.events?.registration_mode === 'team' ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-raised)] px-2 py-0.5 text-[11px] text-[var(--color-accent)] font-medium">
                                    <Users className="h-3 w-3" /> Team Entry
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-raised)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)] font-medium">
                                    <User className="h-3 w-3" /> Individual
                                  </span>
                                )}

                                {isGateVerified ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" /> {reg.checked_in_people}/{reg.confirmed_people} checked in
                                  </span>
                                ) : (
                                  reg.status === 'confirmed' && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
                                      <Clock className="h-3 w-3" /> Gate Pending
                                    </span>
                                  )
                                )}
                              </div>

                              <div>
                                <h4 className="font-heading text-base font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                                  {reg.profiles?.full_name || 'Participant'}
                                </h4>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {reg.profiles?.institution || 'Institution unspecified'}
                                  {reg.profiles?.email ? ` â€¢ ${reg.profiles.email}` : ''}
                                </p>
                              </div>

                              <div className="pt-1 text-xs">
                                <p className="font-medium text-[var(--color-text-body)]">
                                  Event: <span className="text-[var(--color-accent)]">{reg.events?.title || 'Unknown Event'}</span>
                                </p>
                                {teamName && (
                                  <div className="mt-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-2.5 text-xs">
                                    <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)]">
                                      <Users className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                                      <span>Team: {teamName}</span>
                                    </div>
                                    {teamRoster && teamRoster.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-[var(--color-text-muted)]">
                                        <span>Roster:</span>
                                        {teamRoster.map((m, idx) => (
                                          <span key={idx} className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[var(--color-text-body)]">
                                            {m.name} ({m.role || 'Member'})
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-xs text-[var(--color-text-muted)] md:text-right space-y-1.5 shrink-0 pt-1">
                              {reg.events?.starts_at && (
                                <div className="flex items-center md:justify-end gap-1.5 text-amber-300">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{new Date(reg.events.starts_at).toLocaleDateString()}</span>
                                </div>
                              )}
                              {reg.events?.venue && (
                                <div className="flex items-center md:justify-end gap-1.5 text-sky-400">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{reg.events.venue}</span>
                                </div>
                              )}
                              <div className="text-[11px] text-[var(--color-text-muted)] pt-1">
                                Registered: {new Date(reg.registered_at).toLocaleDateString()}
                              </div>
                              {reg.metadata?.checked_in_at && (
                                <div className="text-[11px] text-emerald-400">
                                  Checked In: {new Date(reg.metadata.checked_in_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()
              )}
            </div>
          )}

          {/* 6. Achievements */}
          {activeTab === 'achievements' && (
            <div className="animate-fade-in-up"><ClubContentEditor key={currentClub.id} club={currentClub} kind="achievements" /></div>
          )}

          {/* 7. Past Events */}
          {activeTab === 'past-events' && (
            <div className="animate-fade-in-up"><ClubContentEditor key={currentClub.id} club={currentClub} kind="showcases" /></div>
          )}

          {/* 8. Gallery */}
          {activeTab === 'gallery' && (
            <div className="animate-fade-in-up"><ClubContentEditor key={currentClub.id} club={currentClub} kind="gallery" /></div>
          )}

          {/* 9. Settings */}
          {activeTab === 'settings' && (
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-4 animate-fade-in-up">
              <h3 className="font-heading text-base font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">Club Parameters</h3>
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 text-xs text-[var(--color-text-body)]">
                <p className="font-medium text-[var(--color-text-primary)]">Authorization Boundaries</p>
                <p className="mt-1 leading-relaxed">
                  Organization ownership is tied to Supabase UUID: <code className="text-[var(--color-accent)]">{user?.id}</code>.
                  Access changes require superuser authorization.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Check-In Dashboard
// ---------------------------------------------------------------------------
function CheckInDashboard() {
  const { signOut } = useAuth()
  const [lookupQuery, setLookupQuery] = useState('')

  return (
    <div className="content-container space-y-6 py-4 sm:py-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link to="/" className="hover:text-[var(--color-text-primary)]">Festivo</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--color-accent)] font-semibold">Gate Check-In Workspace</span>
        </nav>
        <Button variant="ghost" size="sm" onClick={() => { void signOut() }}>
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Sign out
        </Button>
      </div>

      <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-accent)]">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">Gate Verification Tool</h1>
            <p className="text-xs leading-[1.6] text-[var(--color-text-muted)]">Verify registered student passes and digital tickets.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            placeholder="Scan pass barcode or enter participant emailâ€¦"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] py-3 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]/60 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 text-center text-xs text-[var(--color-text-body)]">
          <p className="font-medium text-[var(--color-text-primary)]">Scanner Ready</p>
          <p className="mt-1">Point handheld camera scanner at ticket QR code to verify registration status.</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Route Wrappers
// ---------------------------------------------------------------------------
export function ParticipantDashboardPage() {
  return (
    <RequireRole allowedRoles={['participant']}>
      <ParticipantDashboard />
    </RequireRole>
  )
}

export function OrganizerDashboardPage() {
  return (
    <RequireRole allowedRoles={['organizer']}>
      <OrganizerDashboard />
    </RequireRole>
  )
}

export function CheckInDashboardPage() {
  return (
    <RequireRole allowedRoles={['check_in_staff']}>
      <CheckInDashboard />
    </RequireRole>
  )
}
