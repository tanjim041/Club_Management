# Supabase setup

Festivo uses Supabase for Auth, PostgreSQL, Storage, Realtime, Edge Functions,
and row-level security (RLS). The browser application is deliberately limited to
the project URL and publishable/anon key; it must never receive a `service_role`
key, database password, or an Edge Function secret.

## 1. Create and link a project

Create a Supabase project, then install and authenticate the Supabase CLI. From
the repository root, link the local configuration to the hosted project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

The project reference is the identifier in the project dashboard URL. The checked
in [config.toml](../supabase/config.toml) is for local development and should not
contain production secrets.

To work entirely locally instead, start the Supabase stack:

```bash
npx supabase start
```

Use `npx supabase status` to see the local API URL and anon key. Stop the local
stack with `npx supabase stop` when finished.

## 2. Configure browser environment values

Copy the template before starting Vite:

```powershell
Copy-Item .env.example .env.local
```

Set these values from **Project Settings -> API**:

```dotenv
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-or-anon-key>
```

For compatibility with existing local setups, Festivo also accepts the exact
names `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. It deliberately does not
expose the broader `SUPABASE_` prefix, so `SUPABASE_SECRET_KEY` remains
server-only and is never included in the Vite browser bundle. Keep any local
server-only credentials in an ignored file and never send them to the browser.

`VITE_` values are bundled into browser code and are public by design. Never put
any of the following in `VITE_*`, committed configuration, or client code:

- `SUPABASE_SERVICE_ROLE_KEY`
- Database passwords or connection strings
- JWT signing secrets
- Edge Function/API-provider secrets

Server-only values belong in the Supabase dashboard/CLI Edge Function secrets, for
example `npx supabase secrets set NAME=value`. Use a server/Edge Function with the
service-role key only for tightly scoped administrative tasks.

## 3. Apply the schema

The versioned schema and RLS policies live in:

```text
supabase/migrations/20261007100900_initial_festivo_schema.sql
supabase/migrations/20261007183059_add_event_subcategory.sql
supabase/migrations/20261007184148_fest_directory_and_club_profiles.sql
supabase/migrations/20261007200703_directory_validation.sql
```

For a linked hosted project, apply all unapplied migrations:

```bash
npx supabase db push
```

For local development, reset the local database and run every migration:

```bash
npx supabase db reset
```

The directory migration adds institute, club-content, fest-schedule, and
fest-announcement tables; event format/experience/operational fields; and the
`get_public_event_availability()` RPC. The last migration tightens public
availability and cross-club showcase validation. These migrations were applied
to the configured hosted project on 2026-10-07; run `db push` for any other
project. They do not delete or replace existing club, fest, or event records.

Do not make production-only edits in the dashboard SQL editor and then rely on
them as the source of truth. Add a new timestamped migration, review it, and apply
it with `db push`. The controlled initial organizer bootstrap below invokes the
versioned service-role RPC rather than bypassing the migration history.

## 4. Generate TypeScript database types

Regenerate `src/types/database.ts` whenever the schema changes. With the project
linked, run:

```bash
npx supabase gen types typescript --linked --schema public > src/types/database.ts
```

Or generate against a known hosted project explicitly:

```bash
npx supabase gen types typescript --project-id <your-project-ref> --schema public > src/types/database.ts
```

Commit the regenerated type file with its corresponding migration. This keeps the
typed client aligned with database constraints, enums, tables, and RPCs.

## 5. Configure authentication redirects

In **Authentication -> URL Configuration**, set:

- **Site URL**: `http://localhost:5173` for local development, or the deployed
  application origin in production.
- **Redirect URLs**: `http://localhost:5173/**` and the exact deployed callback
  pattern, such as `https://app.example.com/**`.

Confirmation links sent by the application use `/auth/callback`. Reserve the
same route for password-recovery links when that workflow is added. Add it under
every allowed origin, for example:

```text
http://localhost:5173/auth/callback
https://app.example.com/auth/callback
```

