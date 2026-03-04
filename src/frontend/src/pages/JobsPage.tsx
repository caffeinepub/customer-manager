import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Briefcase, CalendarDays, List, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Address, Customer, Job } from "../backend.d.ts";
import { JobCalendar, type JobEntry } from "../components/JobCalendar";
import { JobDetailSheet } from "../components/JobDetailSheet";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActor } from "../hooks/useActor";
import {
  dateToNs,
  formatCurrency,
  formatDate,
  useAddJob,
  useAddressesByCustomer,
  useCustomers,
  useUpdateJob,
} from "../hooks/useQueries";

interface Props {
  navigate: (p: Page) => void;
}

// ─── Global jobs loader ───────────────────────────────────────
function useAllJobs(customers: Customer[]) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["all-jobs", customers.map((c) => c.id)],
    queryFn: async () => {
      if (!actor || customers.length === 0) return [];
      // For each customer, get their addresses, then jobs per address
      const allJobs: Array<{
        job: Job;
        customer: Customer;
        address?: Address;
      }> = [];
      await Promise.all(
        customers.map(async (customer) => {
          const addresses = await actor.listAddressesByCustomer(customer.id);
          await Promise.all(
            addresses.map(async (addr) => {
              const jobs = await actor.getJobsByAddress(addr.id);
              for (const job of jobs) {
                allJobs.push({ job, customer, address: addr });
              }
            }),
          );
        }),
      );
      return allJobs;
    },
    enabled: !!actor && !isFetching && customers.length > 0,
    staleTime: 30_000,
  });
}

