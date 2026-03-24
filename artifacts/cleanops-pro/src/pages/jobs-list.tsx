import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getAuthHeaders } from "@/lib/auth";
import { useBranch } from "@/contexts/branch-context";
import { Link } from "wouter";
import {
  Search, ChevronLeft, ChevronRight, Calendar, User,
  Briefcase, DollarSign, Clock, Filter, X,
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");
const FF = "'Plus Jakarta Sans', sans-serif";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  scheduled:   { bg: "#DBEAFE", color: "#1D4ED8", label: "Scheduled" },
  in_progress: { bg: "#FEF3C7", color: "#92400E", label: "In Progress" },
  complete:    { bg: "#DCFCE7", color: "#15803D", label: "Complete" },
  cancelled:   { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
};

const SERVICE_LABELS: Record<string, string> = {
  standard: "Standard",
  deep: "Deep Clean",
  move_in_out: "Move In/Out",
  post_construction: "Post Construction",
  office: "Office",
  airbnb: "Airbnb",
};

const PAGE_SIZE = 50;

export default function JobsListPage() {
  const { activeBranchId } = useBranch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["jobs-list", page, search, statusFilter, dateFilter, activeBranchId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFilter && { date: dateFilter }),
        ...(activeBranchId ? { branch_id: String(activeBranchId) } : {}),
      });
      const res = await fetch(`${API}/jobs?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json() as Promise<{
        data: {
          id: number;
          client_id: number;
          client_name: string;
          assigned_user_id: number;
          assigned_user_name: string;
          service_type: string;
          status: string;
          scheduled_date: string;
          scheduled_time: string;
          frequency: string;
          base_fee: string;
          allowed_hours: string | null;
          actual_hours: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
      }>;
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  function applySearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setSearchInput("");
    setStatusFilter("");
    setDateFilter("");
    setPage(1);
  }

  const hasFilters = search || statusFilter || dateFilter;

  function fmt(date: string) {
    if (!date) return "—";
    const [y, m, d] = date.split("-");
    return `${m}/${d}/${y}`;
  }

  function fmtTime(t: string) {
    if (!t) return "";
    const [h, min] = t.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${min} ${suffix}`;
  }

  function fmtMoney(val: string | null) {
    if (!val) return "—";
    const n = parseFloat(val);
    return isNaN(n) ? "—" : `$${n.toFixed(0)}`;
  }

  return (
    <DashboardLayout title="Jobs">
      <div style={{ padding: "24px 28px", fontFamily: FF, minHeight: "100%" }}>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 340 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9E9B94", pointerEvents: "none" }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applySearch()}
              placeholder="Search client or technician…"
              style={{
                width: "100%", paddingLeft: 32, paddingRight: 12, height: 36,
                border: "1px solid #E5E2DA", borderRadius: 8, fontSize: 13,
                fontFamily: FF, color: "#1A1917", background: "#FAFAF8",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={applySearch}
            style={{ height: 36, padding: "0 16px", background: "var(--brand)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FF }}
          >
            Search
          </button>

          {/* Status filter */}
          <div style={{ position: "relative" }}>
            <Filter size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9E9B94", pointerEvents: "none" }} />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ height: 36, paddingLeft: 26, paddingRight: 12, border: "1px solid #E5E2DA", borderRadius: 8, fontSize: 13, fontFamily: FF, color: "#1A1917", background: "#FAFAF8", appearance: "none", cursor: "pointer" }}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1); }}
            style={{ height: 36, padding: "0 10px", border: "1px solid #E5E2DA", borderRadius: 8, fontSize: 13, fontFamily: FF, color: "#1A1917", background: "#FAFAF8" }}
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{ height: 36, padding: "0 12px", background: "transparent", border: "1px solid #E5E2DA", borderRadius: 8, fontSize: 13, fontFamily: FF, color: "#6B6860", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <X size={13} /> Clear
            </button>
          )}

          <div style={{ marginLeft: "auto", fontSize: 13, color: "#9E9B94", fontFamily: FF }}>
            {data ? `${data.total.toLocaleString()} jobs` : "Loading…"}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#FFFFFF", border: "1px solid #EEECE7", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: FF }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #EEECE7" }}>
                {["Client", "Technician", "Date", "Time", "Service", "Status", "Amount"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9E9B94", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #EEECE7" }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} style={{ padding: "12px 14px" }}>
                        <div style={{ height: 14, background: "#F0EEE9", borderRadius: 4, width: j === 0 ? 120 : j === 1 ? 100 : 70, animation: "pulse 1.5s ease-in-out infinite" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 14px", textAlign: "center", color: "#9E9B94" }}>
                    No jobs found
                  </td>
                </tr>
              ) : (
                data?.data.map((job, idx) => {
                  const ss = STATUS_STYLE[job.status] ?? { bg: "#F3F4F6", color: "#6B7280", label: job.status };
                  return (
                    <tr
                      key={job.id}
                      style={{ borderBottom: "1px solid #EEECE7", background: idx % 2 === 0 ? "#FFFFFF" : "#FDFCFB", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F7F5F2")}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "#FFFFFF" : "#FDFCFB")}
                    >
                      <td style={{ padding: "11px 14px" }}>
                        <Link href={`/customers/${job.client_id}`}>
                          <span style={{ color: "var(--brand)", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                            {job.client_name || "—"}
                          </span>
                        </Link>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#3D3A34" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <User size={13} style={{ color: "#9E9B94", flexShrink: 0 }} />
                          {job.assigned_user_name || "Unassigned"}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#3D3A34", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={13} style={{ color: "#9E9B94", flexShrink: 0 }} />
                          {fmt(job.scheduled_date)}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#3D3A34", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={13} style={{ color: "#9E9B94", flexShrink: 0 }} />
                          {fmtTime(job.scheduled_time)}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#3D3A34" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Briefcase size={13} style={{ color: "#9E9B94", flexShrink: 0 }} />
                          {SERVICE_LABELS[job.service_type] ?? job.service_type ?? "—"}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color }}>
                          {ss.label}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#3D3A34", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <DollarSign size={13} style={{ color: "#9E9B94", flexShrink: 0 }} />
                          {fmtMoney(job.base_fee)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 20 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ height: 34, width: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E5E2DA", borderRadius: 8, background: page === 1 ? "#FAFAF8" : "#FFFFFF", cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "#C9C7C0" : "#3D3A34" }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, color: "#6B6860", fontFamily: FF }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ height: 34, width: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E5E2DA", borderRadius: 8, background: page === totalPages ? "#FAFAF8" : "#FFFFFF", cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "#C9C7C0" : "#3D3A34" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