Keep email confirmation enabled in production. During local development, use the
Supabase mail catcher surfaced by `npx supabase status`, or explicitly change the
local-only setting in `supabase/config.toml`.

## 6. First organizer and staff bootstrap

Every new authenticated user receives a profile with participant-level access.
There is intentionally no client-side form, direct insert policy, or public RPC
that lets a user grant themselves `organizer` or `check_in_staff` membership.

Use this controlled sequence for the first organization:

1. Have the person create and confirm a normal Festivo account so their profile
   exists.
2. A project administrator performs the one-time organization bootstrap through
   a trusted server-side workflow using the initial migration's **service-role
   only** RPC:
   `bootstrap_organization(p_owner_id uuid, p_name text, p_slug text, p_description text default '')`.
3. The workflow creates the organization and its first `organizer` membership in
   one transaction. Database triggers create audit entries; the server workflow
   should also retain the external/admin approval record.
4. The user signs out and back in, or refreshes their session, so dashboard routing
   reads the new authorized membership.
5. An organization owner may grant or modify further `organizer` access; an
   organizer may grant or modify `check_in_staff` access. Check-in staff receive
   only operational access and never inherit organizer privileges.

Do not expose a service-role key to implement this flow. The bootstrap RPC is not
executable by `anon` or `authenticated` browser roles. Invoke it only from a
secured server or Edge Function that holds the service-role key and enforces an
external approval process. Do not loosen RLS or insert memberships from the
browser to work around bootstrap restrictions.

## RLS access model

The migrations enable RLS on all application tables and use membership
checks scoped by organization. At a high level:

`visitor` is an unauthenticated access state, not a row users can assign to
themselves. Every authenticated profile begins as a participant; organization-level
operational roles are represented only by controlled membership rows.

| Actor | Permitted access |
| --- | --- |
| Unauthenticated visitor | Read only public club profiles and published fests, events, and public club content. |
| Participant | Read/update their own profile and read their own registrations and attendance; read public data. Individual registration writes use narrowly granted transactional RPCs, never direct table writes. |
| Organizer | Manage only organizations where they hold an `organizer` membership, plus those organizations' fests and events. They can read participant profiles only when the participant has a registration in that organization. |
| Check-in staff | Read only operationally scoped events and registrations; they cannot read other participants' profiles/contact details or manage the organization. |

`registrations` are not public. `notifications` are visible only to their recipient
and that recipient can only change the read state. `audit_logs` are append-only
operational records, visible only to scoped organizers, and are not user-writable
from the browser.

All policies are a backstop, not a replacement for validation: UI route guards and
server/RPC checks must still validate the signed-in user and organization scope.

## Directory and club profiles

Public routes are `/clubs`, `/clubs/:clubSlug`, `/fests`,
`/fests/:clubSlug/:festSlug`, `/events`, and
`/fests/:clubSlug/:festSlug/events/:eventSlug`. The directory filters published
records and uses the availability RPC rather than inferring capacity from static
card data. Capacity is counted in people for individual events and in teams for
team events. The current API returns the database registration state, including
closed, full, waitlist, and operationally unavailable states.

Institute branding is optional and database-configurable through `institutes`
and `organizations.institute_id`. Existing organizations were not assigned to an
institute automatically. The default public interface uses generic Festivo
branding. Institute creation and reassignment require a trusted server-side
administrative workflow, not a client form.

The organizer dashboard allows an assigned organizer to edit their club's public
profile, segments, achievements, showcases, and gallery. Check-in staff do not
receive those write permissions. A first organizer must be provisioned through
the controlled bootstrap above. Team registration also uses transactional RPCs;
direct client table writes are not granted.

## Individual registration

