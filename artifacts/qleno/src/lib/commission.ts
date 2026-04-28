/**
 * Commission calculation utility for Qleno.
 *
 * Rules:
 * - Residential: 35% of job total. Pre-clock-in split EQUALLY among
 *   assigned techs; post-clock-in split PROPORTIONALLY by actual minutes.
 * - [AI.7.4] Commercial: hourly rate × hours (default $20/hr). Same
 *   split structure as residential, but the base is hourly-rate × hours,
 *   NOT a fraction of jobTotal. Routing is on the caller — pass
 *   `basis: "commercial"` for commercial scopes.
 */

const RESIDENTIAL_RATE = 0.35;
const COMMERCIAL_HOURLY_RATE = 20;

export interface ClockIn {
  techId: number;
  minutesWorked: number;
}

export type CommissionBasis = "residential" | "commercial";

export interface CommissionSplit {
  totalCommission: number;
  /** Residential pool fraction (e.g. 0.35) when basis='residential', else null. */
  commissionRate: number | null;
  /** Commercial hourly rate ($/hr) when basis='commercial', else null. */
  commercialHourlyRate: number | null;
  basis: CommissionBasis;
  perTech: {
    techId: number | null;
    hours: number;
    commission: number;
  }[];
  mode: "equal" | "proportional" | "unassigned";
}

export function calculateCommissionSplit(
  jobTotal: number,
  estimatedHours: number,
  techCount: number,
  clockIns?: ClockIn[],
  basis: CommissionBasis = "residential",
): CommissionSplit {
  const totalCommission = basis === "commercial"
    ? Math.round(COMMERCIAL_HOURLY_RATE * estimatedHours * 100) / 100
    : Math.round(jobTotal * RESIDENTIAL_RATE * 100) / 100;
  const commissionRate = basis === "residential" ? RESIDENTIAL_RATE : null;
  const commercialHourlyRate = basis === "commercial" ? COMMERCIAL_HOURLY_RATE : null;

  // No techs assigned
  if (techCount === 0) {
    return {
      totalCommission,
      commissionRate,
      commercialHourlyRate,
      basis,
      perTech: [],
      mode: "unassigned",
    };
  }

  // Any tech has clocked in → proportional by actual minutes
  if (clockIns && clockIns.length > 0 && clockIns.some(c => c.minutesWorked > 0)) {
    const totalMinutes = clockIns.reduce((sum, c) => sum + c.minutesWorked, 0);
    return {
      totalCommission,
      commissionRate,
      commercialHourlyRate,
      basis,
      perTech: clockIns.map(c => ({
        techId: c.techId,
        hours: Math.round((c.minutesWorked / 60) * 100) / 100,
        commission: totalMinutes > 0
          ? Math.round((c.minutesWorked / totalMinutes) * totalCommission * 100) / 100
          : 0,
      })),
      mode: "proportional",
    };
  }

  // Pre-clock-in → equal split
  const perTechHours = Math.round((estimatedHours / techCount) * 100) / 100;
  const perTechCommission = Math.round((totalCommission / techCount) * 100) / 100;

  return {
    totalCommission,
    commissionRate,
    commercialHourlyRate,
    basis,
    perTech: Array.from({ length: techCount }, (_, i) => ({
      techId: null,
      hours: perTechHours,
      commission: perTechCommission,
    })),
    mode: "equal",
  };
}
