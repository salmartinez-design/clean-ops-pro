import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListJobs, ListJobsStatus, useCreateJob } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Clock, MapPin, Camera } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

const FREQ_COLORS: Record<string, string> = {
  weekly:    'var(--brand)',
  biweekly:  '#3B82F6',
  triweekly: '#F59E0B',
  monthly:   '#8B5CF6',
  on_demand: '#C0BDB6',
};

const createJobSchema = z.object({
  client_id:      z.coerce.number().min(1, "Client is required"),
  service_type:   z.enum(["standard_clean", "deep_clean", "move_out", "recurring_maintenance", "post_construction"]),
  scheduled_date: z.string().min(1, "Date is required"),
  frequency:      z.enum(["weekly", "biweekly", "monthly", "on_demand"]),
  base_fee:       z.coerce.number().min(0),
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '8px', padding: '4px' }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: isActive ? 600 : 400, border: 'none',
                    backgroundColor: isActive ? 'var(--brand)' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#6B7280',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#1A1917'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#6B7280'; }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9E9B94', pointerEvents: 'none' }} />
              <input
                placeholder="Search jobs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', paddingRight: '12px', height: '36px', width: '220px', backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', borderRadius: '8px', color: '#1A1917', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <CreateJobDialog />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: '200px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', border: '1px dashed #E5E2DC', borderRadius: '10px' }}>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#1A1917', margin: '0 0 6px 0' }}>No jobs found</p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Try adjusting your filters.</p>
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
  const freqColor = FREQ_COLORS[job.frequency] || '#C0BDB6';
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E2DC',
        borderLeft: `3px solid ${freqColor}`,
        borderRadius: '10px',
        padding: '18px',
        cursor: 'pointer',
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderTopColor = 'rgba(var(--brand-rgb), 0.4)';
        e.currentTarget.style.borderRightColor = 'rgba(var(--brand-rgb), 0.4)';
        e.currentTarget.style.borderBottomColor = 'rgba(var(--brand-rgb), 0.4)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderTopColor = '#E5E2DC';
        e.currentTarget.style.borderRightColor = '#E5E2DC';
        e.currentTarget.style.borderBottomColor = '#E5E2DC';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top row: status + price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatusBadge status={job.status} />
        <span style={{ fontSize: '20px', fontWeight: 700, color: '#1A1917' }}>${job.base_fee}</span>
      </div>

      {/* Client + service */}
      <p style={{ fontSize: '17px', fontWeight: 700, color: '#1A1917', margin: '10px 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {job.client_name}
      </p>
      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>
        {job.service_type?.replace(/_/g, ' ')}
      </p>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
          <Clock size={12} strokeWidth={1.5} />
          <span style={{ fontSize: '12px' }}>{new Date(job.scheduled_date).toLocaleDateString()}{job.scheduled_time ? ` · ${job.scheduled_time}` : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
          <MapPin size={12} strokeWidth={1.5} />
          <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{job.frequency?.replace('_', ' ')} cleaning</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #EEECE7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--brand-dim)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
            {job.assigned_user_name ? job.assigned_user_name[0] : '?'}
          </div>
          <span style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
            {job.assigned_user_name || 'Unassigned'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9E9B94' }}>
          <Camera size={11} strokeWidth={1.5} />
          <span style={{ fontSize: '11px' }}>{job.before_photo_count}B / {job.after_photo_count}A</span>
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

  const LABEL: React.CSSProperties = { fontSize: '11px', fontWeight: 500, color: '#9E9B94', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--brand)', color: '#FFFFFF', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          <Plus size={14} strokeWidth={2} /> New Job
        </button>
      </DialogTrigger>
      <DialogContent style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DC', maxWidth: '500px' }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: '15px', fontWeight: 600, color: '#1A1917' }}>Schedule New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={LABEL}>Client ID</label>
              <Input type="number" style={{ backgroundColor: '#F7F6F3', borderColor: '#DEDAD4', fontSize: '13px', color: '#1A1917' }} {...register("client_id")} />
              {errors.client_id && <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>{errors.client_id.message}</p>}
            </div>
            <div>
              <label style={LABEL}>Base Fee ($)</label>
              <Input type="number" style={{ backgroundColor: '#F7F6F3', borderColor: '#DEDAD4', fontSize: '13px', color: '#1A1917' }} {...register("base_fee")} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={LABEL}>Service Type</label>
              <Controller name="service_type" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger style={{ backgroundColor: '#F7F6F3', borderColor: '#DEDAD4', color: '#1A1917', fontSize: '13px' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E2DC' }}>
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
              <label style={LABEL}>Frequency</label>
              <Controller name="frequency" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger style={{ backgroundColor: '#F7F6F3', borderColor: '#DEDAD4', color: '#1A1917', fontSize: '13px' }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E2DC' }}>
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
            <label style={LABEL}>Date</label>
            <Input type="date" style={{ backgroundColor: '#F7F6F3', borderColor: '#DEDAD4', fontSize: '13px', color: '#1A1917' }} {...register("scheduled_date")} />
          </div>
          <DialogFooter style={{ paddingTop: '8px' }}>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: '8px 16px', border: '1px solid #E5E2DC', borderRadius: '8px', backgroundColor: 'transparent', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={createJob.isPending} style={{ padding: '8px 20px', backgroundColor: 'var(--brand)', color: '#FFFFFF', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: createJob.isPending ? 0.7 : 1 }}>
              {createJob.isPending ? "Creating..." : "Schedule Job"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
