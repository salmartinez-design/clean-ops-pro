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
- `/dashboard` — Smart Dashboard: Today at a Glance status bar (auto-refresh 60s), Revenue progress vs daily goal, Alerts panel with dismiss/action, Employee Status Board, revenue chart, recent jobs
- `/jobs` — Dispatch board with 3-step Job Creation Wizard (Client search+history → Service type grid+time pills+auto-price → Employee assign), Duplicate Job button on job panel
- `/employees` — Table with SVG productivity rings, role badges, score + Send Invite button
- `/employees/:id` — 11-tab employee profile (Information, Tags & Skills, Attendance, Availability, User Account, Contacts, Scorecards, Additional Pay, Contact Tickets, Jobs, Notes)
- `/customers` — Client table with loyalty points display, batch selection
- `/invoices` — Stat cards, tabbed filter, invoice table with status badges
- `/company` — General + Branding + **Notifications** tab (6 trigger templates, toggle on/off, edit body+subject, variable tokens, test button, activity log) + Integrations + Payroll Options
- `/company/billing` — Plan status, next billing date, trial countdown, upgrade/cancel; Stripe subscription flow
- `/company/property-groups` — Property Management Group CRUD; assign clients to groups; filter clients by group
- `/company/agreements` — Agreement Template editor (WYSIWYG body, custom fields); send eSign request to client; portal signing with typed name + SHA-256 hash; eSign badge on client Overview
- `/reports/insights` — Performance Insights: top performers with star ratings, employee concern alerts, client churn risk, revenue by service type bar chart
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

## Platform Features (MaidCentral-Beating)

### Global Search
- Triggered by pressing "/" or clicking the magnifier icon in the top bar
- Searches across: clients (name/email/phone/address), jobs (service type/status/date/client), employees (name/email), invoices (client/status)
- Results grouped by type; click any result navigates directly to that record
- API: `GET /api/search?q=term`

### Team Chat
- Slide-in panel (320px from right) triggered by the chat icon in the top bar
- Channels: #general, #dispatch + direct messages; polls every 10 seconds
- Unread badge on the top-bar chat icon
- API: `GET /api/messages?channel=`, `POST /api/messages`, `PATCH /api/messages/:id/read`

### Keyboard Shortcuts
- Press "?" to show the full shortcut overlay
- Active shortcuts: / = Search, N = New Job, E = Employees, D = Dashboard, C = Customers, I = Invoices, P = Payroll, ? = Help
- Implemented as a custom hook (`useKeyboardShortcuts`) + overlay component (`keyboard-shortcuts.tsx`)

### PWA Support
- `manifest.json` with name, icons, theme_color (#5B9BD5), display: standalone
- Linked in index.html with Apple meta tags for "Add to Home Screen"

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
- `quotes` — client quotes (line items JSONB, status: draft/sent/accepted/declined, valid_until)
- `payments` — payment records per client (amount, method, stripe_payment_intent_id, status)
- `client_attachments` — file attachments per client (file_url, file_name, file_type, file_size)
- `property_groups` — property management groups per company (name, description, contact info)
- `agreement_templates` — eSign templates (title, body, custom_fields JSONB, active)
- `client_agreements` — sent/signed agreements per client (template_id, signed_at, typed_name, content_hash SHA-256)
- `jobs.completion_pdf_url` — path to auto-generated PDF when job is marked complete
- `clients.property_group_id` — FK to property_groups
- `clients.stripe_customer_id`, `default_card_last_4`, `default_card_brand` — Stripe billing fields

## Client Profile — 13 Tabs

`/customers/:id` tabs:
1. **Overview** — Contact info, home details, service history summary, eSign badge, loyalty points
2. **Jobs** — Paginated job history with status filter, "Book New Job" shortcut
3. **Invoices** — Client invoice list with status badges, paid/outstanding totals
4. **Communications** — Email/SMS log
5. **Portal** — Portal access toggle, invite send, property group assignment
6. **Ratings** — Star rating history from client portal
7. **Scorecards** — Employee scorecards per job for this client
8. **Training** — Relevant Cleancyclopedia articles
9. **Notes** — Internal team notes with timestamps
10. **Quotes** — Create/send/convert-to-invoice quotes (line items, status flow)
11. **Payments** — Charge card, refund, payment history; Stripe customer integration
12. **QuickBooks** — Connect QBO, sync client/invoices (stub UI)
13. **Attachments** — Drag-drop file upload, file type icons, download/delete

## Invoices — Batch Invoicing

`/invoices` page has a "Batch Invoice" button that opens a modal:
- Lists today's completed jobs that haven't been invoiced yet
- Multi-select checkboxes per job
- Auto-send and auto-charge toggles
- Progress bar + summary (created / failed) after processing
- Creates invoice records for all selected jobs

## Job Completion PDF (T007)

On `POST /api/jobs/:id/complete`:
1. Marks job status → `complete`
2. Generates a PDF report (`pdfkit`) with: company name, client, address, service type, dates, fee, hours, notes, before/after photo counts, completion timestamp
3. Saves PDF to `artifacts/api-server/pdfs/` and serves at `/api/pdfs/<filename>`
4. Stores path in `jobs.completion_pdf_url`
5. PDF generation is non-fatal (job still completes if PDF fails)

## API Routes

### Portal Routes (`/api/portal/*`)
- `GET /api/portal/company/:slug` — public; get company branding for portal
- `POST /api/portal/login` — portal client login; returns portal JWT
- `GET /api/portal/me` — portal auth; get client profile
- `GET /api/portal/jobs` — portal auth; upcoming + past jobs
- `POST /api/portal/rate` — portal auth; submit/update star rating for a job
- `POST /api/portal/tip` — portal auth; send tip (inserts to additional_pay)
- `POST /api/portal/invite-client` — set portal password + enable access for a client

### New Feature Routes
- `GET/POST /api/quotes` — list/create quotes per client; `PATCH /api/quotes/:id` — update/send/convert; `DELETE /api/quotes/:id`
- `GET/POST /api/payments` — list/create payments per client; `POST /api/payments/:id/refund`
- `GET/POST /api/attachments` — list/upload attachments per client; `DELETE /api/attachments/:id`
- `GET/POST/PATCH/DELETE /api/property-groups` — property management group CRUD; `GET /api/property-groups/:id/clients`
- `GET/POST/PATCH/DELETE /api/agreement-templates` — template CRUD; `POST /api/agreement-templates/:id/send` — send eSign to client; `POST /api/agreement-templates/agreements/:id/sign` — client portal signing
- `GET /api/billing/status` — current plan + Stripe subscription status; `POST /api/billing/create-subscription`; `POST /api/billing/cancel-subscription`

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
