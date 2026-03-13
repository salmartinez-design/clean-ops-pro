import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListJobs, ListJobsStatus, useCreateJob } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Clock } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

const createJobSchema = z.object({
  client_id: z.coerce.number().min(1, "Client is required"),
  service_type: z.enum(["standard_clean", "deep_clean", "move_out"]),
  scheduled_date: z.string().min(1, "Date is required"),
  frequency: z.enum(["weekly", "biweekly", "monthly", "on_demand"]),
  base_fee: z.coerce.number().min(0),
});

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<ListJobsStatus | 'all'>('all');
  const { data, isLoading } = useListJobs(
    activeTab !== 'all' ? { status: activeTab } : {},
    { request: { headers: getAuthHeaders() } }
  );

  const tabs = [
    { id: 'all', label: 'All Jobs' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'complete', label: 'Completed' },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold">Job Dispatch</h1>
            <p className="text-muted-foreground mt-1">Manage scheduled and active cleanings.</p>
          </div>
          <CreateJobDialog />
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-card p-2 rounded-xl border border-border">
          <div className="flex space-x-1 p-1 bg-background rounded-lg border border-border w-full sm:w-auto overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 bg-background border-border h-10" placeholder="Search jobs..." />
          </div>
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-xl bg-card animate-pulse border border-border"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.data?.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
            {!data?.data?.length && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold">No jobs found</h3>
                <p className="text-muted-foreground">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function JobCard({ job }: { job: any }) {
  // Determine left border accent based on frequency
  let borderAccent = "border-l-border";
  if (job.frequency === 'weekly') borderAccent = "border-l-primary";
  if (job.frequency === 'biweekly') borderAccent = "border-l-secondary";
  if (job.frequency === 'monthly') borderAccent = "border-l-[#3C3489]";

  return (
    <Card className={`p-0 overflow-hidden hover-elevate transition-all border-l-4 ${borderAccent}`}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <StatusBadge status={job.status} />
          <span className="text-lg font-bold font-display text-white">${job.base_fee}</span>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-1 truncate">{job.client_name}</h3>
        <p className="text-sm text-primary font-bold mb-4 uppercase tracking-wider">{job.service_type.replace('_', ' ')}</p>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 opacity-70" />
            <span>{new Date(job.scheduled_date).toLocaleDateString()} {job.scheduled_time && `• ${job.scheduled_time}`}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2 opacity-70" />
            <span className="truncate">View address in details</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-[10px] font-bold text-secondary">
              {job.assigned_user_name ? job.assigned_user_name[0] : '?'}
            </div>
            <span className="text-xs font-semibold text-muted-foreground truncate w-24">
              {job.assigned_user_name || 'Unassigned'}
            </span>
          </div>
          <div className="flex gap-1 text-xs font-mono bg-background px-2 py-1 rounded border border-border">
            <span className="text-status-success">{job.before_photo_count}B</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-status-success">{job.after_photo_count}A</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createJob = useCreateJob({ request: { headers: getAuthHeaders() } });

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<z.infer<typeof createJobSchema>>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      frequency: "on_demand",
      service_type: "standard_clean"
    }
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
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Schedule New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input type="number" className="bg-background border-border" {...register("client_id")} />
              {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Base Fee ($)</Label>
              <Input type="number" className="bg-background border-border" {...register("base_fee")} />
              {errors.base_fee && <p className="text-xs text-destructive">{errors.base_fee.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Controller
                name="service_type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard_clean">Standard Clean</SelectItem>
                      <SelectItem value="deep_clean">Deep Clean</SelectItem>
                      <SelectItem value="move_out">Move Out</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="on_demand">On Demand</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" className="bg-background border-border" {...register("scheduled_date")} />
            {errors.scheduled_date && <p className="text-xs text-destructive">{errors.scheduled_date.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border">Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={createJob.isPending}>
              {createJob.isPending ? "Creating..." : "Schedule Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
