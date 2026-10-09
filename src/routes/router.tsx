import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/app-shell'
import { EmptyState, UnauthorizedState } from '../components/states/page-states'
import { LandingPage } from '../features/landing'
import { FestDirectoryPage } from '../features/fests/fest-directory-page'
import { FestDetailPage } from '../features/fests/fest-detail-page'
import { ClubDirectoryPage, ClubDetailPage } from '../features/clubs'
import { EventDiscoveryPage } from '../features/events/event-discovery-page'
import { EventDetailPage } from '../features/events/event-detail-page'
import { PrivacyPolicyPage, TermsPage, CodeOfConductPage } from '../features/legal/legal-pages'
import {
  AuthCallbackPage,
  LoginPage,
  OrganizerDashboardPage,
  ParticipantDashboardPage,
  ProfileCompletionPage,
  RequireAuthentication,
  RequireRole,
  SignUpPage,
} from '../features/auth'
import { DashboardRedirect } from './dashboard-redirect'
import { RouteErrorPage } from './route-error-page'
import { MyRegistrationsPage, RegistrationDetailPage } from '../features/registrations/registration-pages'
import { EventTeamInvitationPage, EventTeamPage, MyTeamsPage } from '../features/teams/team-pages'
import { MySchedulePage } from '../features/teams/my-schedule-page'
import { AnalyticsPage, AssistantPage, CheckInPage, DigitalPassesPage, EventMatcherPage, HelpDeskPage, LazyPage, LiveFestPage, NotificationsPage, OrganizerOperationsPage, PassportPage } from './lazy-pages'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'clubs', element: <ClubDirectoryPage /> },
      { path: 'clubs/:slug', element: <ClubDetailPage /> },
      { path: 'events', element: <EventDiscoveryPage /> },
      { path: 'fests', element: <FestDirectoryPage /> },
      { path: 'fests/:clubSlug/:festSlug', element: <FestDetailPage /> },
      { path: 'live/:clubSlug/:festSlug', element: <LazyPage><LiveFestPage /></LazyPage> },
      { path: 'fests/:clubSlug/:festSlug/events/:eventSlug', element: <EventDetailPage /> },
      { path: 'privacy', element: <PrivacyPolicyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'code-of-conduct', element: <CodeOfConductPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignUpPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: 'complete-profile', element: <ProfileCompletionPage /> },
      { path: 'dashboard', element: <RequireAuthentication><DashboardRedirect /></RequireAuthentication> },
      { path: 'participant', element: <ParticipantDashboardPage /> },
      { path: 'my-registrations', element: <RequireRole allowedRoles={['participant']}><MyRegistrationsPage /></RequireRole> },
      { path: 'my-registrations/:registrationId', element: <RequireRole allowedRoles={['participant']}><RegistrationDetailPage /></RequireRole> },
      { path: 'my-teams', element: <RequireRole allowedRoles={['participant']}><MyTeamsPage /></RequireRole> },
      { path: 'teams/:teamId', element: <RequireRole allowedRoles={['participant']}><EventTeamPage /></RequireRole> },
      { path: 'team-invite', element: <EventTeamInvitationPage /> },
      { path: 'my-schedule', element: <RequireRole allowedRoles={['participant']}><MySchedulePage /></RequireRole> },
      { path: 'my-passes', element: <RequireRole allowedRoles={['participant']}><LazyPage><DigitalPassesPage /></LazyPage></RequireRole> },
      { path: 'event-matcher', element: <RequireRole allowedRoles={['participant']}><LazyPage><EventMatcherPage /></LazyPage></RequireRole> },
      { path: 'assistant', element: <LazyPage><AssistantPage /></LazyPage> },
      { path: 'ask-festivo', element: <LazyPage><AssistantPage /></LazyPage> },
      { path: 'ask', element: <LazyPage><AssistantPage /></LazyPage> },
      { path: 'notifications', element: <RequireAuthentication><LazyPage><NotificationsPage /></LazyPage></RequireAuthentication> },
      { path: 'help-desk', element: <RequireAuthentication><LazyPage><HelpDeskPage /></LazyPage></RequireAuthentication> },
      { path: 'passport', element: <RequireRole allowedRoles={['participant']}><LazyPage><PassportPage /></LazyPage></RequireRole> },
      { path: 'operations', element: <RequireRole allowedRoles={['organizer']}><LazyPage><OrganizerOperationsPage /></LazyPage></RequireRole> },
      { path: 'analytics', element: <RequireRole allowedRoles={['organizer']}><LazyPage><AnalyticsPage /></LazyPage></RequireRole> },
      { path: 'organizer', element: <OrganizerDashboardPage /> },
      { path: 'organizer/:clubSlug', element: <OrganizerDashboardPage /> },
      { path: 'check-in', element: <RequireRole allowedRoles={['check_in_staff', 'organizer']}><LazyPage><CheckInPage /></LazyPage></RequireRole> },
      { path: 'unauthorized', element: <UnauthorizedState /> },
      { path: '*', element: <EmptyState title="Page not found" description="The page you requested does not exist or has moved." /> },
    ],
  },
])
