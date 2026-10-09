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
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const mobileButtonRef = useRef<HTMLButtonElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)
  const accountPanelRef = useRef<HTMLDivElement>(null)
  const morePanelRef = useRef<HTMLDivElement>(null)
  const desktopNavRef = useRef<HTMLElement>(null)
  const activeLineRef = useRef<HTMLSpanElement>(null)

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

  useLayoutEffect(() => {
    const nav = desktopNavRef.current
    const line = activeLineRef.current
    if (!nav || !line) return
    const update = () => {
      const selected = nav.querySelector<HTMLElement>('[data-active="true"]')
      if (!selected) {
        line.style.opacity = '0'
        return
      }
      const x = selected.getBoundingClientRect().left - nav.getBoundingClientRect().left + 16
      const width = Math.max(0, selected.offsetWidth - 32)
      line.style.transform = `translateX(${x}px) scaleX(${width / 100})`
      line.style.opacity = '1'
    }
    update()
    const frame = window.requestAnimationFrame(() => { line.dataset.ready = 'true' })
    const observer = new ResizeObserver(update)
    observer.observe(nav)
    return () => { window.cancelAnimationFrame(frame); observer.disconnect() }
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
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-border-subtle bg-page/95 backdrop-blur-sm">
      <div className="content-container flex h-[72px] items-center justify-between gap-5">
        <Link to="/" onClick={closeMenus} className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg ${focusStyle}`} aria-label="Festivo home">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface text-accent">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-xl font-bold tracking-[-0.03em] text-text-primary">Festivo</span>
        </Link>

        <nav ref={desktopNavRef} aria-label="Primary navigation" className="relative hidden h-full items-center justify-center gap-1 lg:flex">
          {primaryLinks.map((item) => (
            <Link key={item.label} to={item.to} onClick={closeMenus} aria-current={item.current ? 'page' : undefined} className={`header-nav-link ${focusStyle}`} data-active={item.current}>
              {item.label}
            </Link>
          ))}
          <div className="relative flex h-full items-center">
            <button ref={moreButtonRef} type="button" onClick={() => toggleMenu('more', morePanelRef)} aria-expanded={openMenu === 'more'} aria-controls="header-more-menu" className={`header-nav-link gap-1 ${focusStyle}`} data-active={active.fests || active.how}>
              More <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {openMenu === 'more' && (
              <div ref={morePanelRef} id="header-more-menu" className="header-popover absolute left-0 top-full mt-1 w-48 rounded-xl border border-border-subtle bg-surface p-1.5 shadow-xl">
                <Link to="/fests" onClick={closeMenus} aria-current={active.fests ? 'page' : undefined} className={`header-menu-item ${focusStyle}`}>Explore Fests</Link>
                <a href="/#how-it-works" onClick={closeMenus} aria-current={active.how ? 'page' : undefined} className={`header-menu-item ${focusStyle}`}>How It Works</a>
              </div>
            )}
          </div>
          <span ref={activeLineRef} className="header-active-line" aria-hidden="true" />
        </nav>

        <div className="hidden min-w-[218px] items-center justify-end gap-2 lg:flex">
          {isSignedIn ? (
            <>
              <Link to={dashboardPath} onClick={closeMenus} aria-current={active.dashboard ? 'page' : undefined} className={`header-action-link ${focusStyle}`}>Dashboard</Link>
              <div className="relative">
                <button ref={accountButtonRef} type="button" onClick={() => toggleMenu('account', accountPanelRef)} aria-expanded={openMenu === 'account'} aria-controls="header-account-menu" className={`header-account-button ${focusStyle}`}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
                  <span className="max-w-28 truncate">Account</span>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                {openMenu === 'account' && (
                  <div ref={accountPanelRef} id="header-account-menu" className="header-popover absolute right-0 top-full mt-2 w-60 rounded-xl border border-border-subtle bg-surface p-1.5 shadow-xl">
                    <p className="truncate border-b border-border-subtle px-3 py-2 text-xs text-text-secondary">{displayName}</p>
                    <Link to={dashboardPath} onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>My Dashboard</Link>
                    {isParticipant && <Link to="/my-registrations" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>My Registrations</Link>}
                    {isParticipant && <Link to="/my-teams" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>My Teams</Link>}
                    {isParticipant && <Link to="/my-schedule" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>My Schedule</Link>}
                    {isParticipant && <Link to="/my-passes" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Digital Passes</Link>}
                    {isParticipant && <Link to="/passport" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Club Passport</Link>}
                    <Link to="/notifications" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Notifications</Link>
                    <Link to="/help-desk" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Help Desk</Link>
                    {isParticipant && <Link to="/event-matcher" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Event Matcher</Link>}
                    {isSignedIn && <Link to="/assistant" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Ask Festivo</Link>}
                    {auth.role === 'organizer' && <Link to="/analytics" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Analytics</Link>}
                    {auth.role === 'organizer' && <Link to="/operations" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Fest Operations</Link>}
                    {(auth.role === 'check_in_staff' || auth.role === 'organizer') && <Link to="/check-in" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Event Check-In</Link>}
                    {isParticipant && !auth.isProfileComplete && <Link to="/complete-profile" onClick={closeMenus} className={`header-menu-item ${focusStyle}`}>Complete Profile</Link>}
                    <button type="button" onClick={() => { void handleSignOut() }} className={`header-menu-item w-full text-left ${focusStyle}`}>Sign out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenus} className={`header-action-link ${focusStyle}`}>Login</Link>
              <Link to="/signup" onClick={closeMenus} className={`header-join-button ${focusStyle}`}>Join Festivo</Link>
            </>
          )}
        </div>

        <button ref={mobileButtonRef} type="button" onClick={() => toggleMenu('mobile', mobilePanelRef)} aria-label={openMenu === 'mobile' ? 'Close menu' : 'Open menu'} aria-expanded={openMenu === 'mobile'} aria-controls="header-mobile-menu" className={`header-mobile-trigger inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 text-sm font-medium text-text-primary lg:hidden ${focusStyle}`}>
          {openMenu === 'mobile' ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          <span>Menu</span>
        </button>
      </div>

      <div ref={mobilePanelRef} id="header-mobile-menu" data-open={openMenu === 'mobile'} aria-hidden={openMenu !== 'mobile'} inert={openMenu !== 'mobile'} className="header-mobile-panel absolute inset-x-0 top-full border-t border-border-subtle bg-page shadow-xl lg:hidden">
          <nav aria-label="Mobile navigation" className="content-container max-h-[calc(100dvh-72px)] overflow-y-auto py-3">
            {[...primaryLinks, { label: 'Explore Fests', to: '/fests', current: active.fests }].map((item) => (
              <Link key={item.label} to={item.to} onClick={closeMenus} aria-current={item.current ? 'page' : undefined} className={`header-mobile-link ${focusStyle}`}>{item.label}</Link>
            ))}
            <a href="/#how-it-works" onClick={closeMenus} aria-current={active.how ? 'page' : undefined} className={`header-mobile-link ${focusStyle}`}>How It Works</a>
            <div className="my-2 border-t border-border-subtle" />
            {isSignedIn ? (
              <>
                <p className="truncate px-3 py-2 text-xs text-text-secondary">{displayName}</p>
                <Link to={dashboardPath} onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Dashboard</Link>
                {isParticipant && <Link to="/my-registrations" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>My Registrations</Link>}
                {isParticipant && <Link to="/my-teams" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>My Teams</Link>}
                {isParticipant && <Link to="/my-schedule" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>My Schedule</Link>}
                {isParticipant && <Link to="/my-passes" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Digital Passes</Link>}
                {isParticipant && <Link to="/passport" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Club Passport</Link>}
                <Link to="/notifications" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Notifications</Link>
                <Link to="/help-desk" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Help Desk</Link>
                {isParticipant && <Link to="/event-matcher" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Event Matcher</Link>}
                <Link to="/assistant" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Ask Festivo</Link>
                {auth.role === 'organizer' && <Link to="/analytics" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Analytics</Link>}
                {auth.role === 'organizer' && <Link to="/operations" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Fest Operations</Link>}
                {(auth.role === 'check_in_staff' || auth.role === 'organizer') && <Link to="/check-in" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Event Check-In</Link>}
                {isParticipant && !auth.isProfileComplete && <Link to="/complete-profile" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Complete Profile</Link>}
                <button type="button" onClick={() => { void handleSignOut() }} className={`header-mobile-link w-full text-left ${focusStyle}`}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenus} className={`header-mobile-link ${focusStyle}`}>Login</Link>
                <Link to="/signup" onClick={closeMenus} className={`header-join-button my-2 min-h-11 ${focusStyle}`}>Join Festivo</Link>
              </>
            )}
          </nav>
      </div>

      {signOutError && <div role="alert" className="border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-xs font-semibold text-red-300">{signOutError}</div>}
    </header>
  )
}