Apply `20261008020449_individual_registration.sql`,
`20261008020705_registration_rpc_ambiguity_fix.sql`, and
`20261008021442_individual_availability_alignment.sql`, and
`20261008021714_backfill_registration_attendance.sql` in order. The public
`register_individual_event(event_id, accept_rules)` and
`cancel_individual_registration(registration_id, reason)` RPCs are granted only
to authenticated users. The database locks the event row before capacity or
waitlist decisions, validates profile completion and supported eligibility
criteria, rejects duplicate active entries and disallowed schedule overlaps,
and commits before the client displays a confirmation. Active statuses are
`confirmed` and `waitlisted`; cancellation preserves history as `cancelled`.

The registration deadline falls back to event start when neither the event nor
fest specifies one. An omitted opening date means registration is open until
that deadline. The optional `events.cancellation_closes_at` overrides the
default cancellation cutoff of event start and must not be later than start.
After a cancellation, eligible waitlisted entries are promoted by FIFO ticket
order, and the participant receives an in-app notification. Promotion stops
after the deadline; an authorized organizer may reopen by setting a future
registration deadline. Candidates with changed rules, unmet eligibility, or a
schedule conflict are skipped and remain waitlisted for organizer review.
Eligibility JSON supports `allowed_institutions`, `allowed_departments`,
`required_skills`, `required_interests`, and `minimum_experience_level`;
unknown criteria fail closed. Rules text is acknowledged and versioned by hash;
free-form rules cannot be automatically interpreted.

Legacy attendance is stored in `registration_attendance`, not in registration status.
The additive backfill copies existing verified check-ins with valid timestamps
from legacy metadata and leaves those original records unchanged.
It is readable by its participant and authorized event staff. New QR gate
check-ins are stored per person in `event_pass_attendance`, separate from
registration status and legacy attendance. Apply migrations
`20261008060000_event_passes_and_checkin.sql`,
`20261008060100_checkin_conflict_target_fix.sql`, and
`20261008060200_organizer_checkin_summary.sql` in order on existing projects.
The first migration backfills missing passes for existing confirmed entries.
Participant pass retrieval and staff check-in use scoped RPCs; the QR contains
only a 256-bit random token. The staff scanner needs HTTPS or localhost for
camera permissions, with registration-ID lookup as a fallback. Run
`node scripts/verify_event_passes.mjs` for isolated authenticated RPC checks;
the script cleans up only its own fixture users, club, fest, and events.

## Analytics and AI

Apply `20261008070000_analytics_and_matcher.sql`. `organizer_analytics` enforces
club-scoped organizer access and returns one consistent snapshot for cards,
charts, roster, and CSV. Date filters select events by UTC event-start date;
growth then groups registrations for those events by UTC creation date.
Confirmed entries and capacity usage count registration units (people for
individual events, teams for team events). Unique confirmed participants count
distinct people including submitted team-roster members. Attendance rate is
checked-in people-places divided by confirmed registered people-places; a
person attending two events occupies two places. Cancelled and revoked passes
do not add to the checked-in numerator. CSV fields that could execute as
spreadsheet formulas are prefixed with an apostrophe before quoting.

`my_event_match_facts` supplies backend eligibility and schedule-conflict
decisions to the Event Matcher. Scores and explanatory reasons are deterministic
and never grant authorization; registration RPCs recheck rules at submission.

Deploy the authenticated, read-only Edge Functions:

```bash
npx supabase functions deploy festivo-assistant --project-ref <project-ref>
npx supabase functions deploy organizer-copilot --project-ref <project-ref>
```

The functions use the caller's JWT and RLS-scoped Supabase client, never a
service-role client. Organizer Copilot recalculates metrics server-side and
passes only aggregate facts, never participant emails, to the optional AI
provider. Both functions remain useful without provider configuration.
For AI-generated explanations, set `AI_PROVIDER=openai_compatible`,
`AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY` as Supabase Edge Function secrets
(see `supabase/functions/.env.example`). Never use `VITE_` for these values.
AI answers are read-only: they cannot register participants or modify data.
The configured hosted project has the Gemini-compatible endpoint and
`gemini-3.1-flash-lite` model selected, but **no provider key**; AI responses
therefore use the tested fallback until `AI_API_KEY` is added securely.

