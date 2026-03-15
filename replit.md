# CleanOps Pro

## Overview

Multi-tenant SaaS platform for residential and commercial cleaning businesses (PHES Cleaning LLC, built for Sal Martinez). Built on a pnpm monorepo.

## Demo Credentials

- **Owner (PHES Cleaning):** owner@phescleaning.com / demo1234
- **Admin (PHES Cleaning):** admin@phescleaning.com / demo1234
- **Technician (PHES Cleaning):** jessica@phescleaning.com / demo1234
- **Client Portal (PHES Cleaning):** emily.brown@email.com / portal123 → /portal/phes-cleaning/login
- **Super Admin (Platform):** admin@cleanopspro.com / Admin#CleanOps2026!

## Design System

**Theme:** Full light theme (Apple/Tesla-grade)
**Fonts:** Plus Jakarta Sans exclusively (all weights). No other fonts allowed.
**Colors:** bg-base `#F7F6F3` · bg-card `#FFFFFF` · border `#E5E2DC` · text primary `#1A1917` · text secondary `#6B7280` · muted `#9E9B94`
**Brand accent:** `--brand` CSS var (`#5B9BD5` PHES blue) · `--brand-foreground` `#FFFFFF`
**Admin portal:** purple accent `#7F77DD` · sidebar `#F5F4FF` · main bg `#F2F1FE`
**No dark backgrounds anywhere** · Subtle box-shadows on cards · 6px scrollbars

## Pages

### Admin/Owner Dashboard
- `/dashboard` — Metrics, revenue chart, top employees, recent jobs
- `/jobs` — Job grid with frequency-color left borders + status bottom borders, Create Job dialog
- `/employees` — Table with SVG productivity rings, role badges, score + Send Invite button
- `/employees/:id` — 11-tab employee profile (Information, Tags & Skills, Attendance, Availability, User Account, Contacts, Scorecards, Additional Pay, Contact Tickets, Jobs, Notes)
- `/customers` — Client table with loyalty points display, batch selection
- `/invoices` — Stat cards, tabbed filter, invoice table with status badges
- `/company` — General settings + Branding tab (live color picker, logo URL, sidebar preview)
- `/loyalty` — Program style selector, earn rules with toggles/slider, rewards toggle list
- `/discounts` — Discount code management (percentage/fixed, scope, expiry, active toggle)
- `/payroll` — Payroll export and period management
- `/cleancyclopedia` — Training library for employees
- `/my-jobs` — Mobile-first employee daily job view; geo-fence clock-in/out; before/after photo upload; elapsed timer; after-photo gate on clock-out
- `/employees/clocks` — Clock Monitor (owner/admin only); today's entries table; flagged row highlighting; dismiss-flag modal

### Client Portal
- `/portal/:slug/login` — Branded client portal login (company logo, name, slug-based)
- `/portal/:slug/dashboard` — 3-tab portal: Home (next cleaning, rate last, quick actions, loyalty points), History, Tip My Cleaner
- Portal JWT stored in `localStorage` as `portal_token_{slug}`; separate auth role `portal_client`

### Auth Pages
- `/login` — Staff login
- `/accept-invite?token=xxx` — Employee invite acceptance + password set

## Employee Profile — 11 Tabs

`/employees/:id` tabs:
1. **Information** — Personal details (name, phone, email, DOB, city, state, zip, employment type, pay type, pay rate, hire date, banking)
2. **Tags & Skills** — Skill endorsements + custom tag chips with + Add flows
3. **Attendance** — Monthly calendar view with clock-in/out records, flagged day markers, stats panel
4. **Availability** — Weekly availability grid (Mon–Sun), toggle per day + time range, Save Availability
5. **User Account** — Login email, role selector, account active toggle, password reset
6. **Contacts** — Primary contact + emergency contact cards
7. **Scorecards** — Performance ratings history
8. **Additional Pay** — Tips, bonuses, sick pay entries
9. **Contact Tickets** — HR contact log with open/closed status
10. **Jobs** — Paginated job history for this employee
11. **Notes** — Internal team notes with timestamps

## Employee Invite Flow

