# Festivo UI Design System

## 1. Overview & Brand Identity

Festivo is a modern campus club and event management platform. The design system is rooted in a sleek, high-contrast **Charcoal and Lime** aesthetic engineered for clarity, focus, and modern performance across all devices.

---

## 2. Color Palette & Design Tokens

### Core Neutral Surfaces
| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Page Background** | `#0B0F10` | Base backdrop for full-bleed viewport |
| **Surface** | `#151B1E` | Card containers, primary sections, dialog modals |
| **Raised Surface** | `#1D252A` | Elevated sub-cards, input controls, table headers |
| **Borders** | `#303A40` | Subtle structural division lines and card borders |

### Typography & Neutrals
| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary Text** | `#F5F7F8` | Headings, active nav links, primary copy |
| **Secondary Text** | `#ADB8BF` | Subtitles, metadata, timestamps, placeholders |

### Accent Tokens
| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary Accent** | `#C5F82A` | Primary calls to action, active tab highlights, badges |
| **Accent Text** | `#111707` | Text foreground when placed atop `#C5F82A` surfaces |

### Semantic State Colors
All states must convey meaning through iconography, explicit labels, and accessible color:
| State | Hex Code | Background Tint |
| :--- | :--- | :--- |
| **Warning** | `#F59E0B` | `bg-amber-500/10` with `border-amber-500/30` |
| **Error / Critical** | `#EF4444` | `bg-rose-500/10` with `border-rose-500/30` |
| **Information** | `#38BDF8` | `bg-sky-500/10` with `border-sky-500/30` |
| **Success** | `#10B981` | `bg-emerald-500/10` with `border-emerald-500/30` |

---

## 3. Typography Hierarchy

- **Font Family**: `Plus Jakarta Sans`, `Inter`, `sans-serif`
- **Headings**:
  - `H1` (Hero): `3rem` to `3.75rem` (48px–60px), font weight `800` (extrabold), tracking `-0.025em`.
  - `H2` (Section Titles): `1.875rem` to `2.25rem` (30px–36px), font weight `800`.
  - `H3` (Card Titles): `1.125rem` to `1.25rem` (18px–20px), font weight `700`.
- **Body**: Base size `1rem` (16px) with `leading-relaxed` (1.625) for readable prose.
- **Microcopy**: `0.75rem` to `0.875rem` (12px–14px) with `font-medium` or `font-semibold`.

---

## 4. Components & Interactive Patterns

### Buttons (`src/components/ui/button.tsx`)
- **Primary**: `bg-[#C5F82A] text-[#111707] font-bold hover:bg-[#d5ff40]`
- **Secondary**: `border border-[#303A40] bg-[#1D252A] text-[#F5F7F8] hover:bg-[#253037]`
- **Ghost**: `text-[#ADB8BF] hover:text-[#F5F7F8] hover:bg-[#1D252A]`
- **Focus Rings**: `focus-visible:ring-2 focus-visible:ring-[#C5F82A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F10]`
- **Corner Radii**: Standard `rounded-xl` (12px). Restrained, avoiding pill buttons except for small status chips.

### Cards & Surfaces
- Default card background: `#151B1E` with `border border-[#303A40]`.
- Subtle elevation on hover: `hover:border-[#C5F82A]` with `-translate-y-1` and shadow expansion.
- Skeletons: Pulse animation on `#1D252A` surfaces.

### Modals & Dialogs
- Backdrop: `#0B0F10/85` with `backdrop-blur-sm`.
- Container: Centered, max-w-2xl, background `#151B1E` with `#303A40` border.
- Escape key listener, body scroll lock, accessible close button.

---

## 5. Animation & Motion Standards

All animations adhere to the following timing windows and respect `prefers-reduced-motion`:
- **Button Feedback**: `120ms`–`180ms` (`transition-all duration-150 active:scale-[0.98]`).
- **Menus & Tab Transitions**: `180ms`–`250ms`.
- **Section Entrances**: `300ms`–`450ms` using `festivoFadeInUp` (opacity + 16px translateY).
- **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, all transitions drop to `0.01ms` and scroll behavior defaults to `auto`.

---

## 6. Route & Navigation Architecture

### Public Routes
- `/`: Landing page with Hero, Club Discovery, Upcoming Events, Achievements, Past Highlights, How It Works, Final CTA, and Footer.
- `/clubs`: Searchable club directory with category filters.
- `/clubs/:slug`: Dedicated club profiles with banner, logo, overview, segments, hosted events, achievements, and gallery.
- `/events`: Full event catalog with search, category filtering, format filter, and modal details.
- `/fests`: Comprehensive festival catalog with primary fest banner and category breakdowns.
- `/privacy`, `/terms`, `/code-of-conduct`: Informational and legal policies.

### Authenticated Routes
- `/login`: Clean credential sign-in with password toggle.
- `/signup`: Participant registration.
- `/complete-profile`: Participant interest, skill, and institution profile.
- `/participant`: Participant workspace with sidebar, overview metrics, my registrations, schedule, and profile.
- `/organizer`: Club-scoped operations workspace with backend metrics, events, and public-profile content editors.
- `/check-in`: Fast gate ticket and attendee verification tool.

---

## 7. Data Model Boundaries & Migration Notes

1. **Club Identity vs Existing Data**:
   - Shared UI elements use generic Festivo branding; institute identity is configurable in the database.
   - Existing club, fest, and event records are rendered faithfully without hardcoded brand assumptions.
2. **Club Content Models**:
   - Segments, achievements, showcases, and gallery items have dedicated PostgreSQL tables, public read policies, and club-scoped organizer editors.
