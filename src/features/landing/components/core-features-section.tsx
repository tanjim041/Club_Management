import { CalendarClock, CheckCheck, Compass, QrCode, ShieldCheck, Users } from 'lucide-react'

export function CoreFeaturesSection() {
  const features = [
    {
      icon: CalendarClock,
      title: 'Multi-Track Schedule Management',
      description:
        'Coordinate parallel hackathon stages, robotic arenas, and workshop rooms with minute-by-minute timeline precision.',
      accent: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/10',
    },
    {
      icon: CheckCheck,
      title: 'Clash-Free Conflict Detection',
      description:
        'Smart scheduling algorithms automatically detect and prevent overlapping event registrations so participants never miss a round.',
      accent: 'border-violet-500/20 text-violet-400 bg-violet-500/10',
    },
    {
      icon: QrCode,
      title: 'QR Check-In',
      description:
        'Equip volunteers and staff with instant digital scanners. Verify badges and grant venue entry without gate congestion.',
      accent: 'border-sky-500/20 text-sky-400 bg-sky-500/10',
    },
    {
      icon: Users,
      title: 'Team & Solo Registration Engine',
      description:
        'Seamlessly enforce team size constraints, manage rosters, send invitations, and maintain automated waitlists.',
      accent: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/10',
    },
    {
      icon: Compass,
      title: 'Real-Time Announcements',
      description:
        'Keep everyone in sync with instant broadcast alerts for venue changes, judge callouts, and schedule revisions.',
      accent: 'border-violet-500/20 text-violet-400 bg-violet-500/10',
    },
    {
      icon: ShieldCheck,
      title: 'Role-Scoped Access Control',
      description:
        'Battle-tested database security ensures distinct views and permissions for participants, organizers, and operational staff.',
      accent: 'border-sky-500/20 text-sky-400 bg-sky-500/10',
    },
  ]

  return (
    <section aria-labelledby="core-features-heading" className="mt-28">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
          <span>Engineered for Campus Societies</span>
        </div>
        <h2
          id="core-features-heading"
          className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Everything Required to Run Flawless Fests
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base sm:leading-7">
          Festivo removes chaotic spreadsheets and fragmented group chats. We provide a single,
          robust foundation designed specifically for student clubs and event leads.
        </p>
      </div>

      {/* 6 Feature Cards Grid */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-indigo-950/20"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border ${feature.accent}`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white transition-colors group-hover:text-indigo-200">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
