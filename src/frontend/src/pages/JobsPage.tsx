import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Briefcase,
  CalendarDays,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Address, Customer, Job } from "../backend.d.ts";
import { JobCalendar, type JobEntry } from "../components/JobCalendar";
import { JobDetailSheet } from "../components/JobDetailSheet";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActor } from "../hooks/useActor";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  dateToNs,
  formatCurrency,
  formatDate,
  useAddJob,
  useAddressesByCustomer,
  useCustomers,
  useUpdateJob,
} from "../hooks/useQueries";
import type { JobTemplate, RecurringJob } from "../types/local";

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

// ─── Recurring Job Dialog ────────────────────────────────────
function RecurringJobDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (r: RecurringJob) => void;
}) {
  const { data: customers = [] } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const { data: addresses = [] } = useAddressesByCustomer(selectedCustomer);
  const [form, setForm] = useState({
    addressId: "",
    title: "",
    description: "",
    frequency: "weekly" as RecurringJob["frequency"],
    dayOfWeek: 1,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  function f(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !form.addressId) {
      toast.error("Select a customer and address");
      return;
    }
    setSaving(true);
    const rj: RecurringJob = {
      id: crypto.randomUUID(),
      customerId: selectedCustomer,
      addressId: form.addressId,
      title: form.title.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      dayOfWeek: form.frequency === "weekly" ? form.dayOfWeek : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      isActive: true,
      nextOccurrence: form.startDate,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onSave(rj);
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="recurring.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Recurring Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select
              value={selectedCustomer}
              onValueChange={(v) => {
                setSelectedCustomer(v);
                f("addressId", "");
              }}
            >
              <SelectTrigger data-ocid="recurring.select">
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
              onValueChange={(v) => f("addressId", v)}
              disabled={!selectedCustomer}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select address…" />
              </SelectTrigger>
              <SelectContent>
                {addresses.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.addressLabel} — {a.street}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              data-ocid="recurring.input"
              required
              value={form.title}
              onChange={(e) => f("title", e.target.value)}
              placeholder="e.g., Monthly Lawn Maintenance"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => f("description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => f("frequency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["daily", "weekly", "biweekly", "monthly", "quarterly"].map(
                    (freq) => (
                      <SelectItem key={freq} value={freq}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {form.frequency === "weekly" && (
              <div className="space-y-1.5">
                <Label>Day of Week</Label>
                <Select
                  value={String(form.dayOfWeek)}
                  onValueChange={(v) => f("dayOfWeek", Number.parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ].map((day, i) => (
                      <SelectItem key={day} value={String(i)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => f("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => f("endDate", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="recurring.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-ocid="recurring.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Recurring Jobs Tab ───────────────────────────────────────
function RecurringJobsTab({ customers }: { customers: Customer[] }) {
  const [recurringJobs, setRecurringJobs] = useLocalStorage<RecurringJob[]>(
    "fp_recurring_jobs",
    [],
  );
  const addJob = useAddJob();
  const [showDialog, setShowDialog] = useState(false);

  function handleSave(rj: RecurringJob) {
    setRecurringJobs((prev) => [rj, ...prev]);
    toast.success("Recurring job added");
  }

  function toggleActive(id: string) {
    setRecurringJobs((prev) =>
      prev.map((rj) => (rj.id === id ? { ...rj, isActive: !rj.isActive } : rj)),
    );
  }

  function handleDelete(id: string) {
    setRecurringJobs((prev) => prev.filter((rj) => rj.id !== id));
    toast.success("Recurring job deleted");
  }

  async function generateJobNow(rj: RecurringJob) {
    try {
      const now = new Date();
      const nextDate = new Date(`${rj.nextOccurrence}T09:00:00`);
      const start = nextDate > now ? nextDate : now;
      await addJob.mutateAsync({
        id: crypto.randomUUID(),
        customerId: rj.customerId,
        addressId: rj.addressId,
        serviceId: crypto.randomUUID(),
        status: "scheduled",
        cost: 0,
        isActive: true,
        startTime: BigInt(start.getTime()) * 1_000_000n,
        endTime: BigInt(start.getTime()) * 1_000_000n,
        notes: rj.title,
      });
      toast.success("Job generated from recurring template!");
    } catch {
      toast.error("Failed to generate job");
    }
  }

  const FREQ_COLORS: Record<string, string> = {
    daily:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    weekly: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    biweekly:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    monthly:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    quarterly:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setShowDialog(true)}
          className="gap-1.5"
          data-ocid="recurring.primary_button"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Recurring Job
        </Button>
      </div>

      {recurringJobs.length === 0 ? (
        <div
          data-ocid="recurring.empty_state"
          className="text-center py-12 text-muted-foreground"
        >
          <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No recurring jobs yet</p>
          <p className="text-sm mt-1">
            Set up repeat visits like weekly maintenance checks.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden shadow-card">
          <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground border-b border-border">
            <span className="col-span-3">Title</span>
            <span className="col-span-2">Customer</span>
            <span className="col-span-2">Frequency</span>
            <span className="col-span-2">Next</span>
            <span className="col-span-1">Active</span>
            <span className="col-span-2">Actions</span>
          </div>
          {recurringJobs.map((rj, idx) => {
            const customer = customers.find((c) => c.id === rj.customerId);
            return (
              <div
                key={rj.id}
                data-ocid={`recurring.item.${idx + 1}`}
                className="px-4 py-3 grid grid-cols-12 gap-3 items-center border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
              >
                <div className="col-span-3">
                  <p className="text-sm font-medium text-foreground truncate">
                    {rj.title}
                  </p>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground truncate">
                  {customer?.name ?? "—"}
                </div>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FREQ_COLORS[rj.frequency] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {rj.frequency}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {new Date(`${rj.nextOccurrence}T00:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}
                </div>
                <div className="col-span-1">
                  <Switch
                    checked={rj.isActive}
                    onCheckedChange={() => toggleActive(rj.id)}
                    data-ocid={`recurring.switch.${idx + 1}`}
                  />
                </div>
                <div className="col-span-2 flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => generateJobNow(rj)}
                    data-ocid={`recurring.secondary_button.${idx + 1}`}
                  >
                    Generate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(rj.id)}
                    data-ocid={`recurring.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecurringJobDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSave={handleSave}
      />
    </div>
  );
}

// ─── Job Templates Tab ────────────────────────────────────────
function JobTemplatesTab() {
  const [templates, setTemplates] = useLocalStorage<JobTemplate[]>(
    "fp_job_templates",
    [],
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<
    JobTemplate | undefined
  >();

  function handleSave(t: JobTemplate) {
    setTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = t;
        return copy;
      }
      return [t, ...prev];
    });
    toast.success("Template saved");
  }

  function handleDelete(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template deleted");
  }

  function toggleActive(id: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditingTemplate(undefined);
            setShowDialog(true);
          }}
          className="gap-1.5"
          data-ocid="template.primary_button"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div
          data-ocid="template.empty_state"
          className="text-center py-12 text-muted-foreground"
        >
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No templates yet</p>
          <p className="text-sm mt-1">
            Save common job types to speed up job creation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t, idx) => (
            <div
              key={t.id}
              data-ocid={`template.item.${idx + 1}`}
              className="p-4 border border-border rounded-lg bg-card hover:bg-accent/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {t.description}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs ml-2 shrink-0",
                    t.isActive ? "text-foreground" : "opacity-50",
                  )}
                >
                  {t.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span>{t.estimatedHours}h est.</span>
                <span>${t.laborRate}/hr</span>
                <span>{t.defaultMaterials.length} materials</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs flex-1"
                  onClick={() => {
                    setEditingTemplate(t);
                    setShowDialog(true);
                  }}
                  data-ocid={`template.edit_button.${idx + 1}`}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => toggleActive(t.id)}
                  data-ocid={`template.toggle.${idx + 1}`}
                >
                  {t.isActive ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(t.id)}
                  data-ocid={`template.delete_button.${idx + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <TemplateDialog
          open={showDialog}
          onClose={() => {
            setShowDialog(false);
            setEditingTemplate(undefined);
          }}
          existing={editingTemplate}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function TemplateDialog({
  open,
  onClose,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing?: JobTemplate;
  onSave: (t: JobTemplate) => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    estimatedHours: existing?.estimatedHours
      ? String(existing.estimatedHours)
      : "",
    laborRate: existing?.laborRate ? String(existing.laborRate) : "",
    notes: existing?.notes ?? "",
    isActive: existing?.isActive ?? true,
  });
  const [materials, setMaterials] = useState<
    Array<{ _id: string; name: string; quantity: number; unitCost: number }>
  >(
    (existing?.defaultMaterials ?? []).map((m) => ({
      ...m,
      _id: crypto.randomUUID(),
    })),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const template: JobTemplate = {
      id: existing?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      estimatedHours: Number.parseFloat(form.estimatedHours) || 0,
      laborRate: Number.parseFloat(form.laborRate) || 0,
      defaultMaterials: materials.map(({ _id: _unused, ...m }) => m),
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    onSave(template);
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        data-ocid="template.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">
            {existing ? "Edit Template" : "New Job Template"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Template Name *</Label>
            <Input
              data-ocid="template.input"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Drywall Patch, Faucet Replacement"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Est. Hours</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estimatedHours: e.target.value }))
                }
                placeholder="2.0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Labor Rate ($/hr)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.laborRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, laborRate: e.target.value }))
                }
                placeholder="75.00"
              />
            </div>
          </div>

          {/* Default Materials */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default Materials</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() =>
                  setMaterials((prev) => [
                    ...prev,
                    {
                      _id: crypto.randomUUID(),
                      name: "",
                      quantity: 1,
                      unitCost: 0,
                    },
                  ])
                }
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>
            {materials.map((mat, idx) => (
              <div
                key={mat._id}
                className="grid grid-cols-12 gap-2 items-center"
              >
                <div className="col-span-5">
                  <Input
                    className="h-7 text-xs"
                    placeholder="Material name"
                    value={mat.name}
                    onChange={(e) => {
                      const copy = [...materials];
                      copy[idx] = { ...mat, name: e.target.value };
                      setMaterials(copy);
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    className="h-7 text-xs"
                    type="number"
                    min="0"
                    placeholder="Qty"
                    value={mat.quantity}
                    onChange={(e) => {
                      const copy = [...materials];
                      copy[idx] = {
                        ...mat,
                        quantity: Number.parseFloat(e.target.value) || 0,
                      };
                      setMaterials(copy);
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    className="h-7 text-xs"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit $"
                    value={mat.unitCost}
                    onChange={(e) => {
                      const copy = [...materials];
                      copy[idx] = {
                        ...mat,
                        unitCost: Number.parseFloat(e.target.value) || 0,
                      };
                      setMaterials(copy);
                    }}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() =>
                      setMaterials((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
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
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <Label>Active</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="template.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-ocid="template.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {existing ? "Update" : "Create"} Template
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

      <div className="p-6">
        <Tabs defaultValue="jobs">
          <TabsList className="mb-4">
            <TabsTrigger value="jobs" data-ocid="jobs.tab">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="recurring" data-ocid="jobs.recurring.tab">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Recurring
            </TabsTrigger>
            <TabsTrigger value="templates" data-ocid="jobs.templates.tab">
              <List className="w-3.5 h-3.5 mr-1.5" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
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
                        onClick={() =>
                          handleRowClick({ job, customer, address })
                        }
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
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringJobsTab customers={customers} />
          </TabsContent>

          <TabsContent value="templates">
            <JobTemplatesTab />
          </TabsContent>
        </Tabs>
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
