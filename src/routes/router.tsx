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
import { MyRegistrationsPage, RegistrationDetailPage } from '../features/registrations/registration-pages'
import { EventTeamInvitationPage, EventTeamPage, MyTeamsPage } from '../features/teams/team-pages'
import { MySchedulePage } from '../features/teams/my-schedule-page'
import { DigitalPassesPage } from '../features/passes/digital-passes-page'
import { CheckInPage } from '../features/passes/check-in-page'
import { AnalyticsPage } from '../features/analytics/analytics-page'
import { EventMatcherPage } from '../features/matcher/matcher-page'
import { AssistantPage } from '../features/assistant/assistant-page'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'clubs', element: <ClubDirectoryPage /> },
      { path: 'clubs/:slug', element: <ClubDetailPage /> },
      { path: 'events', element: <EventDiscoveryPage /> },
      { path: 'fests', element: <FestDirectoryPage /> },
      { path: 'fests/:clubSlug/:festSlug', element: <FestDetailPage /> },
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
      { path: 'my-passes', element: <RequireRole allowedRoles={['participant']}><DigitalPassesPage /></RequireRole> },
      { path: 'event-matcher', element: <RequireRole allowedRoles={['participant']}><EventMatcherPage /></RequireRole> },
      { path: 'assistant', element: <RequireAuthentication><AssistantPage /></RequireAuthentication> },
      { path: 'analytics', element: <RequireRole allowedRoles={['organizer']}><AnalyticsPage /></RequireRole> },
      { path: 'organizer', element: <OrganizerDashboardPage /> },
      { path: 'organizer/:clubSlug', element: <OrganizerDashboardPage /> },
      { path: 'check-in', element: <RequireRole allowedRoles={['check_in_staff', 'organizer']}><CheckInPage /></RequireRole> },
      { path: 'unauthorized', element: <UnauthorizedState /> },
      { path: '*', element: <EmptyState title="Page not found" description="The page you requested does not exist or has moved." /> },
    ],
  },
])