- Owner/Admin clicks "Send Invite" on `/employees` table → `POST /api/users/invite` generates a token
- Employee receives a URL: `/accept-invite?token=xxx`
- Employee sets their password → auto-login → redirect to `/my-jobs`
- Row shows "INVITED" badge after successful send, with toast confirmation

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
- POST /api/auth/login → returns JWT token (role: owner/admin/office/technician)
- POST /api/portal/login → returns JWT token (role: portal_client, uses clientId as userId)
- Token stored in localStorage via Zustand store (staff) or per-slug key (portal)
- All subsequent requests include `Authorization: Bearer <token>`

### Route Order (Important)
In `routes/index.ts`, `employee-extended` router is mounted **before** `users` router — both at `/users` path — so invite routes (`/users/:id/invite`) don't conflict with the base users CRUD.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express 5 API server
│   │   └── src/routes/     # employees, employee-extended, portal, jobs, clients, etc.
│   └── cleanops-pro/       # React + Vite frontend
│       └── src/pages/
│           ├── portal/     # login.tsx, dashboard.tsx (client portal)
│           └── ...         # all admin pages
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/
    └── src/seed.ts         # Database seeder
```

## Database Schema

- `companies` — multi-tenant root (slug, brand_color, geo_fence_threshold_ft)
- `users` — employees with roles (owner/admin/office/technician/super_admin) + 20 extended fields (tags, availability, banking, invite_token, emergency_contacts)
- `clients` — customers with loyalty points + portal auth columns (portal_password_hash, portal_access, portal_invite_token, portal_last_login)
- `jobs` — scheduled/in_progress/complete/cancelled (service_type, assigned_user_id, base_fee)
- `job_photos` — before/after photos per job
- `timeclock` — geo-fenced clock-in/out entries with flagging
- `invoices` — with JSONB line items, status flow
- `scorecards` — 0-4 employee performance scores
- `additional_pay` — tips/bonuses/sick/holiday/vacation/deductions (linked to jobs)
- `availability` — per-user weekly availability grid (day_of_week, start_time, end_time, is_available)
- `contact_tickets` — HR contact log per employee
- `employee_notes` — internal notes per employee
- `client_ratings` — star ratings + comments from portal clients per job
- `loyalty_settings` — per-company loyalty program config
- `loyalty_points_log` — earn/redeem history
- `discounts` — discount codes (percentage/fixed, scope, expiry)

## API Routes

### Portal Routes (`/api/portal/*`)
- `GET /api/portal/company/:slug` — public; get company branding for portal
- `POST /api/portal/login` — portal client login; returns portal JWT
- `GET /api/portal/me` — portal auth; get client profile
- `GET /api/portal/jobs` — portal auth; upcoming + past jobs
- `POST /api/portal/rate` — portal auth; submit/update star rating for a job
- `POST /api/portal/tip` — portal auth; send tip (inserts to additional_pay)
- `POST /api/portal/invite-client` — set portal password + enable access for a client

### Employee Extended Routes (`/api/users/*`)
- `PATCH /api/users/:id/profile` — update extended employee fields
- `GET/PUT /api/users/:id/availability` — weekly availability grid
- `GET/POST /api/users/:id/tickets` — contact tickets
- `GET /api/users/:id/jobs` — paginated job history
- `POST /api/users/:id/notes` — add note; `GET /api/users/:id/notes`
- `POST /api/users/invite` — send invite email (token-based)
- `GET /api/users/validate-invite` — validate invite token
- `POST /api/users/accept-invite` — set password + auto-login

## Running Locally

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/cleanops-pro run dev

# Seed database
pnpm --filter @workspace/scripts run seed

# Push DB schema changes
pnpm --filter @workspace/db run push
```

## Security

- JWT auth with company_id + role claims
- Portal JWT with role: "portal_client" and clientId as userId
- Every DB query scoped to company_id from token
- Rate limiting on login (5 attempts/15 min)
- Parameterized queries (Drizzle ORM)
- Photo upload gate before job completion
- Geo-fence flagging for clock-ins outside threshold
- bcryptjs password hashing for both staff and portal clients