The rollback-only regression script is
[`supabase/tests/individual_registration.sql`](../supabase/tests/individual_registration.sql).
Run it in a disposable or staging database with at least four existing
profiles; it temporarily updates those profiles inside the transaction and
rolls back every fixture. Do not run it from a public client.

## Teams and schedule conflicts

Apply `20261008053033_team_registration_and_conflicts.sql`,
`20261008053118_team_member_history_access.sql`, and
`20261008053821_organizer_team_roster_read.sql`, and
`20261008054018_viable_schedule_alternatives.sql`, and
`20261008054102_verified_invitation_email.sql`, and
`20261008054336_strict_schedule_alternatives.sql` after the individual
registration migrations. Captains create draft teams, invite members by email,
and submit only after the event's minimum number of members have accepted.
Drafts do not consume capacity. The invitation RPC returns a 256-bit token
once; only its SHA-256 digest is stored. The invitation link uses a URL fragment
so the token is not sent in the HTTP request path. Captains must share the link
privately; Festivo does not send invitation emails yet. Acceptance checks the
signed-in account's verified Auth email and the invitation's bound user ID when known.
Invitations can expire, be declined, or be revoked. Submitted rosters are
snapshotted and cannot be edited through browser RPCs. Legacy demo team entries
remain in place but are not automatically converted into the new team model.
A club-scoped organizer RPC reads submitted roster snapshots; browser clients
cannot read invitation token hashes or write rosters directly.

For overlapping events, the backend uses `start_a < end_b AND start_b < end_a`;
back-to-back events are allowed. If either event has
`blocks_schedule_conflicts = true`, registration is blocked. If both allow
overlap, each affected participant must explicitly acknowledge the current
conflict set. Team submission checks every accepted member; changed conflicts
invalidate old acknowledgements. Waitlist promotion rechecks eligibility,
rules, roster completeness, and schedule conflicts atomically, skipping teams
that no longer qualify. Suggested alternatives are public, currently
registerable events in the same fest with no confirmed schedule conflict for
the affected people. `My Schedule` uses the confirmed-schedule RPC and exports
a UTC `.ics` calendar.

The rollback-only test
[`supabase/tests/team_registration_and_conflicts.sql`](../supabase/tests/team_registration_and_conflicts.sql)
covers incomplete drafts, account binding, duplicate members, capacity,
revoke/expiry, blocking and acknowledged conflicts, back-to-back events,
stale-acknowledgement promotion, and authenticated RLS access. It requires at
least four email-verified Auth users with profiles and should run only in a staging or
disposable environment; fixtures are rolled back.

## Verify the installation

After migration and type generation, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Then test sign-up, confirmation redirect, sign-in, participant profile completion,
and an organizer account provisioned through the controlled bootstrap. Confirm that
an ordinary participant cannot create membership rows or access organizer routes.

## 7. Repeatable Demo Data Seed Script

A version-controlled, idempotent seed script is provided at [`scripts/seed_demo_data.mjs`](../scripts/seed_demo_data.mjs)
to populate realistic demo data directly into the Supabase database. Running it repeatedly
will not duplicate records or overwrite real data.

### Seed Execution Command

Execute the script from the repository root using Node.js:

```powershell
node scripts/seed_demo_data.mjs
```

### Required Configuration

The script requires server-side administrative access via environment variables in `.env` or `.env.local`:

```dotenv
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=<service-role-or-secret-key>
```

> [!CAUTION]
> The secret service-role key is required **only** for this server-side script to provision Auth
> users with confirmed emails and seed demo profiles. Never expose `SUPABASE_SECRET_KEY` in frontend code
> or commit it to version control.

### Idempotency & Protection of Real Records