// ─── Date formatter for datetime-local input ──────────────────
function toDatetimeLocal(date: Date): string {
  // Format as "YYYY-MM-DDTHH:mm" required by datetime-local
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

// ─── Add Job Dialog ───────────────────────────────────────────
function AddJobDialog({
  open,
  onClose,
  customers,
  defaultStartDate,
  defaultEndDate,
}: {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}) {
  const addJob = useAddJob();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const { data: addresses = [] } = useAddressesByCustomer(selectedCustomerId);
  const [form, setForm] = useState({
    addressId: "",
    status: "scheduled",
    cost: "",
    notes: "",
    startDate: defaultStartDate ? toDatetimeLocal(defaultStartDate) : "",
    endDate: defaultEndDate ? toDatetimeLocal(defaultEndDate) : "",
  });

  // When dialog opens with new default dates, reset and pre-fill the form
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on open
  useMemo(() => {
    if (open) {
      setForm({
        addressId: "",
        status: "scheduled",
        cost: "",
        notes: "",
        startDate: defaultStartDate ? toDatetimeLocal(defaultStartDate) : "",
        endDate: defaultEndDate ? toDatetimeLocal(defaultEndDate) : "",
      });
      setSelectedCustomerId("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!form.addressId) {
      toast.error("Please select an address");
      return;
    }
    const now = new Date();
    const start = form.startDate ? new Date(form.startDate) : now;
    const end = form.endDate ? new Date(form.endDate) : now;

    const job: Job = {
      id: crypto.randomUUID(),
      customerId: selectedCustomerId,
      addressId: form.addressId,
      serviceId: crypto.randomUUID(),
      status: form.status,
      cost: Number.parseFloat(form.cost) || 0,
      isActive: true,
      startTime: dateToNs(start),
      endTime: dateToNs(end),
      notes: form.notes.trim() || undefined,
    };
    try {
      await addJob.mutateAsync(job);
      toast.success("Job added");
      setSelectedCustomerId("");
      setForm({
        addressId: "",
        status: "scheduled",
        cost: "",
        notes: "",
        startDate: "",
        endDate: "",
      });
      onClose();
    } catch {
      toast.error("Failed to add job");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="jobs.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select
              value={selectedCustomerId}
              onValueChange={(v) => {
                setSelectedCustomerId(v);
                setForm((f) => ({ ...f, addressId: "" }));
              }}
            >
              <SelectTrigger data-ocid="jobs.select">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Address *</Label>
            <Select
              value={form.addressId}
              onValueChange={(v) => setForm((f) => ({ ...f, addressId: v }))}
              disabled={!selectedCustomerId || addresses.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    addresses.length === 0
                      ? "No addresses available"
                      : "Select address…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {addresses.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.addressLabel} — {a.street}, {a.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "lead",
                  "scheduled",
                  "in_progress",
                  "completed",
                  "invoiced",
                  "paid",
                  "cancelled",
                ].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cost ($)</Label>
            <Input
              data-ocid="jobs.input"
              type="number"
              step="0.01"
              min="0"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="jobs.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="jobs.submit_button"
              disabled={addJob.isPending}
            >
              {addJob.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function JobsPage({ navigate }: Props) {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: allJobs = [], isLoading: jobsLoading } = useAllJobs(customers);
  const updateJob = useUpdateJob();
  const addJob = useAddJob();
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [slotStart, setSlotStart] = useState<Date | undefined>();
  const [slotEnd, setSlotEnd] = useState<Date | undefined>();

  // Job detail sheet state
  const [detailEntry, setDetailEntry] = useState<JobEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const isLoading = customersLoading || jobsLoading;

  const filtered = useMemo(() => {
    if (statusFilter === "all") return allJobs;
    return allJobs.filter((j) => j.job.status === statusFilter);
  }, [allJobs, statusFilter]);

  const statuses = [
    "all",
    "lead",
    "scheduled",
    "in_progress",
    "completed",
    "invoiced",
    "paid",
    "cancelled",
  ];

  function handleSelectSlot(start: Date, end: Date) {
    setSlotStart(start);
    setSlotEnd(end);
    setShowAdd(true);
  }

  function handleDialogClose() {
    setShowAdd(false);
    setSlotStart(undefined);
    setSlotEnd(undefined);
  }

  async function handleRescheduleJob(
    jobId: string,
    newStart: Date,
    newEnd: Date,
  ) {
    const entry = allJobs.find((j) => j.job.id === jobId);
    if (!entry) return;
    try {
      await updateJob.mutateAsync({
        ...entry.job,
        startTime: dateToNs(newStart),
        endTime: dateToNs(newEnd),
      });
      toast.success("Job rescheduled");
    } catch {
      toast.error("Failed to reschedule job");
    }
  }

  async function handleCopyJob(
    sourceEntry: JobEntry,
    newStart: Date,
    newEnd: Date,
  ) {
    const newJob: Job = {
      ...sourceEntry.job,
      id: crypto.randomUUID(),
      startTime: dateToNs(newStart),
      endTime: dateToNs(newEnd),
    };
    try {
      await addJob.mutateAsync(newJob);
      toast.success("Job copied successfully");
    } catch {
      toast.error("Failed to copy job");
    }
  }

  function handleRowClick(entry: JobEntry) {
    setDetailEntry(entry);
    setDetailOpen(true);
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Jobs"
        description={`${allJobs.length} total jobs`}
        action={
          <div className="flex items-center gap-2">
            {/* List / Calendar toggle */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                type="button"
                data-ocid="jobs.list_toggle"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-r border-border",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-accent/30",
                )}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
              <button
                type="button"
                data-ocid="jobs.calendar_toggle"
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-accent/30",
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Calendar
              </button>
            </div>

            <Button
              data-ocid="jobs.add_button"
              onClick={() => setShowAdd(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Job
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {viewMode === "list" && (
          <>
            {/* Status filter — only in list view */}
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  type="button"
                  key={s}
                  data-ocid={s === "all" ? "jobs.filter.tab" : undefined}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {s === "all" ? "All" : s.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Jobs list */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                data-ocid="jobs.empty_state"
                className="text-center py-16 text-muted-foreground"
              >
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  {statusFilter !== "all"
                    ? `No ${statusFilter.replace("_", " ")} jobs`
                    : "No jobs yet"}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden shadow-card">
                <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground border-b border-border">
                  <span className="col-span-3">Customer</span>
                  <span className="col-span-3">Address</span>
                  <span className="col-span-2">Dates</span>
                  <span className="col-span-2">Cost</span>
                  <span className="col-span-2">Status</span>
                </div>
                {filtered.map(({ job, customer, address }, idx) => (
                  <button
                    type="button"
                    key={job.id}
                    data-ocid={`jobs.item.${idx + 1}`}
                    onClick={() => handleRowClick({ job, customer, address })}
                    className="w-full px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0 text-left"
                  >
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-foreground truncate">
                        {customer.name}
                      </p>
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground truncate">
                      {address ? `${address.street}, ${address.city}` : "—"}
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(job.startTime)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(job.cost)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <StatusBadge status={job.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === "calendar" &&
          (isLoading ? (
            <Skeleton
              data-ocid="jobs.loading_state"
              className="h-[600px] w-full rounded-lg"
            />
          ) : (
            <JobCalendar
              jobs={allJobs}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={(entry) =>
                navigate({
                  view: "customer-detail",
                  customerId: entry.customer.id,
                })
              }
              onRescheduleJob={handleRescheduleJob}
              onCopyJob={handleCopyJob}
              navigate={navigate}
            />
          ))}
      </div>

      <AddJobDialog
        open={showAdd}
        onClose={handleDialogClose}
        customers={customers}
        defaultStartDate={slotStart}
        defaultEndDate={slotEnd}
      />

      {/* Job Detail Sheet */}
      <JobDetailSheet
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailEntry(null);
        }}
        jobEntry={detailEntry}
      />
    </div>
  );
}
