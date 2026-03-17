# CleanOps Pro

## Overview

CleanOps Pro is a multi-tenant SaaS platform designed for residential and commercial cleaning businesses. It aims to be a comprehensive management solution, offering tools for managing jobs, employees, customers, invoicing, payroll, and marketing initiatives. The platform includes a dedicated client portal and robust reporting capabilities, intending to streamline operations, improve client satisfaction, and drive business growth.

## User Preferences

I prefer iterative development with clear communication on significant changes. Before making major architectural changes or introducing new dependencies, please ask for approval. Focus on delivering well-tested, modular code.

## System Architecture

CleanOps Pro is built as a pnpm monorepo, separating the API server and the frontend application.

### UI/UX Decisions
- **Theme & Aesthetics:** Full light theme with an Apple/Tesla-grade aesthetic.
- **Typography:** Exclusively Plus Jakarta Sans (all weights).
- **Color Palette:** Defined palette including `bg-base #F7F6F3`, `bg-card #FFFFFF`, `border #E5E2DC`, `text primary #1A1917`, `text secondary #6B7280`, `muted #9E9B94`. Brand accent uses `--brand` (`#5B9BD5`) and `--brand-foreground` (`#FFFFFF`). Admin portal uses a purple accent (`#7F77DD`).
- **Design Elements:** No dark backgrounds, subtle box-shadows on cards, and 6px scrollbars.
- **Responsiveness:** Mobile-first design, especially for employee-facing features.

### Technical Implementations
- **Frontend:** React 18 with Vite, styled with Tailwind CSS and `shadcn/ui`. State management uses Zustand, data fetching with TanStack React Query, and routing with Wouter.
- **Backend:** Express 5 handles API requests.
- **Database:** PostgreSQL with Drizzle ORM for type-safe interactions.
- **Validation:** Zod for schema validation.
- **API Generation:** Orval generates API clients and Zod schemas from an OpenAPI specification.
- **Authentication:** JWTs for staff and client portals, bcryptjs for password hashing.
- **Multi-Tenancy:** All database tables include a `company_id`, and API requests are validated against the `company_id` from the JWT.
- **Geo-fencing:** Integrated with Google Maps API for employee clock-in/out location verification.
- **Tenant Branding:** Dynamic `useTenantBrand()` hook for company-specific branding.
- **PWA Support:** Frontend configured as a Progressive Web App.
- **Global Search:** Unified search functionality across the application.
- **Team Chat:** Real-time, slide-in chat panel with channels and direct messages.
- **Keyboard Shortcuts:** System-wide shortcuts for navigation and actions.

### Feature Specifications
- **Dashboard:** Overview of operations, revenue, alerts, and employee status.
- **Job Management:** 3-step wizard for job creation, dispatch, and duplication.
- **Employee Management:** Detailed profiles (personal, skills, attendance, availability, payroll, performance) with invite flow.
- **Customer Management:** Comprehensive client profiles with loyalty points, service history, and communication logs.
- **Invoicing & Billing:** Invoice generation, status tracking, batch invoicing, and Stripe integration.
- **Agreement Builder:** Native e-signature functionality with customizable templates and SHA-256 hashing.
- **Form Builder:** Drag-and-drop form creation with various field types.
- **Notifications:** Customizable notification templates with variable tokens.
- **Loyalty & Discounts:** Configurable loyalty programs and discount codes.
- **Payroll:** Tools for payroll export and period management.
- **Client Portal:** Branded portal for clients to view jobs, history, rate services, and tip technicians.
- **Reporting:** Performance insights, employee alerts, client churn risk, and revenue analytics.
- **Quote Management:** Features for creating and managing quotes, including scope settings, a quote builder, and tracking quote statuses.
- **Service Zones:** Management of service zones by zip code, including employee assignments, waitlists, and integration into dispatch and client-facing forms.
- **Security Enhancements:** Implemented rate limiting, refined JWT expiry and refresh mechanisms, global error handling, audit logging, and environment variable validation.

## Smart Dispatch Suggestion — Complete

Implemented and E2E tested (March 2026).

### API
- `POST /api/jobs/suggest-tech` — JWT protected; body: `{ date, start_time, end_time, zip_code }`
- Logic: queries all active technicians (role=technician), finds jobs on that date, removes any tech with overlapping job (30-min buffer each side), scores remaining techs by proximity tier:
  - Tier 1: tech's zone covers the job's zip code
  - Tier 2: tech's last job of the day is in the same zone as the job
  - Tier 3: tech's home zip is in the job's zone
  - Tier 4: available but different/no zone
- Returns up to 5 ranked results: `[{ employee_id, name, avatar_url, tier, reason, zone_color, zone_name, last_job_end_time }]`
- RLS enforced: company_id scoped at query level; returns 401 without JWT

### Frontend (job-wizard.tsx)
- `SuggestedTech` interface added; `suggestions`, `suggestionsLoading`, `suggestionsDismissed` state
- `useEffect` on step/date/time/duration/zip — computes end_time from scheduledTime + duration, calls `POST /api/jobs/suggest-tech`; silently falls back on error
- "Smart Suggestions" panel renders above the full employee list in Step 3:
  - Gray header: MapPin icon + "SMART SUGGESTIONS" label + X dismiss
  - Skeleton: 3 animated rows while loading
  - Suggestion rows: avatar circle, name, zone color dot + name, tier badge pill (green/blue/yellow/gray), availability text ("Free after X:XX PM" or "Available all day"), "Assign" button
  - Top suggestion has 3px brand-color left border
  - Clicking "Assign" sets selectedEmployee + dismisses the panel; button turns "Assigned" (blue)
  - No suggestions: "No techs available in this window" message
  - Full employee list relabeled "All Technicians" when suggestions are showing

### Key Files
- `artifacts/api-server/src/routes/jobs.ts` — `POST /suggest-tech` endpoint (after `/my-jobs`, before `/:id`)
- `artifacts/cleanops-pro/src/components/job-wizard.tsx` — Smart Suggestions UI in Step 3

## External Dependencies

- **Stripe:** Subscription management and payment processing (invoicing, charging cards).
- **Google Maps API:** Geocoding client addresses and geo-fencing for employees.
- **pdfkit:** Generating PDF reports.
- **Orval:** API client and schema generation.
- **Zod:** Data validation.
- **Drizzle ORM:** Database interactions with PostgreSQL.
- **bcryptjs & jsonwebtoken:** Secure authentication and authorization.
- **Tailwind CSS & shadcn/ui:** Styling and UI components.
- **TanStack React Query:** Server state management and data fetching.
- **Zustand:** Client-side state management.