- **Explicit Demo Labeling:** All seeded clubs, fests, events, and test accounts are labeled with `[Demo]`.
- **Deterministic UUIDs:** All entities use deterministic UUIDs generated with `uuidv5` based on fixed namespaces.
- **Conflict Handling:** All inserts use PostgreSQL `upsert(..., { onConflict: 'id' })` to safely update without duplication.
- **Protection of Existing Real Records:** Real organizations (e.g. `DRMC IT CLUB` with UUID `0ac157be-d13e-4f1d-96e0-ec377995c4b9`) and their real carnival records are completely excluded from the seed process and are never overwritten or altered.

### Demo Accounts & Cross-Club Scoping

All demo accounts are created via Supabase Auth server-side Admin API (`email_confirm: true`).
Password for all demo accounts: **`Password123!`**

| Account | Email | Password | Role & Authorized Clubs |
| --- | --- | --- | --- |
| **Demo Participant** | `demo.participant@festivo.org` | `Password123!` | Participant across multiple clubs (Individual, Team, Waitlisted, Cancelled, Gate Checked-In) |
| **Tech Organizer** | `organizer.tech@festivo.org` | `Password123!` | Scoped organizer: **Apex Technology Society [Demo]** only |
| **Photo Organizer** | `organizer.photo@festivo.org` | `Password123!` | Scoped organizer: **Lumina Photography & Media Club [Demo]** only |
| **Business & Social** | `organizer.business@festivo.org` | `Password123!` | Dual-scoped organizer: **Nexus Business Guild** & **Beacon Social Service** (tests club switcher) |
| **Science Organizer**| `organizer.science@festivo.org`| `Password123!` | Scoped organizer: **Vertex Science Society [Demo]** only |
| **Platform Admin** | `admin@festivo.org` | `Password123!` | Superuser with administrative access |
| **Team Roster Members** | `participant1@festivo.org` – `participant5@festivo.org` | `Password123!` | Team roster participants |

### 5 Seeded Clubs under Horizon Institute of Technology

1. **Apex Technology Society [Demo]** (`/clubs/apex-technology-society`)
   - Upcoming Fest: *Apex InnovateFest 2026 [Demo]* (Nov 2026)
   - Events: Programming Contest, Web Development Challenge (Team), Robotics Showcase
   - Past Fest: *Apex TechExpo 2025 [Demo]* with past competition showcases
   - 2 Achievements & Gallery records
2. **Lumina Photography & Media Club [Demo]** (`/clubs/lumina-photography-club`)
   - Upcoming Fest: *Lumina Visual Arts Gala 2026 [Demo]* (Nov 2026)
   - Events: Annual Photo Exhibition, Campus Photo Walk, RAW Color Grading & Editing Workshop
   - Past Fest: *Lumina Retrospective 2025 [Demo]* with showcases
   - 2 Achievements & Gallery records
3. **Nexus Business & Career Guild [Demo]** (`/clubs/nexus-business-guild`)
   - Upcoming Fest: *Nexus Leadership Summit 2026 [Demo]* (Nov 2026)
   - Events: Business Case Competition (Team), Venture Pitch Challenge, Corporate Career Readiness Workshop
   - Past Fest: *Nexus Business Expo 2025 [Demo]* with showcases
   - 2 Achievements & Gallery records
4. **Beacon Social Service League [Demo]** (`/clubs/beacon-social-service`)
   - Upcoming Fest: *Beacon Community Impact Fest 2026 [Demo]* (Nov 2026)
   - Events: Volunteer Orientation, Community Service Day, Grassroots Fundraising Workshop
   - Past Fest: *Beacon Outreach Gala 2025 [Demo]* with showcases
   - 2 Achievements & Gallery records
5. **Vertex Science Society [Demo]** (`/clubs/vertex-science-society`)
   - Upcoming Fest: *Vertex Discovery Conclave 2026 [Demo]* (Nov 2026)
   - Events: Science Olympiad, Research Poster Exhibition (Team), Science Quiz Challenge
   - Past Fest: *Vertex Frontiers 2025 [Demo]* with showcases
   - 2 Achievements & Gallery records

### Demonstration States Populated

