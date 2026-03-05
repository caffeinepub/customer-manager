import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  Download,
  FileSearch,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { PageHeader } from "../components/PageHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAddJob } from "../hooks/useQueries";
import { useAddressesByCustomer, useCustomers } from "../hooks/useQueries";
import type { Estimate, EstimateLineItem } from "../types/local";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  accepted:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  declined: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  expired:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

// ─── Line Item Row ───────────────────────────────────────────
function LineItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: EstimateLineItem;
  onChange: (updated: EstimateLineItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-3">
        <Select
          value={item.type}
          onValueChange={(v) =>
            onChange({ ...item, type: v as EstimateLineItem["type"] })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["labor", "material", "fee", "discount", "other"].map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        <Input
          className="h-8 text-xs"
          placeholder="Description"
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
        />
      </div>
      <div className="col-span-1">
        <Input
          className="h-8 text-xs"
          type="number"
          min="0"
          step="0.01"
          placeholder="Qty"
          value={item.quantity}
          onChange={(e) => {
            const qty = Number.parseFloat(e.target.value) || 0;
            onChange({
              ...item,
              quantity: qty,
              total: qty * item.unitPrice,
            });
          }}
        />
      </div>
      <div className="col-span-2">
        <Input
          className="h-8 text-xs"
          type="number"
          min="0"
          step="0.01"
          placeholder="Unit $"
          value={item.unitPrice}
          onChange={(e) => {
            const up = Number.parseFloat(e.target.value) || 0;
            onChange({
              ...item,
              unitPrice: up,
              total: item.quantity * up,
            });
          }}
        />
      </div>
      <div className="col-span-1 text-xs font-medium text-right pr-1">
        {formatCurrency(item.total)}
      </div>
      <div className="col-span-1 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Minus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Create / Edit Sheet ─────────────────────────────────────
function EstimateSheet({
  open,
  onClose,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Estimate;
  onSave: (e: Estimate) => void;
}) {
  const { data: customers = [] } = useCustomers();
  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const { data: addresses = [] } = useAddressesByCustomer(customerId);
  const [form, setForm] = useState({
    addressId: existing?.addressId ?? "",
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    status: existing?.status ?? ("draft" as Estimate["status"]),
    taxRate: existing?.taxRate ?? 0,
    notes: existing?.notes ?? "",
    validUntil: existing?.validUntil ?? "",
  });
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>(
    existing?.lineItems ?? [],
  );
  const [saving, setSaving] = useState(false);

  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const taxAmount = subtotal * (form.taxRate / 100);
  const total = subtotal + taxAmount;

  function addLine() {
    const newItem: EstimateLineItem = {
      id: crypto.randomUUID(),
      estimateId: existing?.id ?? "",
      type: "labor",
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setLineItems((prev) => [...prev, newItem]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const estimate: Estimate = {
      id: existing?.id ?? crypto.randomUUID(),
      customerId,
      addressId: form.addressId,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      lineItems: lineItems.map((li) => ({
        ...li,
        estimateId: existing?.id ?? "",
      })),
      subtotal,
      taxRate: form.taxRate,
      taxAmount,
      total,
      notes: form.notes.trim() || undefined,
      validUntil: form.validUntil || undefined,
      convertedJobId: existing?.convertedJobId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(estimate);
    setSaving(false);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl overflow-y-auto"
        data-ocid="estimate.sheet"
      >
        <SheetHeader>
          <SheetTitle className="font-display">
            {existing ? "Edit Estimate" : "New Estimate"}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select
                value={customerId}
                onValueChange={(v) => {
                  setCustomerId(v);
                  setForm((f) => ({ ...f, addressId: "" }));
                }}
              >
                <SelectTrigger data-ocid="estimate.select">
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
              <Label>Address</Label>
              <Select
                value={form.addressId}
                onValueChange={(v) => setForm((f) => ({ ...f, addressId: v }))}
                disabled={!customerId}
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
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              data-ocid="estimate.input"
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="e.g., Drywall Repair — Master Bedroom"
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
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as Estimate["status"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "sent", "accepted", "declined", "expired"].map(
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
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validUntil: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-7 gap-1 text-xs"
                data-ocid="estimate.add_button"
              >
                <Plus className="w-3 h-3" />
                Add Line
              </Button>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No line items yet.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-0.5">
                  <span className="col-span-3">Type</span>
                  <span className="col-span-4">Description</span>
                  <span className="col-span-1">Qty</span>
                  <span className="col-span-2">Unit $</span>
                  <span className="col-span-1 text-right">Total</span>
                  <span className="col-span-1" />
                </div>
                {lineItems.map((li) => (
                  <LineItemRow
                    key={li.id}
                    item={li}
                    onChange={(updated) =>
                      setLineItems((prev) =>
                        prev.map((x) => (x.id === li.id ? updated : x)),
                      )
                    }
                    onRemove={() =>
                      setLineItems((prev) => prev.filter((x) => x.id !== li.id))
                    }
                  />
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="mt-3 border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground gap-4">
                <span>Tax Rate (%)</span>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.taxRate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      taxRate: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-7 w-20 text-xs text-right"
                />
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
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

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="estimate.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-ocid="estimate.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {existing ? "Update Estimate" : "Create Estimate"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Convert to Job Dialog ────────────────────────────────────
function ConvertToJobDialog({
  open,
  estimate,
  onClose,
  onConverted,
}: {
  open: boolean;
  estimate: Estimate | null;
  onClose: () => void;
  onConverted: (jobId: string) => void;
}) {
  const addJob = useAddJob();
  const [startDate, setStartDate] = useState("");
  const [converting, setConverting] = useState(false);

  async function handleConvert() {
    if (!estimate) return;
    setConverting(true);
    try {
      const now = new Date();
      const start = startDate ? new Date(startDate) : now;
      const jobId = crypto.randomUUID();
      await addJob.mutateAsync({
        id: jobId,
        customerId: estimate.customerId,
        addressId: estimate.addressId,
        serviceId: crypto.randomUUID(),
        status: "scheduled",
        cost: estimate.total,
        isActive: true,
        startTime: BigInt(start.getTime()) * 1_000_000n,
        endTime: BigInt(start.getTime()) * 1_000_000n,
        notes: estimate.title,
      });
      onConverted(jobId);
      toast.success("Estimate converted to job!");
      onClose();
    } catch {
      toast.error("Failed to convert estimate");
    } finally {
      setConverting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-ocid="estimate.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Convert to Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This will create a new job from estimate "
            <strong>{estimate?.title}</strong>" with a total cost of{" "}
            <strong>{formatCurrency(estimate?.total ?? 0)}</strong>.
          </p>
          <div className="space-y-1.5">
            <Label>Scheduled Start Date</Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="estimate.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={converting}
            data-ocid="estimate.confirm_button"
          >
            {converting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            Convert to Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────
interface Props {
  navigate: (p: Page) => void;
}

export function EstimatesPage({ navigate: _navigate }: Props) {
  const [estimates, setEstimates] = useLocalStorage<Estimate[]>(
    "fp_estimates",
    [],
  );
  const { data: customers = [] } = useCustomers();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSheet, setShowSheet] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<
    Estimate | undefined
  >();
  const [convertTarget, setConvertTarget] = useState<Estimate | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return estimates;
    return estimates.filter((e) => e.status === statusFilter);
  }, [estimates, statusFilter]);

  const totalValue = estimates.reduce((s, e) => s + e.total, 0);
  const openValue = estimates
    .filter((e) => e.status === "draft" || e.status === "sent")
    .reduce((s, e) => s + e.total, 0);
  const acceptedCount = estimates.filter((e) => e.status === "accepted").length;
  const acceptedRate =
    estimates.length > 0
      ? Math.round((acceptedCount / estimates.length) * 100)
      : 0;

  function handleSave(est: Estimate) {
    setEstimates((prev) => {
      const idx = prev.findIndex((e) => e.id === est.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = est;
        return copy;
      }
      return [est, ...prev];
    });
    toast.success("Estimate saved");
  }

  function handleDelete(id: string) {
    setEstimates((prev) => prev.filter((e) => e.id !== id));
    toast.success("Estimate deleted");
  }

  function handleConverted(estimateId: string, jobId: string) {
    setEstimates((prev) =>
      prev.map((e) =>
        e.id === estimateId
          ? { ...e, status: "accepted", convertedJobId: jobId }
          : e,
      ),
    );
  }

  function exportCSV() {
    const rows = [
      ["Title", "Customer", "Status", "Subtotal", "Tax", "Total", "Created"],
      ...estimates.map((e) => {
        const c = customers.find((cu) => cu.id === e.customerId);
        return [
          e.title,
          c?.name ?? "",
          e.status,
          e.subtotal.toFixed(2),
          e.taxAmount.toFixed(2),
          e.total.toFixed(2),
          new Date(e.createdAt).toLocaleDateString(),
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estimates.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Estimates"
        description={`${estimates.length} total estimates`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5"
              data-ocid="estimates.secondary_button"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setEditingEstimate(undefined);
                setShowSheet(true);
              }}
              className="gap-2"
              data-ocid="estimates.primary_button"
            >
              <Plus className="w-4 h-4" />
              New Estimate
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Estimates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {estimates.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalValue)} total value
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Open Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {formatCurrency(openValue)}
              </p>
              <p className="text-xs text-muted-foreground">draft + sent</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Accepted Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {acceptedRate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedCount} accepted
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {["all", "draft", "sent", "accepted", "declined", "expired"].map(
            (s) => (
              <button
                type="button"
                key={s}
                data-ocid={"estimates.filter.tab"}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ),
          )}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div
            data-ocid="estimates.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No estimates yet</p>
            <p className="text-sm mt-1">
              Create your first estimate to send to a customer.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden shadow-card">
            <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground border-b border-border">
              <span className="col-span-4">Title / Customer</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Total</span>
              <span className="col-span-2">Valid Until</span>
              <span className="col-span-2">Actions</span>
            </div>
            {filtered.map((est, idx) => {
              const customer = customers.find((c) => c.id === est.customerId);
              return (
                <div
                  key={est.id}
                  data-ocid={`estimates.item.${idx + 1}`}
                  className="px-4 py-3 grid grid-cols-12 gap-3 items-center border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-foreground truncate">
                      {est.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customer?.name ?? "Unknown customer"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[est.status] ?? ""}`}
                    >
                      {est.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm font-semibold">
                    {formatCurrency(est.total)}
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {est.validUntil
                      ? new Date(est.validUntil).toLocaleDateString()
                      : "—"}
                  </div>
                  <div className="col-span-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setEditingEstimate(est);
                        setShowSheet(true);
                      }}
                      data-ocid={`estimates.edit_button.${idx + 1}`}
                    >
                      Edit
                    </Button>
                    {est.status === "accepted" && !est.convertedJobId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setConvertTarget(est)}
                        data-ocid={`estimates.secondary_button.${idx + 1}`}
                      >
                        → Job
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(est.id)}
                      data-ocid={`estimates.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EstimateSheet
        open={showSheet}
        onClose={() => {
          setShowSheet(false);
          setEditingEstimate(undefined);
        }}
        existing={editingEstimate}
        onSave={handleSave}
      />

      <ConvertToJobDialog
        open={!!convertTarget}
        estimate={convertTarget}
        onClose={() => setConvertTarget(null)}
        onConverted={(jobId) => {
          if (convertTarget) handleConverted(convertTarget.id, jobId);
          setConvertTarget(null);
        }}
      />
    </div>
  );
}
