/**
 * [AI.7.5] Canonical job visual status — single source of truth.
 *
 * The DB enum (job_status) is intentionally minimal — scheduled,
 * in_progress, complete, cancelled — because operational states like
 * "late clock-in" and "no show" are derived from time + clock-entry
 * absence, not stored. Surface code SHOULD NOT pattern-match on
 * job.status directly; route through getJobVisualStatus() so the
 * mapping stays consistent across the dispatch grid, mobile cards,
 * compact rows, my-jobs (tech view), and the Legend popover.
 *
 * Routing precedence (top wins on conflict):
 *   cancelled → completed_unpaid → completed → active → no_show → en_route
 *   → late_clockin → unassigned → scheduled
 *
 * en_route is scaffolded but inert: it requires `en_route_at` (set when
 * the field tech taps "On My Way"). The schema column doesn't exist yet
 * — the SMS / mobile-tech engine will add it later. Callers that don't
 * pass en_route_at will never see this status. It still has a
 * STATUS_VISUALS entry so the chip can render the animated car icon
 * the moment the column lands.
 *
 * completed_unpaid fires only for online-payment jobs (stripe/square).
 * Cash/check completion stays "completed" — there's no charge signal
 * to derive from, and reconciliation lives in a separate workflow.
 */

/**
 * [AI.7.5.hotfix3] LIVE_OPS gate. The detection logic for time-based
 * states (late_clockin, no_show) is fully built — see below — but
 * pre-launch we have no real clock-in data, only seed/import data
 * with stale scheduled_times. Returning late_clockin / no_show in
 * that environment paints "NO SHOW" badges on every old job.
 *
 * Single source of truth so future surfaces can import this and
 * gate consistently. Flip to true after operations go live.
 *
 * Build the engine, don't turn it on.
 */
export const LIVE_OPS = false;

export type JobVisualStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "completed_unpaid"
  | "en_route"
  | "late_clockin"
  | "no_show"
  | "cancelled"
  | "unassigned";

export interface JobStatusInput {
  status: string | null | undefined;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  assigned_user_id?: number | null;
  clock_entry?: { clock_in_at?: string | null; clock_out_at?: string | null } | null;
  /** Set when the tech taps "On My Way" in the mobile app. Inert until
   *  the SMS engine + schema column land — callers that don't supply
   *  it never trigger en_route. */
  en_route_at?: string | null;
  /** Online-payment signals. completed_unpaid fires when status='complete'
   *  AND payment method is stripe/square AND charge_succeeded_at is null.
   *  Cash/check completion stays "completed" regardless. */
  client_payment_method?: string | null;
  charge_succeeded_at?: string | null;
}

const LATE_GRACE_MIN = 5;
const NO_SHOW_THRESHOLD_MIN = 30;

