import { lazy, Suspense, type ReactNode } from 'react'
import { LoadingState } from '../components/states/page-states'

export const DigitalPassesPage = lazy(() => import('../features/passes/digital-passes-page').then((module) => ({ default: module.DigitalPassesPage })))
export const CheckInPage = lazy(() => import('../features/passes/check-in-page').then((module) => ({ default: module.CheckInPage })))
export const AnalyticsPage = lazy(() => import('../features/analytics/analytics-page').then((module) => ({ default: module.AnalyticsPage })))
export const EventMatcherPage = lazy(() => import('../features/matcher/matcher-page').then((module) => ({ default: module.EventMatcherPage })))
export const AssistantPage = lazy(() => import('../features/assistant/assistant-page').then((module) => ({ default: module.AssistantPage })))
export const LiveFestPage = lazy(() => import('../features/engagement/live-fest-page').then((module) => ({ default: module.LiveFestPage })))
export const NotificationsPage = lazy(() => import('../features/engagement/notifications-page').then((module) => ({ default: module.NotificationsPage })))
export const PassportPage = lazy(() => import('../features/engagement/passport-page').then((module) => ({ default: module.PassportPage })))
export const HelpDeskPage = lazy(() => import('../features/engagement/help-desk-page').then((module) => ({ default: module.HelpDeskPage })))
export const OrganizerOperationsPage = lazy(() => import('../features/engagement/organizer-operations-page').then((module) => ({ default: module.OrganizerOperationsPage })))

export function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState label="Loading workspace..." />}>{children}</Suspense>
}
