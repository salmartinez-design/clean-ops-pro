import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string, opts?: RequestInit) {
  const token = useAuthStore.getState().token;
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
}

function formatTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatServiceType(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type TimeclockEntry = {
  id: number;
  job_id: number;
  clock_in_at: string;
  clock_out_at: string | null;
  distance_from_job_ft: number | null;
  flagged: boolean;
};

type Job = {
  id: number;
  client_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  client_notes: string | null;
  service_type: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  base_fee: number;
  before_photo_count: number;
  after_photo_count: number;
  time_clock_entry: TimeclockEntry | null;
};

function ElapsedTimer({ clockInAt }: { clockInAt: string }) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(clockInAt).getTime());
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(clockInAt).getTime()), 1000);
    return () => clearInterval(id);
  }, [clockInAt]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatDuration(elapsed)}</span>;
}

function PhotoGrid({ jobId, type, photos, onUploaded }: {
  jobId: number; type: "before" | "after"; photos: string[]; onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ variant: "destructive", title: "File too large", description: "Max 10MB" }); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast({ variant: "destructive", title: "Invalid file type" }); return; }
    setUploading(true);
    try {
      const data_url = await fileToBase64(file);
      const res = await apiFetch(`/jobs/${jobId}/photos`, {
        method: "POST",
        body: JSON.stringify({ photo_type: type, data_url }),
      });
      if (!res.ok) throw new Error("Upload failed");
      onUploaded();
      toast({ title: `${type === "before" ? "Before" : "After"} photo added` });
    } catch {
      toast({ variant: "destructive", title: "Upload failed" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#1A1917", margin: "14px 0 8px" }}>
        {type === "before" ? "Before" : "After"} Photos
        <span style={{ fontWeight: 400, color: "#9E9B94", marginLeft: 6 }}>({photos.length})</span>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 72px)", gap: 8 }}>
        {photos.map((url, i) => (
          <img key={i} src={url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #EEECE7" }} />
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ width: 72, height: 72, border: "1.5px dashed #DEDAD4", borderRadius: 8, backgroundColor: "#F7F6F3", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, color: "#9E9B94", flexShrink: 0 }}
        >
          {uploading ? "…" : "+"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFile} />
      </div>
    </div>
  );
}

function JobCard({ job, onRefresh }: { job: Job; onRefresh: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [geoLoading, setGeoLoading] = useState(false);
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);

  const entry = job.time_clock_entry;
  const isClockedIn = entry && !entry.clock_out_at;
  const isComplete = job.status === "complete" || (entry && entry.clock_out_at);

  const loadPhotos = useCallback(async () => {
    const res = await apiFetch(`/jobs/${job.id}/photos`);
    if (res.ok) {
      const d = await res.json();
      setPhotosBefore((d.data || []).filter((p: any) => p.photo_type === "before").map((p: any) => p.url));
      setPhotosAfter((d.data || []).filter((p: any) => p.photo_type === "after").map((p: any) => p.url));
    }
  }, [job.id]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const clockInMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const res = await apiFetch("/timeclock/clock-in", {
        method: "POST",
        body: JSON.stringify({ job_id: job.id, lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Clock in failed");
      return data;
    },
    onSuccess: (data) => {
      if (data.flagged) {
        toast({ title: "Clocked in — out of zone", description: `${Math.round(data.distance_from_job_ft || 0)} ft from job site`, variant: "destructive" });
      } else {
        toast({ title: "Clocked in", description: data.distance_from_job_ft ? `${Math.round(data.distance_from_job_ft)} ft from job` : "Location recorded" });
      }
      onRefresh();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Clock in failed", description: e.message }),
  });

  const clockOutMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const res = await apiFetch(`/timeclock/${entry!.id}/clock-out`, {
        method: "POST",
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "PHOTOS_REQUIRED") throw new Error("PHOTOS_REQUIRED");
        throw new Error(data.message || "Clock out failed");
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "Job complete!", description: "Clock out recorded." });
      onRefresh();
    },
    onError: (e: Error) => {
      if (e.message === "PHOTOS_REQUIRED") {
        toast({ variant: "destructive", title: "After photo required", description: "Upload at least 1 after photo first" });
      } else {
        toast({ variant: "destructive", title: "Clock out failed", description: e.message });
      }
    },
  });

  const getLocation = (cb: (lat: number, lng: number) => void) => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoLoading(false); cb(pos.coords.latitude, pos.coords.longitude); },
      () => { setGeoLoading(false); toast({ variant: "destructive", title: "Location unavailable", description: "Please enable location access" }); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    scheduled: { bg: "#DBEAFE", color: "#1E40AF" },
    in_progress: { bg: "#FEF3C7", color: "#92400E" },
    complete: { bg: "#DCFCE7", color: "#166534" },
    cancelled: { bg: "#F3F4F6", color: "#6B7280" },
  };
  const sc = statusColors[job.status] || statusColors.scheduled;

  return (
    <div style={{
      backgroundColor: "#FFFFFF", border: "1px solid #E5E2DC",
      borderLeft: `3px solid var(--brand)`, borderRadius: 12,
      padding: 18, margin: "0 0 12px 0",
      opacity: job.status === "cancelled" ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, backgroundColor: sc.bg, color: sc.color, textTransform: "capitalize" }}>
          {job.status.replace("_", " ")}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#1A1917" }}>${job.base_fee.toFixed(2)}</span>
      </div>

      <p style={{ fontSize: 18, fontWeight: 700, color: "#1A1917", margin: "10px 0 4px" }}>{job.client_name}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
        {formatServiceType(job.service_type)}
      </p>
      {job.scheduled_time && (
        <p style={{ fontSize: 12, color: "#6B6860", margin: "0 0 2px" }}>⏰ {formatTime(job.scheduled_time)}</p>
      )}
      {job.address && (
        <p style={{ fontSize: 12, color: "#6B6860", margin: 0 }}>
          📍 {job.address}{job.city ? `, ${job.city}` : ""}
        </p>
      )}

      {job.client_notes && (
        <div style={{ backgroundColor: "#F7F6F3", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#9E9B94", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Client Notes</p>
          <p style={{ fontSize: 12, color: "#1A1917", margin: 0 }}>{job.client_notes}</p>
        </div>
      )}

      <PhotoGrid jobId={job.id} type="before" photos={photosBefore} onUploaded={loadPhotos} />
      <PhotoGrid jobId={job.id} type="after" photos={photosAfter} onUploaded={loadPhotos} />

      {isClockedIn && photosAfter.length === 0 && (
        <div style={{ backgroundColor: "#FEF3C7", borderLeft: "3px solid #F59E0B", borderRadius: "0 6px 6px 0", padding: "10px 12px", marginTop: 12 }}>
          <p style={{ fontSize: 12, color: "#92400E", margin: 0 }}>After photos required before clock-out</p>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {isComplete ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>✓</div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1A1917", margin: "0 0 4px" }}>Job Complete</p>
            {entry?.clock_in_at && entry?.clock_out_at && (
              <p style={{ fontSize: 14, color: "#6B6860", margin: 0 }}>
                Duration: {formatDuration(new Date(entry.clock_out_at).getTime() - new Date(entry.clock_in_at).getTime())}
              </p>
            )}
          </div>
        ) : isClockedIn ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#1A1917", marginBottom: 2 }}>
              <ElapsedTimer clockInAt={entry!.clock_in_at} />
            </div>
            <p style={{ fontSize: 11, color: "#9E9B94", margin: "0 0 12px" }}>Time on job</p>
            <button
              onClick={() => {
                if (photosAfter.length === 0) {
                  toast({ variant: "destructive", title: "After photo required", description: "Upload at least 1 after photo first" });
                  return;
                }
                getLocation((lat, lng) => clockOutMutation.mutate({ lat, lng }));
              }}
              disabled={clockOutMutation.isPending || geoLoading}
              style={{
                width: "100%", height: 48, borderRadius: 10, border: "none",
                fontSize: 15, fontWeight: 600, cursor: photosAfter.length === 0 ? "not-allowed" : "pointer",
                backgroundColor: photosAfter.length === 0 ? "#F3F4F6" : "#166534",
                color: photosAfter.length === 0 ? "#9E9B94" : "#FFFFFF",
                transition: "opacity 0.15s",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {clockOutMutation.isPending || geoLoading ? "Getting location…" : photosAfter.length === 0 ? "Clock Out — add after photo first" : "Clock Out"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => getLocation((lat, lng) => clockInMutation.mutate({ lat, lng }))}
            disabled={clockInMutation.isPending || geoLoading}
            style={{
              width: "100%", height: 48, backgroundColor: "var(--brand)", color: "#FFFFFF",
              borderRadius: 10, border: "none", fontSize: 15, fontWeight: 600,
              cursor: "pointer", opacity: (clockInMutation.isPending || geoLoading) ? 0.7 : 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {clockInMutation.isPending || geoLoading ? "Getting location…" : "Clock In"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyJobsPage() {
  const token = useAuthStore(state => state.token);
  const qc = useQueryClient();

  let userInfo: { firstName: string; lastName: string } | null = null;
  if (token) {
    try {
      const p = JSON.parse(atob(token.split(".")[1]));
      userInfo = { firstName: p.first_name || "", lastName: p.last_name || "" };
    } catch { /* empty */ }
  }
  const initials = userInfo ? `${userInfo.firstName[0] || ""}${userInfo.lastName[0] || ""}`.toUpperCase() : "?";

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-jobs"],
    queryFn: async () => {
      const res = await apiFetch("/jobs/my-jobs");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const jobs: Job[] = data?.data || [];
  const activeJobs = jobs.filter(j => j.status !== "cancelled" && (!j.time_clock_entry || !j.time_clock_entry.clock_out_at || j.status !== "complete"));
  const upcomingJobs = jobs.filter(j => j.status === "scheduled" && !j.time_clock_entry);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F7F6F3", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        {/* Sticky Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E2DC",
          padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--brand-dim)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
            {initials}
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1917" }}>My Jobs</span>
          <span style={{ fontSize: 12, color: "#6B6860" }}>{today}</span>
        </div>

        <div style={{ padding: "16px 14px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9E9B94", fontSize: 14 }}>Loading your jobs…</div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧹</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#1A1917", margin: "0 0 6px" }}>No jobs today</p>
              <p style={{ fontSize: 13, color: "#9E9B94", margin: 0 }}>Check back or contact your manager</p>
            </div>
          ) : (
            <>
              {activeJobs.map(job => (
                <JobCard key={job.id} job={job} onRefresh={refetch} />
              ))}
              {upcomingJobs.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 11, color: "#9E9B94", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px 4px" }}>Up Next</p>
                  {upcomingJobs.map(job => (
                    <div key={job.id} style={{ opacity: 0.55, backgroundColor: "#FFFFFF", border: "1px solid #E5E2DC", borderLeft: "3px solid var(--brand)", borderRadius: 12, padding: 18, marginBottom: 10 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#1A1917", margin: "0 0 4px" }}>{job.client_name}</p>
                      <p style={{ fontSize: 11, color: "var(--brand)", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>{formatServiceType(job.service_type)}</p>
                      {job.scheduled_time && <p style={{ fontSize: 12, color: "#6B6860", margin: 0 }}>⏰ {formatTime(job.scheduled_time)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