| State | Event Example | Characteristics |
| --- | --- | --- |
| **Open Registration** | *Horizon Collegiate Programming Contest* | Active registration window, capacity available. |
| **Full Event** | *Collegiate Robotics Autonomous Challenge* | Capacity full (5/5 teams registered), waitlist disabled. |
| **Waitlisted Event** | *Full-Stack Web Systems Challenge* & *Venture Pitch Challenge* | Capacity reached, waitlist queue active (`waitlist_position = 1, 2`). |
| **Registration Closed** | *Campus Nature & Architectural Photo Walk* | Registration window ended before current evaluation time. |
| **Completed Event** | *National Collegiate Hackathon 2025* | Scheduled in past (2025), operational status completed. |
| **Overlapping Schedules** | *Web Systems Challenge* & *Robotics Showcase* | Concurrent schedules on the same afternoon to test conflict detection. |

### Derived Registrations & Attendance Roster

Registrations are populated with:
- **Individual & Team Entries:** Team entries include registered team rosters (e.g. `CyberPulse AI`, `Nexus Strategy Group`).
- **Statuses:** `confirmed`, `waitlisted` (with positive `waitlist_position`), and `cancelled` (with `cancelled_at`).
- **Gate Attendance:** Verified attendees have `metadata.attendance_status = 'verified'` and `checked_in_at` timestamps.
- **Dynamic Derivation:** All dashboard metrics and event availability are derived dynamically from records via Supabase queries and the `get_public_event_availability()` RPC; no hardcoded counters are used.

### Verification Results

- **Browser Verification:** Completed and recorded using the automated browser agent.
  - Participant view verified at `/dashboard` with dynamic statuses, team name, and Gate Pass modal.
  - Organizer view verified at `/organizer/apex-technology-society` with 4 derived metrics (12 total, 11 confirmed, 1 waitlisted, 2 gate verified) and live attendee roster.
  - Cross-club authorization boundary verified: navigating to `/organizer/lumina-photography-club` as `organizer.tech` returned `Club Access Denied`.
  - Public directory verified at `/clubs` with all 5 clubs and their full profiles.
- **Blocked Verification:** None. All seeded records load through normal Supabase queries and respect Row Level Security (RLS).
## Engagement and operations

Apply migrations `20261008080000_engagement_operations.sql`,
`20261008081000_engagement_hardening.sql`, and
`20261008082000_announcement_public_read_fix.sql`, and
`20261008083000_public_announcement_notifications.sql`, and
`20261008084000_help_desk_staff_directory.sql` in order. They add
club-scoped operational announcements, private recipient snapshots and
notifications, help-desk requests, a private passport reward ledger, and a
post-fest report RPC. Existing fest announcements and schedule records remain
intact. The migrations add public Live Fest tables to the `supabase_realtime`
publication when it exists. Live Mode also refetches every 30 seconds and
displays its last successful update.

`publish_operational_announcement` requires an assigned organizer. Public
announcements are visible only under published public scopes; registered-only
announcements are delivered to the active confirmed/waitlisted roster at
publish time, including snapshotted team members. Notification recipients may
mark only their own read state. Participants see only their own help-desk
requests and passport; assigned staff can see their assigned help request;
organizers see only their club queue. Direct browser writes to operational
tables are revoked in favor of checked RPCs. Passport XP is awarded once per
verified check-in, workshop completion, or achievement source.

`post_fest_report` calls `organizer_analytics` and appends scoped help-desk
outcomes, so dashboard and report metric definitions stay identical. The
`organizer-copilot` Edge Function accepts `mode: post_fest_report` for an
optional aggregate-only summary. If AI credentials are absent or the provider
fails, it returns a calculated summary without hiding the report. Redeploy
that function after updating it.

Run `node scripts/verify_engagement.mjs` with server-only Supabase test
credentials to verify RLS, read status, idempotent rewards, report parity,
and summary fallback. It creates and removes only a uniquely named fixture
club and test accounts. Never put the secret key or management access token
in a `VITE_` variable.