function timeToMins(t: string | null | undefined): number {
  if (!t) return 0;
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function isToday(dateStr: string | null | undefined, now: Date): boolean {
  if (!dateStr) return false;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return dateStr.startsWith(`${y}-${m}-${d}`);
}

function isUnpaidOnlineJob(job: JobStatusInput): boolean {
  const m = job.client_payment_method;
  if (m !== "stripe" && m !== "square") return false;
  return !job.charge_succeeded_at;
}

export function getJobVisualStatus(job: JobStatusInput, now: Date = new Date()): JobVisualStatus {
  if (job.status === "cancelled") return "cancelled";
  if (job.status === "complete") {
    return isUnpaidOnlineJob(job) ? "completed_unpaid" : "completed";
  }

  const hasClockIn = !!job.clock_entry?.clock_in_at;
  const hasClockOut = !!job.clock_entry?.clock_out_at;

  // Active: clocked in but not yet completed. Survives past clock-out
  // until the office marks complete (status='in_progress' transition).
  if (hasClockIn && !hasClockOut && job.status !== "complete") return "active";
  if (job.status === "in_progress") return "active";

  // [AI.7.5.hotfix3] Late / no-show derive from time + clock-entry
  // absence. Suppressed entirely when LIVE_OPS=false — engine still
  // computes the math (LATE_GRACE_MIN / NO_SHOW_THRESHOLD_MIN
  // constants live above; flipping LIVE_OPS=true is the only switch
  // needed) but the function returns scheduled/unassigned instead so
  // the board doesn't paint "NO SHOW" badges on import data with
  // stale scheduled_times that pre-date go-live.
  //
  // En route slots between no_show and late_clockin: a tech who said
  // "on my way" 10 min after start should read EN ROUTE, not LATE
  // (the office knows they're coming). But once we're past the
  // no_show threshold (30 min), en_route loses — there's an
  // operational problem regardless of what the tech radioed.
  if (LIVE_OPS && isToday(job.scheduled_date, now) && !hasClockIn) {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = timeToMins(job.scheduled_time);
    if (startMins > 0) {
      const minsLate = nowMins - startMins;
      if (minsLate >= NO_SHOW_THRESHOLD_MIN) return "no_show";
      if (job.en_route_at) return "en_route";
      if (minsLate >= LATE_GRACE_MIN) return "late_clockin";
    }
  }

  // En route can also fire BEFORE scheduled start (tech is heading
  // there early). No clock-in yet, en_route_at set.
  if (job.en_route_at && !hasClockIn) return "en_route";

  if (job.assigned_user_id == null) return "unassigned";
  return "scheduled";
}

/**
 * Visual treatment for each status. Consumers compose these onto card
 * surfaces; the underlying tech color (zone color) is supplied
 * separately and combined per-card.
 */
export interface StatusVisual {
  /** Display label (sentence-case) for chips/legend. */
  label: string;
  /** One-line description for the legend popover. */
  description: string;
  /** Solid swatch color shown in the legend tile preview. */
  swatch: string;
  /** Stripe color when active (amber); null for non-active states. */
  stripe: string | null;
  /** Body opacity multiplier (1.0 default; 0.6 for completed; 0.5 cancelled). */
  bodyOpacity: number;
  /** Whether to render a green checkmark badge top-right (completed). */
  showCheckmark: boolean;
  /** Whether to render a "NO SHOW" text badge. */
  showNoShowBadge: boolean;
  /** Whether to apply strikethrough to the title text (cancelled). */
  strikethrough: boolean;
  /** Whether to desaturate the body via grayscale filter (cancelled). */
  desaturate: boolean;
  /** Border color override (red for late/no_show, default for others). */
  borderOverride: string | null;
  /** Whether to render an animated car icon left of the client name
   *  (en_route only). The icon + motion-line markup is owned by each
   *  consumer; this flag is the trigger. */
  showCarIcon: boolean;
}

export const STATUS_VISUALS: Record<JobVisualStatus, StatusVisual> = {
  scheduled: {
    label: "Scheduled",
    description: "Job on the board, no tech clocked in yet.",
    swatch: "#A78BFA",
    stripe: null,
    bodyOpacity: 1,
    showCheckmark: false,
    showNoShowBadge: false,
    strikethrough: false,
    desaturate: false,
    borderOverride: null,
    showCarIcon: false,
  },
  active: {
    label: "Active",
    description: "Tech is clocked in. Stripe pulses while live.",
    swatch: "#A78BFA",
    stripe: "#F59E0B",
    bodyOpacity: 1,
    showCheckmark: false,
    showNoShowBadge: false,
    strikethrough: false,
    desaturate: false,
    borderOverride: null,
    showCarIcon: false,
  },
  en_route: {
    label: "En route",
    description: "Tech tapped 'On My Way' but hasn't clocked in yet.",
    swatch: "#A78BFA",
    stripe: null,
    bodyOpacity: 1,
    showCheckmark: false,
    showNoShowBadge: false,
    strikethrough: false,
    desaturate: false,
    borderOverride: null,
    showCarIcon: true,
  },
  completed: {
    label: "Completed",
    description: "Job finished. Tech clocked out and office marked complete.",
    swatch: "#A78BFA",
    stripe: null,
    bodyOpacity: 0.6,
    showCheckmark: true,
    showNoShowBadge: false,
    strikethrough: false,
    desaturate: false,
    borderOverride: null,
    showCarIcon: false,
  },
  completed_unpaid: {
    label: "Completed (unpaid)",
    description: "Job done but online charge has not succeeded. Amber ring.",
    swatch: "#BA7517",
    stripe: null,
    bodyOpacity: 0.6,
    showCheckmark: true,
    showNoShowBadge: false,
    strikethrough: false,
    desaturate: false,
    borderOverride: "#BA7517",
    showCarIcon: false,
  },
  late_clockin: {
    label: "Late clock-in",
    description: "Past start time + 5 min, tech still has not clocked in.",
    swatch: "#A78BFA",
    stripe: null,
    bodyOpacity: 1,
    showCheckmark: false,
    showNoShowBadge: false,
    strikethrough: false,
    desaturate: false,
    borderOverride: "#DC2626",
    showCarIcon: false,
  },
  no_show: {
    label: "No show",
    description: "Past start time + 30 min, no clock-in. Action required.",
    swatch: "#EF4444",
    stripe: null,
    bodyOpacity: 0.85,
    showCheckmark: false,
    showNoShowBadge: true,
    strikethrough: false,
    desaturate: false,
    borderOverride: "#991B1B",
    showCarIcon: false,
  },
  cancelled: {
    label: "Cancelled",
    description: "Manually cancelled. Strikethrough + desaturated.",
    swatch: "#9CA3AF",
    stripe: null,
    bodyOpacity: 0.5,
    showCheckmark: false,
    showNoShowBadge: false,
    strikethrough: true,
    desaturate: true,
    borderOverride: null,
    showCarIcon: false,
  },
  unassigned: {
    label: "Unassigned",
    description: "No primary tech yet. Surfaces in Unassigned row.",
    swatch: "#FBBF24",
    stripe: null,
    bodyOpacity: 1,
    showCheckmark: false,
    showNoShowBadge: false,
    strikethrough: false,
    desaturate: false,
    borderOverride: "#F59E0B",
    showCarIcon: false,
  },
};

/** Stripe pulse keyframes injected once; consumers reference the
 *  `qleno-active-stripe` class. Reduced-motion drops the animation
 *  to a steady 1.0 opacity. Idempotent — only injects once per
 *  document. */
let stylesInjected = false;
export function ensureJobStatusStyles(): void {
  if (stylesInjected) return;
  if (typeof document === "undefined") return;
  const id = "qleno-job-status-styles";
  if (document.getElementById(id)) { stylesInjected = true; return; }
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @keyframes qleno-active-stripe-pulse {
      0%   { opacity: 1; }
      50%  { opacity: 0.6; }
      100% { opacity: 1; }
    }
    .qleno-active-stripe {
      animation: qleno-active-stripe-pulse 2s ease-in-out infinite;
    }
    @keyframes qleno-en-route-drive {
      0%   { transform: translateX(0); }
      50%  { transform: translateX(1.5px); }
      100% { transform: translateX(0); }
    }
    .qleno-en-route-icon {
      animation: qleno-en-route-drive 0.8s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .qleno-active-stripe { animation: none; opacity: 1; }
      .qleno-en-route-icon { animation: none; }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}
