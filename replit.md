# CleanOps Pro

## Overview

Multi-tenant SaaS platform for residential and commercial cleaning businesses. Built on a pnpm monorepo.

## Demo Credentials

- **Owner (PHES Cleaning):** owner@phescleaning.com / demo1234
- **Admin (PHES Cleaning):** admin@phescleaning.com / demo1234
- **Technician (PHES Cleaning):** jessica@phescleaning.com / demo1234
- **Super Admin (Platform):** admin@cleanopspro.com / Admin#CleanOps2026!

## Design System

**Theme:** Full light theme (Apple/Tesla-grade)
**Fonts:** Plus Jakarta Sans exclusively (all weights)
**Colors:** bg-base `#F7F6F3` · bg-card `#FFFFFF` · border `#E5E2DC` · text primary `#1A1917` · text secondary `#6B7280`
**Brand accent:** `--brand` CSS var (`#5B9BD5` PHES blue) · `--brand-foreground` `#FFFFFF`
**Admin portal:** purple accent `#7F77DD` · sidebar `#F5F4FF` · main bg `#F2F1FE`
**No dark backgrounds anywhere** · Subtle box-shadows on cards · 6px scrollbars

## Pages

- `/dashboard` — Metrics, revenue chart, top employees, recent jobs
- `/jobs` — Job grid with frequency-color left borders + status bottom borders, Create Job dialog
- `/employees` — Table with SVG productivity rings, role badges, score
- `/customers` — Client table with loyalty points display, batch selection
- `/invoices` — Stat cards, tabbed filter, invoice table with status badges
- `/company` — General settings + Branding tab (live color picker, logo URL, sidebar preview)
- `/loyalty` — Program style selector, earn rules with toggles/slider, rewards toggle list
- `/discounts` — Discount code management (percentage/fixed, scope, expiry, active toggle); API: GET/POST/PATCH/DELETE /api/discounts
- `/payroll` — Payroll export and period management
- `/cleancyclopedia` — Training library for employees
- `/my-jobs` — Mobile-first employee daily job view; geo-fence clock-in/out; before/after photo upload; elapsed timer; after-photo gate on clock-out
- `/employees/clocks` — Clock Monitor (owner/admin only); today's entries table; flagged row highlighting; dismiss-flag modal

## Geo-fencing System

- **timeclock** table: clock_in/out lat/lng, distance_from_job_ft, flagged boolean
- **job_photos** table: before/after photos stored as data_url, per job + user
- **API**: POST /api/timeclock/clock-in (geo check against client lat/lng), POST /api/timeclock/:id/clock-out (requires ≥1 after photo), PATCH /api/timeclock/:id/unflag
- **Geocoding**: Auto-geocodes client address on create/update via Google Maps API (key: GOOGLE_MAPS_API_KEY env var); POST /api/clients/geocode-all to backfill existing clients
- **Geo threshold**: companies.geo_fence_threshold_ft (default 500 ft)

## Tenant Branding

`useTenantBrand()` hook fetches company on login, injects `--tenant-color` and `--tenant-color-rgb` CSS vars.
`applyTenantColor(hex)` can be called directly for instant preview updates (used in Company page).
Stored in `companies.brand_color` column (VARCHAR 7). Default: #00C9A7.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack React Query, Zustand
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (bcryptjs + jsonwebtoken)

## Architecture

### Multi-Tenancy
Every table has `company_id`. Every API route validates `company_id` from JWT — never from client body.

### Auth Flow
- POST /api/auth/login → returns JWT token
- Token stored in localStorage via Zustand store
- All subsequent requests include `Authorization: Bearer <token>`

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API server
│   └── cleanops-pro/       # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/
    └── src/seed.ts         # Database seeder
```

## Database Schema

- `companies` — multi-tenant root
- `users` — employees with roles (owner/admin/office/technician/super_admin)
- `clients` — customers with loyalty points
- `jobs` — scheduled/in_progress/complete/cancelled
- `job_photos` — before/after photos per job
- `timeclock` — geo-fenced clock-in/out entries with flagging
- `invoices` — with JSONB line items, status flow
- `scorecards` — 0-4 employee performance scores
- `additional_pay` — tips/bonuses/sick/holiday/vacation/deductions
- `loyalty_settings` — per-company loyalty program config
- `loyalty_points_log` — earn/redeem history

## Features Implemented (Phase 1 & 2)

### Dashboard
- Metrics: jobs (scheduled/completed/in-progress/cancelled), revenue, tips, active clients, employees, flagged clock-ins, avg score
- Top employees list
- Recent jobs list

### Scheduling
- Week-view calendar with employee color coding
- Job status badges (scheduled/in_progress/complete/cancelled)
- Frequency color coding (weekly/biweekly/monthly)
- Service type labels (residential + commercial)

### Employees
- Employee list with role/status filters
- Profile with tabs: Info, Scorecards, Additional Pay, Jobs
- Productivity % display (allowed vs actual hours)
- Pay types: hourly, per_job, fee_split

### Clients
- Client list with search
- Client detail with job history, revenue stats
- Loyalty points display

### Jobs
- Full job lifecycle (schedule → in_progress → complete)
- Before/after photo upload (gate: must have after photos to complete)
- Geo-fenced clock-in/out
- Checklist items

### Invoices
- Invoice creation from jobs
- Line item editing
- Status flow: draft → sent → paid → overdue
- Revenue statistics header

### Payroll
- Summary by pay period
- Breakdown by employee with all pay types
- Export formats: PDF, CSV, ADP CSV, Paychex CSV, Gusto CSV

### Loyalty Program
- Points-based, punch card, or tiered VIP styles
- Configurable earn rules
- Points ledger per client

## Running Locally

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/cleanops-pro run dev

# Seed database
pnpm --filter @workspace/scripts run seed

# Run codegen after API spec changes
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes
pnpm --filter @workspace/db run push
```

## UI Design System

- **Dark mode** default for admin/owner dashboard
- **Primary teal** (#00C9A7) for accents, CTAs
- **Dark background** (#0D0D0D base)
- **Fonts**: Playfair Display (headings) + DM Mono (body/labels)
- **Cards**: bg #151515, border #222, radius 12px
- **No gradients, no box shadows, no blur**

## Security

- JWT auth with company_id + role claims
- Every DB query scoped to company_id from token
- Rate limiting on login (5 attempts/15 min)
- Parameterized queries (Drizzle ORM)
- Photo upload gate before job completion
- Geo-fence flagging for clock-ins outside threshold
