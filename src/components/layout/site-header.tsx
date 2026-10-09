import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, Sparkles, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getPostAuthenticationPath, useAuth } from '../../features/auth'

type MenuName = 'mobile' | 'account' | 'more' | null

const focusStyle = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page'

export function SiteHeader() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState<MenuName>(null)
  const [scrolled, setScrolled] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const headerRef = useRef<HTMLElement>(null)
  const mobileButtonRef = useRef<HTMLButtonElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)
  const accountPanelRef = useRef<HTMLDivElement>(null)
  const morePanelRef = useRef<HTMLDivElement>(null)
  const desktopNavRef = useRef<HTMLElement>(null)
  const activeCapsuleRef = useRef<HTMLSpanElement>(null)

  const isSignedIn = auth.status === 'authenticated' && Boolean(auth.user)
  const dashboardPath = getPostAuthenticationPath(auth)
  const displayName = auth.profile?.full_name?.trim() || auth.user?.email || 'Account'
  const isParticipant = auth.role === 'participant'
  const pathname = location.pathname
  const isEventDetail = /^\/fests\/[^/]+\/[^/]+\/events\/[^/]+$/.test(pathname)
  const isAssistant = pathname === '/assistant' || pathname === '/ask-festivo' || pathname === '/ask'

  const active = {
    home: pathname === '/' && location.hash !== '#how-it-works',
    clubs: pathname === '/clubs' || pathname.startsWith('/clubs/'),
    events: pathname === '/events' || pathname.startsWith('/events/') || isEventDetail,
    fests: (pathname === '/fests' || pathname.startsWith('/fests/')) && !isEventDetail,
    assistant: isAssistant,
    how: pathname === '/' && location.hash === '#how-it-works',
    dashboard: pathname === dashboardPath || pathname.startsWith(`${dashboardPath}/`) || pathname === '/dashboard',
  }

  // Scroll detection to gently elevate navbar styling on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smooth sliding capsule position tracking
  useLayoutEffect(() => {
    const nav = desktopNavRef.current
    const capsule = activeCapsuleRef.current
    if (!nav || !capsule) return

    const update = () => {
      const selected = nav.querySelector<HTMLElement>('[data-active="true"]')
      if (!selected) {
        capsule.style.opacity = '0'
        return
      }
      const navRect = nav.getBoundingClientRect()
      const selectedRect = selected.getBoundingClientRect()
      const x = selectedRect.left - navRect.left
      const y = selectedRect.top - navRect.top
      const width = selectedRect.width
      const height = selectedRect.height

      capsule.style.transform = `translate3d(${x}px, ${y}px, 0)`
      capsule.style.width = `${width}px`
      capsule.style.height = `${height}px`
      capsule.style.opacity = '1'
    }

    update()
    const frame = window.requestAnimationFrame(() => {
      capsule.dataset.ready = 'true'
    })
    const observer = new ResizeObserver(update)
    observer.observe(nav)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [pathname, location.hash])

  function closeMenus() {
    setOpenMenu(null)
  }

  function toggleMenu(name: Exclude<MenuName, null>, panel: React.RefObject<HTMLDivElement | null>) {
    const next = openMenu === name ? null : name
    setOpenMenu(next)
    if (next) window.requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('a, button')?.focus())
  }

  useEffect(() => {
    if (!openMenu) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpenMenu(null)
      const trigger = openMenu === 'mobile' ? mobileButtonRef : openMenu === 'account' ? accountButtonRef : moreButtonRef
      trigger.current?.focus()
    }
    function onPointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setOpenMenu(null)
    }
    function onFocusIn(event: FocusEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [openMenu])

  async function handleSignOut() {
    setSignOutError(null)
    try {
      await auth.signOut()
      closeMenus()
      navigate('/')
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Could not sign out. Please try again.')
    }
  }

  const primaryLinks = [
    { label: 'Home', to: '/', current: active.home },
    { label: 'Clubs', to: '/clubs', current: active.clubs },
    { label: 'Events', to: '/events', current: active.events },
    { label: 'Ask Festivo', to: '/assistant', current: active.assistant },
  ]

  return (
    <header
      ref={headerRef}
      className="sticky top-3 sm:top-5 z-50 w-full px-3 sm:px-6 pointer-events-none transition-all duration-300"
    >
      <div className="floating-navbar-container mx-auto">
        <div
          className={`floating-navbar pointer-events-auto ${scrolled ? 'floating-navbar-scrolled' : ''}`}
        >
          {/* Left: Festivo Brand */}
          <Link
            to="/"
            onClick={closeMenus}
            className={`group inline-flex shrink-0 items-center gap-2.5 rounded-full px-2 py-1 transition-opacity ${focusStyle}`}
            aria-label="Festivo home"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent border border-accent/25 transition-transform duration-300 group-hover:scale-105 group-hover:bg-accent/25">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-serif text-xl font-bold tracking-tight text-text-primary group-hover:text-accent transition-colors">
              Festivo
            </span>
          </Link>

          {/* Center: Primary Navigation Links (Desktop & Tablet) */}
          <nav
            ref={desktopNavRef}
            aria-label="Primary navigation"
            className="floating-nav-list hidden md:inline-flex"
          >
            {primaryLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={closeMenus}
                aria-current={item.current ? 'page' : undefined}
                className={`floating-nav-link ${focusStyle}`}
                data-active={item.current}
              >
                {item.label}
              </Link>
            ))}

            {/* More dropdown */}
            <div className="relative flex items-center">
              <button
                ref={moreButtonRef}
                type="button"
                onClick={() => toggleMenu('more', morePanelRef)}
                aria-expanded={openMenu === 'more'}
                aria-controls="header-more-menu"
                className={`floating-nav-link gap-1 ${focusStyle}`}
                data-active={active.fests || active.how}
              >
                More
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${openMenu === 'more' ? 'rotate-180 text-accent' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {openMenu === 'more' && (
                <div
                  ref={morePanelRef}
                  id="header-more-menu"
                  className="floating-popover absolute left-0 top-full mt-2 w-48 p-1.5"
                >
                  <Link
                    to="/fests"
                    onClick={closeMenus}
                    aria-current={active.fests ? 'page' : undefined}
                    className={`floating-menu-item ${focusStyle}`}
                  >
                    Explore Fests
                  </Link>
                  <a
                    href="/#how-it-works"
                    onClick={closeMenus}
                    aria-current={active.how ? 'page' : undefined}
                    className={`floating-menu-item ${focusStyle}`}
                  >
                    How It Works
                  </a>
                </div>
              )}
            </div>

            {/* Smooth animated sliding capsule indicator */}
            <span ref={activeCapsuleRef} className="floating-nav-capsule" aria-hidden="true" />
          </nav>

          {/* Right: Actions & Account (Desktop & Tablet) */}
          <div className="hidden items-center gap-1.5 md:flex lg:gap-2">
            {isSignedIn ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={closeMenus}
                  aria-current={active.dashboard ? 'page' : undefined}
                  className={`floating-nav-link text-xs ${focusStyle}`}
                  data-active={active.dashboard}
                >
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    ref={accountButtonRef}
                    type="button"
                    onClick={() => toggleMenu('account', accountPanelRef)}
                    aria-expanded={openMenu === 'account'}
                    aria-controls="header-account-menu"
                    className={`flex items-center gap-2 rounded-full border border-border-subtle/80 bg-surface/70 hover:border-accent/40 p-1 pl-1.5 pr-2.5 text-xs font-medium text-text-primary transition-all ${focusStyle}`}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-24 truncate">{displayName}</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform duration-200 ${openMenu === 'account' ? 'rotate-180 text-accent' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {openMenu === 'account' && (
                    <div
                      ref={accountPanelRef}
                      id="header-account-menu"
                      className="floating-popover absolute right-0 top-full mt-2 w-60 p-2"
                    >
                      <p className="truncate border-b border-border-subtle/80 px-3 py-2 text-xs text-text-secondary">
                        {displayName}
                      </p>
                      <Link to={dashboardPath} onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                        My Dashboard
                      </Link>
                      {isParticipant && (
                        <Link to="/my-registrations" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          My Registrations
                        </Link>
                      )}
                      {isParticipant && (
                        <Link to="/my-teams" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          My Teams
                        </Link>
                      )}
                      {isParticipant && (
                        <Link to="/my-schedule" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          My Schedule
                        </Link>
                      )}
                      {isParticipant && (
                        <Link to="/my-passes" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Digital Passes
                        </Link>
                      )}
                      {isParticipant && (
                        <Link to="/passport" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Club Passport
                        </Link>
                      )}
                      <Link to="/notifications" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                        Notifications
                      </Link>
                      <Link to="/help-desk" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                        Help Desk
                      </Link>
                      {isParticipant && (
                        <Link to="/event-matcher" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Event Matcher
                        </Link>
                      )}
                      {isSignedIn && (
                        <Link to="/assistant" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Ask Festivo
                        </Link>
                      )}
                      {auth.role === 'organizer' && (
                        <Link to="/analytics" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Analytics
                        </Link>
                      )}
                      {auth.role === 'organizer' && (
                        <Link to="/operations" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Fest Operations
                        </Link>
                      )}
                      {(auth.role === 'check_in_staff' || auth.role === 'organizer') && (
                        <Link to="/check-in" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Event Check-In
                        </Link>
                      )}
                      {isParticipant && !auth.isProfileComplete && (
                        <Link to="/complete-profile" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                          Complete Profile
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          void handleSignOut()
                        }}
                        className={`floating-menu-item w-full text-left text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 ${focusStyle}`}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMenus}
                  className={`floating-nav-link text-xs ${focusStyle}`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMenus}
                  className={`floating-join-btn ${focusStyle}`}
                >
                  Join Festivo
                </Link>
              </>
            )}
          </div>

          {/* Right: Mobile Controls (< 768px) */}
          <div className="flex items-center gap-2 md:hidden">
            {isSignedIn ? (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                {displayName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Link
                to="/login"
                onClick={closeMenus}
                className={`text-xs font-medium text-text-body hover:text-accent px-2 py-1 ${focusStyle}`}
              >
                Login
              </Link>
            )}

            <button
              ref={mobileButtonRef}
              type="button"
              onClick={() => toggleMenu('mobile', mobilePanelRef)}
              aria-label={openMenu === 'mobile' ? 'Close menu' : 'Open menu'}
              aria-expanded={openMenu === 'mobile'}
              aria-controls="header-mobile-menu"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle/80 bg-surface/70 text-text-primary hover:border-accent/40 transition-colors ${focusStyle}`}
            >
              {openMenu === 'mobile' ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Floating Mobile Dropdown Menu Panel */}
        <div
          ref={mobilePanelRef}
          id="header-mobile-menu"
          data-open={openMenu === 'mobile'}
          aria-hidden={openMenu !== 'mobile'}
          inert={openMenu !== 'mobile'}
          className="floating-mobile-panel pointer-events-auto p-3.5 md:hidden"
        >
          <nav aria-label="Mobile navigation" className="max-h-[calc(85vh-72px)] overflow-y-auto space-y-1">
            {[...primaryLinks, { label: 'Explore Fests', to: '/fests', current: active.fests }].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={closeMenus}
                aria-current={item.current ? 'page' : undefined}
                className={`floating-menu-item ${focusStyle}`}
                data-active={item.current}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="/#how-it-works"
              onClick={closeMenus}
              aria-current={active.how ? 'page' : undefined}
              className={`floating-menu-item ${focusStyle}`}
            >
              How It Works
            </a>

            <div className="my-2 border-t border-border-subtle/80" />

            {isSignedIn ? (
              <>
                <p className="truncate px-3 py-1.5 text-xs text-text-muted">{displayName}</p>
                <Link to={dashboardPath} onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                  Dashboard
                </Link>
                {isParticipant && (
                  <Link to="/my-registrations" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    My Registrations
                  </Link>
                )}
                {isParticipant && (
                  <Link to="/my-teams" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    My Teams
                  </Link>
                )}
                {isParticipant && (
                  <Link to="/my-schedule" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    My Schedule
                  </Link>
                )}
                {isParticipant && (
                  <Link to="/my-passes" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    Digital Passes
                  </Link>
                )}
                {isParticipant && (
                  <Link to="/passport" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    Club Passport
                  </Link>
                )}
                <Link to="/notifications" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                  Notifications
                </Link>
                <Link to="/help-desk" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                  Help Desk
                </Link>
                {isParticipant && (
                  <Link to="/event-matcher" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    Event Matcher
                  </Link>
                )}
                <Link to="/assistant" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                  Ask Festivo
                </Link>
                {auth.role === 'organizer' && (
                  <Link to="/analytics" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    Analytics
                  </Link>
                )}
                {auth.role === 'organizer' && (
                  <Link to="/operations" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    Fest Operations
                  </Link>
                )}
                {(auth.role === 'check_in_staff' || auth.role === 'organizer') && (
                  <Link to="/check-in" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    Event Check-In
                  </Link>
                )}
                {isParticipant && !auth.isProfileComplete && (
                  <Link to="/complete-profile" onClick={closeMenus} className={`floating-menu-item ${focusStyle}`}>
                    Complete Profile
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut()
                  }}
                  className={`floating-menu-item w-full text-left text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 ${focusStyle}`}
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link to="/login" onClick={closeMenus} className={`floating-menu-item text-center justify-center ${focusStyle}`}>
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMenus}
                  className={`floating-join-btn w-full text-center ${focusStyle}`}
                >
                  Join Festivo
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>

      {signOutError && (
        <div
          role="alert"
          className="pointer-events-auto mx-auto mt-2 max-w-md rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-center text-xs font-semibold text-red-300 shadow-lg"
        >
          {signOutError}
        </div>
      )}
    </header>
  )
}
