import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, SendHorizonal, Briefcase, CheckCircle, Trash2, Clock, User, MapPin, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts: { method?: string; body?: any } = {}) {
  const { body, ...rest } = opts;
  const r = await fetch(`${API}${path}`, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    ...rest,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "#6B7280", bg: "#F3F4F6" },
  sent:      { label: "Sent",      color: "#1D4ED8", bg: "#DBEAFE" },
  accepted:  { label: "Accepted",  color: "#15803D", bg: "#DCFCE7" },
  booked:    { label: "Converted", color: "#5B9BD5", bg: "#EFF6FF" },
  expired:   { label: "Expired",   color: "#DC2626", bg: "#FEE2E2" },
};

function fmt(d?: string | null) {
  if (!d) return null;
  try { return format(new Date(d), "MMM d, yyyy h:mm a"); } catch { return d; }
}

export default function QuoteDetailPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/quotes/:id");
  const id = params?.id;
  const qc = useQueryClient();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => apiFetch(`/api/quotes/${id}`),
    enabled: Boolean(id),
  });

  const sendMutation = useMutation({
    mutationFn: () => apiFetch(`/api/quotes/${id}/send`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Quote marked as sent. Configure Resend API to enable email delivery.");
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: () => toast.error("Failed to send quote"),
  });

  const acceptMutation = useMutation({
    mutationFn: () => apiFetch(`/api/quotes/${id}/accept`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Quote marked as accepted");
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: () => toast.error("Failed to mark accepted"),
  });

  const convertMutation = useMutation({
    mutationFn: () => apiFetch(`/api/quotes/${id}/convert`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Quote converted. Go to Jobs to complete setup.");
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      navigate("/jobs");
    },
    onError: () => toast.error("Failed to convert quote"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/quotes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Quote deleted");
      navigate("/quotes");
    },
    onError: () => toast.error("Failed to delete quote"),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-[#F0EDE8] rounded animate-pulse mb-4" />
          <div className="h-64 bg-[#F0EDE8] rounded animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!quote) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto text-center py-20">
          <p className="text-[#6B7280]">Quote not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/quotes")}>Back to Quotes</Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft;
  const clientName = quote.client_name || quote.lead_name || "No client";
  const addons: { name: string; price: number }[] = Array.isArray(quote.addons) ? quote.addons : [];

  const timelineEvents = [
    { label: "Created", date: quote.created_at, always: true },
    { label: "Sent", date: quote.sent_at, always: false },
    { label: "Accepted", date: quote.accepted_at, always: false },
    { label: "Converted", date: quote.booked_at, always: false },
    { label: "Expires", date: quote.expires_at, always: false, future: true },
  ].filter(e => e.always || e.date);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")} className="gap-1.5 text-[#6B7280]">
            <ArrowLeft className="w-4 h-4" /> Quotes
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#1A1917]">Quote #{quote.id}</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-[#6B7280]">
              {clientName} {quote.scope_name ? `· ${quote.scope_name}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {quote.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/quotes/${id}/edit`)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            {(quote.status === "draft" || quote.status === "sent") && (
              <Button
                size="sm"
                className="gap-1.5 bg-[#5B9BD5] hover:bg-[#4a8ac4] text-white"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
              >
                <SendHorizonal className="w-3.5 h-3.5" />
                {quote.status === "sent" ? "Resend" : "Send Quote"}
              </Button>
            )}
            {quote.status === "sent" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-green-500 text-green-700 hover:bg-green-50"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark Accepted
              </Button>
            )}
            {(quote.status === "accepted" || quote.status === "sent") && (
              <Button
                size="sm"
                className="gap-1.5 bg-[#1A1917] hover:bg-[#333] text-white"
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
              >
                <Briefcase className="w-3.5 h-3.5" /> Convert to Job
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Quote #{quote.id}?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => deleteMutation.mutate()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-[#E5E2DC] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#1A1917] mb-4">Timeline</h2>
          <div className="flex items-center gap-0">
            {timelineEvents.map((ev, i) => (
              <div key={ev.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      backgroundColor: ev.date && !ev.future ? "var(--brand)" : "#E5E2DC",
                      borderColor: ev.date && !ev.future ? "var(--brand)" : "#D1D5DB",
                    }}
                  />
                  <div className="text-xs font-medium text-[#6B7280] mt-1 whitespace-nowrap">{ev.label}</div>
                  {ev.date && (
                    <div className="text-xs text-[#9E9B94] mt-0.5 whitespace-nowrap">{fmt(ev.date)}</div>
                  )}
                </div>
                {i < timelineEvents.length - 1 && (
                  <div className="h-0.5 w-16 bg-[#E5E2DC] mx-1 mb-5" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Client Details */}
          <div className="bg-white border border-[#E5E2DC] rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2">
              <User className="w-4 h-4 text-[#9E9B94]" /> Client
            </h2>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-[#1A1917]">{clientName}</p>
              {(quote.client_email || quote.lead_email) && (
                <p className="text-sm text-[#6B7280]">{quote.client_email || quote.lead_email}</p>
              )}
              {(quote.client_phone || quote.lead_phone) && (
                <p className="text-sm text-[#6B7280]">{quote.client_phone || quote.lead_phone}</p>
              )}
              {quote.address && (
                <div className="flex items-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#9E9B94] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#6B7280]">{quote.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-white border border-[#E5E2DC] rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#9E9B94]" /> Service
            </h2>
            <div className="space-y-1.5">
              {quote.scope_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Scope</span>
                  <span className="text-[#1A1917] font-medium">{quote.scope_name}</span>
                </div>
              )}
              {quote.frequency && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Frequency</span>
                  <span className="text-[#1A1917]">{quote.frequency}</span>
                </div>
              )}
              {quote.service_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Service Date</span>
                  <span className="text-[#1A1917]">{fmt(quote.service_date)}</span>
                </div>
              )}
              {quote.sqft && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Sq Ft</span>
                  <span className="text-[#1A1917]">{quote.sqft}</span>
                </div>
              )}
              {quote.bedrooms != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Bedrooms</span>
                  <span className="text-[#1A1917]">{quote.bedrooms}bd / {quote.bathrooms ?? 0}ba</span>
                </div>
              )}
              {quote.dirt_level > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Dirt Level</span>
                  <span className="text-[#1A1917]">{["", "Standard", "Slightly Dirty", "Very Dirty"][quote.dirt_level]}</span>
                </div>
              )}
              {quote.estimated_hours && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Est. Hours</span>
                  <span className="text-[#1A1917]">{parseFloat(quote.estimated_hours).toFixed(1)}h</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border border-[#E5E2DC] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#1A1917] mb-4">Pricing</h2>
          <div className="space-y-2">
            {quote.base_price && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">Base Price</span>
                <span className="text-[#1A1917]">${parseFloat(quote.base_price).toFixed(2)}</span>
              </div>
            )}
            {addons.length > 0 && addons.map((a, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-[#6B7280]">{a.name}</span>
                <span className="text-[#1A1917]">+${a.price.toFixed(2)}</span>
              </div>
            ))}
            {quote.discount_amount && parseFloat(quote.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount{quote.discount_code ? ` (${quote.discount_code})` : ""}</span>
                <span>-${parseFloat(quote.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-[#E5E2DC] pt-2 flex justify-between items-baseline">
              <span className="text-sm text-[#6B7280]">Total</span>
              <span className="text-2xl font-bold text-[#1A1917]">
                ${parseFloat(quote.total_price || quote.base_price || "0").toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {(quote.notes || quote.internal_memo) && (
          <div className="bg-white border border-[#E5E2DC] rounded-lg p-5 space-y-4">
            {quote.notes && (
              <div>
                <p className="text-sm font-semibold text-[#1A1917] mb-1">Client Notes</p>
                <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
            {quote.internal_memo && (
              <div>
                <p className="text-sm font-semibold text-[#1A1917] mb-1">Internal Memo</p>
                <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{quote.internal_memo}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
