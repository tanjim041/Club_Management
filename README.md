# Festivo

Festivo is a Student Club and Fest Management Platform built around smart club operations. It includes public club and fest discovery, role-aware dashboards, and Supabase-backed club profile management.

Confirmed participants can open `/my-passes` for per-person QR event passes. Assigned gate staff use `/check-in` for camera scanning or exact registration-ID lookup. Check-in is committed by a staff-scoped Supabase RPC; the UI never treats an unverified scan as successful. Camera access requires HTTPS or localhost.

## Stack

- React, Vite, TypeScript (strict)
- Tailwind CSS and shadcn-compatible UI foundations
- React Router and TanStack Query
- React Hook Form and Zod
- Supabase Auth, PostgreSQL, Storage, Realtime, Edge Functions, and RLS

## Local development

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key. Do not place service-role keys in browser environment files.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

## Supabase

The application schema, RLS policies, role-bootstrap workflow, authentication
redirect setup, and type-generation commands are documented in
[docs/SUPABASE.md](docs/SUPABASE.md).

In short, link a Supabase project and apply the checked-in migrations:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` belong in browser
environment variables. Keep service-role credentials and other secrets server-side.

## Commands

```bash
npm run lint
npm run typecheck
npm run build
```

## Project layout

- `src/components` — reusable UI, layout, and interface states
- `src/features` — feature modules as they are implemented
- `src/routes` — application routes
- `src/hooks` — reusable hooks
- `src/lib` — shared utilities
- `src/supabase` — typed Supabase client and data access
- `src/types` — shared and generated database types

## Current status

The public fest directory, fest and event detail pages, and public club profiles
read published records from Supabase. Fest and event availability comes from a
database function that counts confirmed registration units. Authorized organizers
can edit their own club profile, segments, achievements, showcases, and gallery;
RLS and database validation enforce club scope. Existing data is retained by
additive migrations.

Individual-event registration and cancellation now use authenticated,
transactional Supabase RPCs. The participant workspace includes My Registrations,
registration details, current waitlist position, cancellation cutoff, and
promotion notifications. Team captains can create drafts, share email-bound
expiring invitations, and submit an accepted roster for a confirmed place or
waitlist. Members can accept or decline, and schedule conflicts are checked for
everyone before submission and promotion. My Schedule lists confirmed entries
and exports an `.ics` calendar. Attendance is stored separately from
registration status. QR pass check-in is available to assigned gate staff;
payment flows are not enabled.
See [Supabase setup](docs/SUPABASE.md) for deployment and security details.

## License

MIT. See [LICENSE](LICENSE).
