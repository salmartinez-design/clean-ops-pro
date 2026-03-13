import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListJobs, ListJobsStatus, useCreateJob, useListClients } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Clock, MapPin, Camera } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

const FREQ_COLORS: Record<string, string> = {
  weekly: 'var(--tenant-color)',
  biweekly: '#378ADD',
  triweekly: '#EF9F27',
  monthly: '#AB47BC',
  on_demand: '#888780',
};

const STATUS_BOTTOM: Record<string, string> = {
  in_progress: '#EF9F27',
  complete: '#3B6D11',
  scheduled: '#252525',
  cancelled: '#888780',
};

const createJobSchema = z.object({
  client_id: z.coerce.number().min(1, "Client is required"),
  service_type: z.enum(["standard_clean", "deep_clean", "move_out", "recurring_maintenance", "post_construction"]),
  scheduled_date: z.string().min(1, "Date is required"),
  frequency: z.enum(["weekly", "biweekly", "monthly", "on_demand"]),
  base_fee: z.coerce.number().min(0),
});

type TabId = ListJobsStatus | 'all';

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useListJobs(
    activeTab !== 'all' ? { status: activeTab } : {},
    { request: { headers: getAuthHeaders() } }
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All Jobs' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'complete', label: 'Completed' },
  ];

  const jobs = (data?.data || []).filter(j =>
    !search || j.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '42px', color: '#E8E0D0', margin: 0, lineHeight: 1.1 }}>Jobs</h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 300, fontSize: '13px', color: '#888780', marginTop: '6px' }}>Manage scheduled and active cleanings.</p>
          </div>
          <CreateJobDialog />
        </div>

        {/* Tabs + Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 300,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: activeTab === tab.id ? 'none' : '1px solid #252525',
                  backgroundColor: activeTab === tab.id ? 'var(--tenant-color)' : 'transparent',
                  color: activeTab === tab.id ? '#0D0D0D' : '#888780',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888780' }} />
            <input
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', paddingRight: '12px', height: '36px', backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '6px', color: '#E8E0D0', fontSize: '12px', fontFamily: "'DM Mono', monospace", width: '220px', outline: 'none' }}
            />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: '200px', borderRadius: '10px', backgroundColor: '#161616', border: '1px solid #252525', animation: 'pulse 1.5s ease infinite' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', border: '1px dashed #252525', borderRadius: '10px' }}>
            <p style={{ fontSize: '16px', fontFamily: "'Playfair Display', serif", color: '#E8E0D0', marginBottom: '8px' }}>No jobs found</p>
            <p style={{ fontSize: '13px', fontFamily: "'DM Mono', monospace", color: '#888780' }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function JobCard({ job }: { job: any }) {
  const freqColor = FREQ_COLORS[job.frequency] || '#888780';
  const statusColor = STATUS_BOTTOM[job.status] || '#252525';

  return (
    <div style={{
      backgroundColor: '#161616',
      border: '1px solid #252525',
      borderLeft: `3px solid ${freqColor}`,
      borderBottom: `3px solid ${statusColor}`,
      borderRadius: '10px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'border-color 0.15s',
    }}
      className="hover:[border-color:var(--tenant-color)]"
      onMouseEnter={e => (e.currentTarget.style.borderTopColor = 'rgba(var(--tenant-color-rgb), 0.3)')}
      onMouseLeave={e => (e.currentTarget.style.borderTopColor = '#252525')}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <StatusBadge status={job.status} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '20px', color: '#E8E0D0' }}>
          ${job.base_fee}
        </span>
      </div>

      {/* Client + Service */}
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '18px', color: '#E8E0D0', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.client_name}</h3>
      <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: '11px', color: 'var(--tenant-color)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>
        {job.service_type.replace(/_/g, ' ')}
      </p>

      {/* Time + Address */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888780' }}>
          <Clock size={12} strokeWidth={1.5} />
          <span style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", fontWeight: 300 }}>
            {new Date(job.scheduled_date).toLocaleDateString()} {job.scheduled_time ? `· ${job.scheduled_time}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888780' }}>
          <MapPin size={12} strokeWidth={1.5} />
          <span style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", fontWeight: 300 }}>
            {job.frequency?.replace('_', ' ')} cleaning
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #252525' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(var(--tenant-color-rgb), 0.20)', color: 'var(--tenant-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontFamily: "'DM Mono', monospace", fontWeight: 400, flexShrink: 0 }}>
            {job.assigned_user_name ? job.assigned_user_name[0] : '?'}
          </div>
          <span style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", color: '#888780', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.assigned_user_name || 'Unassigned'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#555550' }}>
          <Camera size={11} strokeWidth={1.5} />
          <span style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>{job.before_photo_count}B / {job.after_photo_count}A</span>
        </div>
      </div>
    </div>
  );
}

function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createJob = useCreateJob({ request: { headers: getAuthHeaders() } });

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<z.infer<typeof createJobSchema>>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { frequency: "on_demand", service_type: "standard_clean" }
  });

  const onSubmit = (data: z.infer<typeof createJobSchema>) => {
    createJob.mutate({ data: data as any }, {
      onSuccess: () => {
        toast({ title: "Job Created", description: "The job has been scheduled successfully." });
        queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        setOpen(false);
        reset();
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to create job." });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', backgroundColor: 'var(--tenant-color)', color: '#0D0D0D', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, border: 'none', cursor: 'pointer' }}>
          <Plus size={15} strokeWidth={2} /> New Job
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-[#161616] border-[#252525]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#E8E0D0' }}>Schedule New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Client ID</label>
              <Input type="number" style={{ backgroundColor: '#0D0D0D', borderColor: '#252525', fontFamily: "'DM Mono', monospace", fontSize: '13px' }} {...register("client_id")} />
              {errors.client_id && <p style={{ fontSize: '11px', color: '#FCEBEB', marginTop: '4px', fontFamily: "'DM Mono', monospace" }}>{errors.client_id.message}</p>}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Base Fee ($)</label>
              <Input type="number" style={{ backgroundColor: '#0D0D0D', borderColor: '#252525', fontFamily: "'DM Mono', monospace", fontSize: '13px' }} {...register("base_fee")} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Service Type</label>
              <Controller name="service_type" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="bg-[#0D0D0D] border-[#252525]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_clean">Standard Clean</SelectItem>
                    <SelectItem value="deep_clean">Deep Clean</SelectItem>
                    <SelectItem value="move_out">Move Out</SelectItem>
                    <SelectItem value="recurring_maintenance">Recurring</SelectItem>
                    <SelectItem value="post_construction">Post Construction</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Frequency</label>
              <Controller name="frequency" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="bg-[#0D0D0D] border-[#252525]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="on_demand">On Demand</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#888780', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Date</label>
            <Input type="date" style={{ backgroundColor: '#0D0D0D', borderColor: '#252525', fontFamily: "'DM Mono', monospace", fontSize: '13px' }} {...register("scheduled_date")} />
          </div>
          <DialogFooter style={{ paddingTop: '8px' }}>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: '8px 16px', border: '1px solid #252525', borderRadius: '6px', backgroundColor: 'transparent', color: '#888780', fontSize: '13px', fontFamily: "'DM Mono', monospace", cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={createJob.isPending} style={{ padding: '8px 18px', backgroundColor: 'var(--tenant-color)', color: '#0D0D0D', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Mono', monospace", fontWeight: 400, border: 'none', cursor: 'pointer', opacity: createJob.isPending ? 0.7 : 1 }}>
              {createJob.isPending ? "Creating..." : "Schedule Job"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
