export function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Discover.',
      description:
        'Browse campus student organizations and competitions with transparent schedules, category tracks, and event guidelines.',
    },
    {
      num: '02',
      title: 'Register.',
      description:
        'Enroll in individual or team tracks with instant validation, profile synchronization, and clear capacity limits.',
    },
    {
      num: '03',
      title: 'Participate.',
      description:
        'Access your chronological event timeline, present on contest stages, and verify digital credentials at venue check-in.',
    },
  ]

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="space-y-10 scroll-mt-24 pt-4"
    >
      {/* Editorial Section Header */}
      <div className="border-b border-[var(--color-border-subtle)] pb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Workflow
        </span>
        <h2
          id="how-it-works-heading"
          className="font-heading mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-3xl lg:text-4xl"
        >
          Simple, structured participation.
        </h2>
      </div>

      {/* 3-Column Compact Numbered Layout with Thin Separators */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
        {steps.map((item, idx) => (
          <div
            key={item.num}
            className={`flex flex-col justify-between pt-2 ${
              idx > 0 ? 'md:border-l md:border-[var(--color-border-subtle)] md:pl-10' : ''
            }`}
          >
            <div>
              <span className="font-heading text-4xl sm:text-5xl font-light text-[var(--color-text-muted)]/30 select-none block mb-3">
                {item.num}
              </span>

              <h3 className="font-heading text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {item.num} â€” {item.title}
              </h3>

              <p className="mt-3 text-xs leading-[1.6] text-[var(--color-text-body)] sm:text-sm">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
