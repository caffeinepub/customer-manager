import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ArrowLeft,
  Bell,
  Briefcase,
  FileText,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Address, Invoice, Job } from "../backend.d.ts";
import { StatusBadge } from "../components/StatusBadge";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  dateToNs,
  formatCurrency,
  formatDate,
  useAddAddress,
  useAddInvoice,
  useAddJob,
  useAddressesByCustomer,
  useCustomer,
  useInvoicesByCustomer,
  useJobsForCustomer,
} from "../hooks/useQueries";
import type { FollowUpReminder } from "../types/local";

interface Props {
  customerId: string;
  navigate: (p: Page) => void;
}

// ─── Add Address Dialog ───────────────────────────────────────
function AddAddressDialog({
  open,
  customerId,
  onClose,
}: {
  open: boolean;
  customerId: string;
  onClose: () => void;
}) {
  const addAddress = useAddAddress();
  const [form, setForm] = useState({
    addressLabel: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    isPrimary: false,
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const address: Address = {
      id: crypto.randomUUID(),
      customerId,
      addressLabel: form.addressLabel.trim() || "Home",
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
      isPrimary: form.isPrimary,
      notes: form.notes.trim() || undefined,
    };
    try {
      await addAddress.mutateAsync(address);
      toast.success("Address added");
      setForm({
        addressLabel: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US",
        isPrimary: false,
        notes: "",
      });
      onClose();
    } catch {
      toast.error("Failed to add address");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="address.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Address</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input
              data-ocid="address.input"
              value={form.addressLabel}
              onChange={(e) =>
                setForm((f) => ({ ...f, addressLabel: e.target.value }))
              }
              placeholder="Home, Office, Rental #1…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Street *</Label>
            <Input
              value={form.street}
              onChange={(e) =>
                setForm((f) => ({ ...f, street: e.target.value }))
              }
              placeholder="123 Main St"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="Springfield"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
                placeholder="IL"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Postal Code</Label>
              <Input
                value={form.postalCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, postalCode: e.target.value }))
                }
                placeholder="62701"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
                placeholder="US"
              />
            </div>
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
              checked={form.isPrimary}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v }))}
            />
            <Label>Primary address</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="address.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="address.submit_button"
              disabled={addAddress.isPending}
            >
              {addAddress.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Job Dialog ───────────────────────────────────────────
function AddJobDialog({
  open,
  customerId,
  addresses,
  onClose,
}: {
  open: boolean;
  customerId: string;
  addresses: Address[];
  onClose: () => void;
}) {
  const addJob = useAddJob();
  const [form, setForm] = useState({
    addressId: "",
    serviceId: "",
    title: "",
    status: "scheduled",
    cost: "",
    notes: "",
    startDate: "",
    endDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.addressId) {
      toast.error("Please select an address");
      return;
    }
    const now = new Date();
    const start = form.startDate ? new Date(form.startDate) : now;
    const end = form.endDate ? new Date(form.endDate) : now;

    const job: Job = {
      id: crypto.randomUUID(),
      customerId,
      addressId: form.addressId,
      serviceId: form.serviceId || crypto.randomUUID(),
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
      setForm({
        addressId: "",
        serviceId: "",
        title: "",
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
      <DialogContent className="max-w-md" data-ocid="job.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Address *</Label>
            <Select
              value={form.addressId}
              onValueChange={(v) => setForm((f) => ({ ...f, addressId: v }))}
            >
              <SelectTrigger data-ocid="job.select">
                <SelectValue placeholder="Select address…" />
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
              data-ocid="job.input"
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
              data-ocid="job.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="job.submit_button"
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

// ─── Add Invoice Dialog ───────────────────────────────────────
function AddInvoiceDialog({
  open,
  customerId,
  onClose,
}: {
  open: boolean;
  customerId: string;
  onClose: () => void;
}) {
  const addInvoice = useAddInvoice();
  const [form, setForm] = useState({
    status: "draft",
    totalAmount: "",
    notes: "",
    issueDate: "",
    dueDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date();
    const due = form.dueDate
      ? new Date(form.dueDate)
      : new Date(now.getTime() + 30 * 86400000);

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      customerId,
      status: form.status,
      totalAmount: Number.parseFloat(form.totalAmount) || 0,
      dateIssued: dateToNs(form.issueDate ? new Date(form.issueDate) : now),
      dueDate: dateToNs(due),
      notes: form.notes.trim() || undefined,
      jobIds: [],
      timeEntryIds: [],
      materialEntryIds: [],
      timeBlockIds: [],
    };
    try {
      await addInvoice.mutateAsync(invoice);
      toast.success("Invoice added");
      setForm({
        status: "draft",
        totalAmount: "",
        notes: "",
        issueDate: "",
        dueDate: "",
      });
      onClose();
    } catch {
      toast.error("Failed to add invoice");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="invoice.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger data-ocid="invoice.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["draft", "sent", "viewed", "paid", "overdue", "void"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Total Amount ($)</Label>
            <Input
              data-ocid="invoice.input"
              type="number"
              step="0.01"
              min="0"
              value={form.totalAmount}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalAmount: e.target.value }))
              }
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issueDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
              />
            </div>
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
              data-ocid="invoice.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="invoice.submit_button"
              disabled={addInvoice.isPending}
            >
              {addInvoice.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Reminder Dialog (inline for customer) ────────────────
function AddReminderDialog({
  open,
  customerId,
  onClose,
  onSave,
}: {
  open: boolean;
  customerId: string;
  onClose: () => void;
  onSave: (r: FollowUpReminder) => void;
}) {
  const [form, setForm] = useState({ dueDate: "", note: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const reminder: FollowUpReminder = {
      id: crypto.randomUUID(),
      customerId,
      dueDate: form.dueDate,
      note: form.note.trim(),
      isDone: false,
      createdAt: new Date().toISOString(),
    };
    onSave(reminder);
    setForm({ dueDate: "", note: "" });
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-ocid="customer_reminder.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Reminder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Due Date *</Label>
            <Input
              data-ocid="customer_reminder.input"
              type="date"
              required
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={2}
              placeholder="e.g., Follow up on job satisfaction"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="customer_reminder.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-ocid="customer_reminder.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function CustomerDetailPage({ customerId, navigate }: Props) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: addresses = [], isLoading: addrLoading } =
    useAddressesByCustomer(customerId);
  const { data: jobs = [], isLoading: jobsLoading } = useJobsForCustomer(
    customerId,
    addresses,
  );
  const { data: invoices = [], isLoading: invLoading } =
    useInvoicesByCustomer(customerId);

  const [reminders, setReminders] = useLocalStorage<FollowUpReminder[]>(
    "fp_reminders",
    [],
  );
  const customerReminders = reminders.filter(
    (r) => r.customerId === customerId,
  );

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Customer not found
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border bg-card/30">
        <button
          type="button"
          onClick={() => navigate({ view: "customers" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                {customer.name}
                <StatusBadge
                  status={customer.isActive ? "active" : "inactive"}
                />
              </h1>
              <div className="flex items-center gap-4 mt-0.5">
                {customer.email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {customer.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Star className="w-2.5 h-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              data-ocid="customer_detail.portal.button"
              onClick={() => {
                const url = `${window.location.origin}?portal=${customerId}`;
                navigator.clipboard
                  .writeText(url)
                  .then(() => toast.success("Portal link copied to clipboard!"))
                  .catch(() => toast.error("Failed to copy link"));
              }}
            >
              <Link2 className="w-3.5 h-3.5" />
              Share Portal
            </Button>
          </div>
        </div>
        {customer.notes && (
          <p className="text-sm text-muted-foreground mt-3 pl-13 max-w-xl">
            {customer.notes}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="p-6">
        <Tabs defaultValue="addresses">
          <TabsList className="mb-4">
            <TabsTrigger
              value="addresses"
              data-ocid="customer_detail.addresses.tab"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Addresses ({addresses.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" data-ocid="customer_detail.jobs.tab">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              Jobs ({jobs.length})
            </TabsTrigger>
            <TabsTrigger
              value="invoices"
              data-ocid="customer_detail.invoices.tab"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              data-ocid="customer_detail.reminders.tab"
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Reminders ({customerReminders.length})
            </TabsTrigger>
          </TabsList>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                data-ocid="address.add_button"
                onClick={() => setShowAddAddress(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Address
              </Button>
            </div>
            {addrLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : addresses.length === 0 ? (
              <div
                data-ocid="address.empty_state"
                className="text-center py-10 text-muted-foreground"
              >
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No addresses yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {addresses.map((addr, idx) => (
                  <Card
                    key={addr.id}
                    data-ocid={`address.item.${idx + 1}`}
                    className="shadow-card"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-sm text-foreground">
                          {addr.addressLabel}
                        </span>
                        {addr.isPrimary && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {addr.street}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {addr.city}, {addr.state} {addr.postalCode}
                      </p>
                      {addr.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {addr.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                data-ocid="jobs.add_button"
                onClick={() => setShowAddJob(true)}
                disabled={addresses.length === 0}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Job
              </Button>
            </div>
            {addresses.length === 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                Add an address first before creating jobs.
              </p>
            )}
            {jobsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : jobs.length === 0 ? (
              <div
                data-ocid="jobs.empty_state"
                className="text-center py-10 text-muted-foreground"
              >
                <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No jobs yet</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden shadow-card">
                {jobs.map((job, idx) => (
                  <div
                    key={job.id}
                    data-ocid={`jobs.item.${idx + 1}`}
                    className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Job #{job.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(job.startTime)} — {formatDate(job.endTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(job.cost)}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                data-ocid="invoices.add_button"
                onClick={() => setShowAddInvoice(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Invoice
              </Button>
            </div>
            {invLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : invoices.length === 0 ? (
              <div
                data-ocid="invoices.empty_state"
                className="text-center py-10 text-muted-foreground"
              >
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No invoices yet</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden shadow-card">
                {invoices.map((inv, idx) => (
                  <div
                    key={inv.id}
                    data-ocid={`invoices.item.${idx + 1}`}
                    className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Invoice #{inv.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued {formatDate(inv.dateIssued)} · Due{" "}
                        {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(inv.totalAmount)}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          {/* Reminders Tab */}
          <TabsContent value="reminders">
            <div className="flex justify-end mb-3">
              <Button
                size="sm"
                data-ocid="customer_detail.reminder.add_button"
                onClick={() => setShowAddReminder(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Reminder
              </Button>
            </div>
            {customerReminders.length === 0 ? (
              <div
                data-ocid="customer_detail.reminders.empty_state"
                className="text-center py-10 text-muted-foreground"
              >
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No reminders for this customer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerReminders.map((r, idx) => {
                  const isOverdue = !r.isDone && r.dueDate < today;
                  return (
                    <div
                      key={r.id}
                      data-ocid={`customer_detail.reminder.item.${idx + 1}`}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        r.isDone
                          ? "border-border bg-muted/30 opacity-60"
                          : isOverdue
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border bg-card hover:bg-accent/20",
                      )}
                    >
                      <Checkbox
                        checked={r.isDone}
                        onCheckedChange={() =>
                          setReminders((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, isDone: !x.isDone } : x,
                            ),
                          )
                        }
                        className="mt-0.5"
                        data-ocid={`customer_detail.reminder.checkbox.${idx + 1}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              isOverdue
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isOverdue ? "Overdue · " : ""}
                            {new Date(
                              `${r.dueDate}T00:00:00`,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {r.note && (
                          <p className="text-sm text-foreground mt-0.5">
                            {r.note}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                        onClick={() =>
                          setReminders((prev) =>
                            prev.filter((x) => x.id !== r.id),
                          )
                        }
                        data-ocid={`customer_detail.reminder.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddAddressDialog
        open={showAddAddress}
        customerId={customerId}
        onClose={() => setShowAddAddress(false)}
      />
      <AddJobDialog
        open={showAddJob}
        customerId={customerId}
        addresses={addresses}
        onClose={() => setShowAddJob(false)}
      />
      <AddInvoiceDialog
        open={showAddInvoice}
        customerId={customerId}
        onClose={() => setShowAddInvoice(false)}
      />
      <AddReminderDialog
        open={showAddReminder}
        customerId={customerId}
        onClose={() => setShowAddReminder(false)}
        onSave={(r) => {
          setReminders((prev) => [r, ...prev]);
          toast.success("Reminder added");
        }}
      />
    </div>
  );
}
