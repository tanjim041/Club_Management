import { CheckCircle2, FileText, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PrivacyPolicyPage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="max-w-3xl space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3.5 py-1 text-xs font-medium text-[var(--color-accent)]">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Platform Privacy</span>
          </div>
          <h1 className="font-heading mt-4 text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Festivo Campus Club & Event Management Platform
          </p>
        </div>

        <div className="space-y-6 text-sm leading-[1.6] text-[var(--color-text-body)]">
          <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-3">
            <h2 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">1. Participant Data Privacy</h2>
            <p>
              Festivo respects the privacy of students, participants, and event organizers. We collect
              only the minimum necessary contact and institutional information required to facilitate
              competition registration, team management, and event check-in.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-3">
            <h2 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">2. Access Controls &amp; Row-Level Security</h2>
            <p>
              All records stored within Festivo are guarded by PostgreSQL Row-Level Security (RLS).
              Participants have access solely to their own profiles and registrations. Check-in staff
              cannot view extraneous personal information.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-3">
            <h2 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">3. Campus Inquiries</h2>
            <p>
              For questions regarding specific event rules and eligibility, participants should refer
              to the hosting student club organizers listed on the public club profiles.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[var(--color-border-subtle)]">
          <Link to="/" className="text-xs font-semibold text-[var(--color-accent)] hover:underline">
            &larr; Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

export function TermsPage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="max-w-3xl space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3.5 py-1 text-xs font-medium text-[var(--color-accent)]">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Terms of Service</span>
          </div>
          <h1 className="font-heading mt-4 text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Festivo Campus Club & Event Management Platform
          </p>
        </div>

        <div className="space-y-6 text-sm leading-[1.6] text-[var(--color-text-body)]">
          <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-3">
            <h2 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">1. Platform Nature</h2>
            <p>
              Festivo is a student club and fest management platform designed to help campus participants
              discover events and coordinate schedules. Festivo does not claim official endorsement unless
              explicitly authorized by the respective organizing club.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-3">
            <h2 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">2. Event Participation</h2>
            <p>
              Participation guidelines, dates, and judging decisions for all events remain under the
              jurisdiction of the hosting club's organizing committee.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[var(--color-border-subtle)]">
          <Link to="/" className="text-xs font-semibold text-[var(--color-accent)] hover:underline">
            &larr; Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

export function CodeOfConductPage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="max-w-3xl space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3.5 py-1 text-xs font-medium text-[var(--color-accent)]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Community Standards</span>
          </div>
          <h1 className="font-heading mt-4 text-3xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-4xl">
            Code of Conduct
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Standards for respectful participation across all Festivo campus activities
          </p>
        </div>

        <div className="space-y-6 text-sm leading-[1.6] text-[var(--color-text-body)]">
          <section className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 space-y-3">
            <h2 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">Respect &amp; Fair Play</h2>
            <p>
              All participants, spectators, and organizers are expected to treat peers with mutual
              respect, integrity, and fair play in every competition, workshop, and exhibition.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[var(--color-border-subtle)]">
          <Link to="/" className="text-xs font-semibold text-[var(--color-accent)] hover:underline">
            &larr; Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
