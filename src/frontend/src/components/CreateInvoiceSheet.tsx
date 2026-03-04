import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Address, Customer, Invoice, Job, Service } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import {
  dateToNs,
  formatCurrency,
  useAddInvoice,
  useSettings,
} from "../hooks/useQueries";
import { StatusBadge } from "./StatusBadge";

// ─── Line Item Types ───────────────────────────────────────────
export type LineItemType = "labor" | "material" | "fee" | "discount" | "other";

export interface LineItem {
  id: string;
  type: LineItemType;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function lineItemTotal(item: LineItem): number {
  const raw = item.quantity * item.unitPrice;
  return item.type === "discount" ? -Math.abs(raw) : raw;
}

// ─── Today & +30 helpers ──────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function plus30Str() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_LINE_ITEM: LineItem = {
  id: crypto.randomUUID(),
  type: "labor",
  description: "",
  quantity: 1,
  unitPrice: 0,
};

// ─── Import from Job Dialog ───────────────────────────────────
interface ImportJobDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  onImport: (items: LineItem[]) => void;
}

function ImportJobDialog({
  open,
  onClose,
  customerId,
  onImport,
}: ImportJobDialogProps) {
  const { actor } = useActor();
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobServices, setJobServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Fetch addresses + jobs when dialog opens
  useEffect(() => {
    if (!open || !customerId || !actor) return;
    setIsLoading(true);
    setAddresses([]);
    setJobs([]);
    setSelectedJob(null);
    setJobServices([]);

    actor
      .listAddressesByCustomer(customerId)
      .then(async (addrs) => {
        setAddresses(addrs);
        if (addrs.length === 0) {
          setIsLoading(false);
          return;
        }
        const jobArrays = await Promise.all(
          addrs.map((a) => actor.getJobsByAddress(a.id)),
        );
        setJobs(jobArrays.flat());
      })
      .catch(() => {
        toast.error("Failed to load jobs");
      })
      .finally(() => setIsLoading(false));
  }, [open, customerId, actor]);

  // Fetch services when job is selected
  useEffect(() => {
    if (!selectedJob || !actor) return;
    setLoadingServices(true);
    setJobServices([]);
    actor
      .getJobServices(selectedJob.id)
      .then((svcs) => setJobServices(svcs))
      .catch(() => toast.error("Failed to load job services"))
      .finally(() => setLoadingServices(false));
  }, [selectedJob, actor]);

  function handleImport() {
    if (!selectedJob) return;
    const newItems: LineItem[] = [];

    for (const svc of jobServices) {
      newItems.push({
        id: crypto.randomUUID(),
        type: "labor",
        description: svc.name,
        quantity: 1,
        unitPrice: svc.price,
      });
    }

    if (selectedJob.cost > 0 && jobServices.length === 0) {
      newItems.push({
        id: crypto.randomUUID(),
        type: "labor",
        description: `Job #${selectedJob.id.slice(0, 8)} — Base Cost`,
        quantity: 1,
        unitPrice: selectedJob.cost,
      });
    }

    if (newItems.length === 0) {
      toast.warning("No line items found for this job");
      return;
    }

    onImport(newItems);
    toast.success(
      `Imported ${newItems.length} line item${newItems.length !== 1 ? "s" : ""} from job`,
    );
    onClose();
  }

  const addressMap = useMemo(
    () => Object.fromEntries(addresses.map((a) => [a.id, a])),
    [addresses],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg"
        data-ocid="invoices.import_job.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Import from Job
          </DialogTitle>
          <DialogDescription>
            Select a job to import its services as line items.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading jobs…
          </div>
        ) : jobs.length === 0 ? (
          <div
            data-ocid="invoices.import_job.empty_state"
            className="py-8 text-center text-muted-foreground text-sm"
          >
            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No jobs found for this customer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} found
            </p>
            <ScrollArea className="max-h-64">
              <div className="space-y-2 pr-1">
                {jobs.map((job) => {
                  const addr = addressMap[job.addressId];
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <button
                      type="button"
                      key={job.id}
                      onClick={() => setSelectedJob(isSelected ? null : job)}
                      className={`w-full text-left rounded-lg border p-3 transition-all text-sm ${
                        isSelected
                          ? "border-primary bg-accent/50 ring-1 ring-primary"
                          : "border-border hover:border-primary/40 hover:bg-accent/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground font-mono text-xs">
                            #{job.id.slice(0, 8)}
                          </p>
                          {addr && (
                            <p className="text-muted-foreground text-xs">
                              {addr.addressLabel
                                ? `${addr.addressLabel} — `
                                : ""}
                              {addr.street}, {addr.city}
                            </p>
                          )}
                          {job.notes && (
                            <p className="text-muted-foreground text-xs line-clamp-1">
                              {job.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={job.status} />
                          {job.cost > 0 && (
                            <span className="text-xs font-medium text-foreground">
                              {formatCurrency(job.cost)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {selectedJob && (
              <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                  Services to import
                </p>
                {loadingServices ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading services…
                  </div>
                ) : jobServices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedJob.cost > 0
                      ? `Will import base cost: ${formatCurrency(selectedJob.cost)}`
                      : "No services or cost found for this job."}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {jobServices.map((svc) => (
                      <div
                        key={svc.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1.5"
                          >
                            labor
                          </Badge>
                          <span className="text-foreground">{svc.name}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">
                          {formatCurrency(svc.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-ocid="invoices.import_job.cancel_button"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                data-ocid="invoices.import_job.confirm_button"
                onClick={handleImport}
                disabled={!selectedJob || loadingServices}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Import Line Items
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Invoice Sheet ─────────────────────────────────────
export interface CreateInvoiceSheetProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  initialCustomerId?: string;
  initialLineItems?: LineItem[];
  initialNotes?: string;
}

export function CreateInvoiceSheet({
  open,
  onClose,
  customers,
  initialCustomerId,
  initialLineItems,
  initialNotes,
}: CreateInvoiceSheetProps) {
  const addInvoice = useAddInvoice();
  const { data: settings } = useSettings();
  const [showImportJob, setShowImportJob] = useState(false);

  // Header form state
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [issueDate, setIssueDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(plus30Str());

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialLineItems && initialLineItems.length > 0
      ? initialLineItems
      : [{ ...DEFAULT_LINE_ITEM, id: crypto.randomUUID() }],
  );

  // Totals
  const [taxRate, setTaxRate] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  // Footer
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [terms, setTerms] = useState("Net 30");

  // Populate invoice number & tax from settings
  useEffect(() => {
    if (settings) {
      const prefix = settings.invoicePrefix || "INV";
      const num = settings.invoiceStartingNumber
        ? String(settings.invoiceStartingNumber).padStart(3, "0")
        : "001";
      setInvoiceNumber(`${prefix}-${num}`);
      setTaxRate(settings.defaultTaxRate ?? 0);
    }
  }, [settings]);

  // Sync initial values when the sheet opens with new initial props
  useEffect(() => {
    if (open) {
      if (initialCustomerId) setCustomerId(initialCustomerId);
      if (initialLineItems && initialLineItems.length > 0) {
        setLineItems(initialLineItems);
      }
      if (initialNotes !== undefined) setNotes(initialNotes);
    }
  }, [open, initialCustomerId, initialLineItems, initialNotes]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setStatus("draft");
      setIssueDate(todayStr());
      setDueDate(plus30Str());
      setLineItems([{ ...DEFAULT_LINE_ITEM, id: crypto.randomUUID() }]);
      setTaxRate(settings?.defaultTaxRate ?? 0);
      setAmountPaid(0);
      setNotes("");
      setTerms("Net 30");
    }
  }, [open, settings]);

  // Computed totals
  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + lineItemTotal(item), 0),
    [lineItems],
  );
  const taxAmount = useMemo(
    () => subtotal * (taxRate / 100),
    [subtotal, taxRate],
  );
  const total = subtotal + taxAmount;
  const balanceDue = total - amountPaid;

  // Import line items from a job
  const importJobLineItems = useCallback((items: LineItem[]) => {
    setLineItems((prev) => {
      const hasOnlyBlank =
        prev.length === 1 &&
        prev[0].description === "" &&
        prev[0].unitPrice === 0;
      return hasOnlyBlank ? items : [...prev, ...items];
    });
  }, []);

  // Line item helpers
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "labor",
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateLineItem = useCallback((id: string, patch: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    const notesText = notes.trim() || undefined;
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      customerId,
      status,
      totalAmount: total,
      dateIssued: dateToNs(new Date(`${issueDate}T00:00:00`)),
      dueDate: dateToNs(new Date(`${dueDate}T00:00:00`)),
      notes: notesText,
      jobIds: [],
      timeEntryIds: [],
      materialEntryIds: [],
      timeBlockIds: [],
    };

    try {
      await addInvoice.mutateAsync(invoice);
      toast.success(`Invoice ${invoiceNumber} created`);
      onClose();
    } catch {
      toast.error("Failed to create invoice");
    }
  }

  const statusOptions = ["draft", "sent", "viewed", "overdue", "paid", "void"];
  const lineItemTypeOptions: LineItemType[] = [
    "labor",
    "material",
    "fee",
    "discount",
    "other",
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col"
        data-ocid="invoices.sheet"
      >
        {/* Sheet Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="font-display text-xl">New Invoice</SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm">
            Fill in the details below to create a new invoice.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <form
            id="create-invoice-form"
            onSubmit={handleSubmit}
            className="px-6 py-5 space-y-6"
          >
            {/* ── Header Fields ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase opacity-60">
                Invoice Details
              </h3>

              {/* Customer + Invoice Number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-customer" className="text-sm font-medium">
                    Customer <span className="text-destructive">*</span>
                  </Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger
                      id="inv-customer"
                      data-ocid="invoices.customer.select"
                      className="w-full"
                    >
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
                  <Label htmlFor="inv-number" className="text-sm font-medium">
                    Invoice Number
                  </Label>
                  <Input
                    id="inv-number"
                    data-ocid="invoices.invoice_number.input"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-001"
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Status + Issue Date + Due Date */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger
                      id="inv-status"
                      data-ocid="invoices.status.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="capitalize">{s}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="inv-issue-date"
                    className="text-sm font-medium"
                  >
                    Issue Date
                  </Label>
                  <Input
                    id="inv-issue-date"
                    data-ocid="invoices.issue_date.input"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-due-date" className="text-sm font-medium">
                    Due Date
                  </Label>
                  <Input
                    id="inv-due-date"
                    data-ocid="invoices.due_date.input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Line Items ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase opacity-60">
                  Line Items
                </h3>
                <div className="flex items-center gap-2">
                  {customerId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-ocid="invoices.import_from_job.button"
                      onClick={() => setShowImportJob(true)}
                      className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Import from job
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-ocid="invoices.add_line_item.button"
                    onClick={addLineItem}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                  </Button>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[120px_1fr_72px_96px_80px_36px] gap-2 px-2 text-xs font-medium text-muted-foreground">
                <span>Type</span>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => {
                  const rowTotal = lineItemTotal(item);
                  const isDiscount = item.type === "discount";
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[120px_1fr_72px_96px_80px_36px] gap-2 items-center"
                    >
                      {/* Type */}
                      <Select
                        value={item.type}
                        onValueChange={(v) =>
                          updateLineItem(item.id, { type: v as LineItemType })
                        }
                      >
                        <SelectTrigger
                          data-ocid={`invoices.line_item.type.select.${idx + 1}`}
                          className="h-8 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {lineItemTypeOptions.map((t) => (
                            <SelectItem key={t} value={t}>
                              <span className="capitalize">{t}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Description */}
                      <Input
                        data-ocid={`invoices.line_item.description.input.${idx + 1}`}
                        className="h-8 text-xs"
                        placeholder="Description…"
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            description: e.target.value,
                          })
                        }
                      />

                      {/* Qty */}
                      <Input
                        data-ocid={`invoices.line_item.qty.input.${idx + 1}`}
                        className="h-8 text-xs text-right"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            quantity: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                      />

                      {/* Unit Price */}
                      <Input
                        data-ocid={`invoices.line_item.unit_price.input.${idx + 1}`}
                        className="h-8 text-xs text-right"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.id, {
                            unitPrice: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                      />

                      {/* Row total */}
                      <div
                        className={`text-xs text-right font-medium tabular-nums px-1 ${
                          isDiscount ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {isDiscount && rowTotal !== 0 ? "-" : ""}
                        {formatCurrency(Math.abs(rowTotal))}
                      </div>

                      {/* Remove */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-ocid={`invoices.line_item.delete_button.${idx + 1}`}
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* ── Totals ── */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase opacity-60">
                Summary
              </h3>

              <div className="ml-auto max-w-xs w-full space-y-2">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {/* Tax rate */}
                <div className="flex items-center justify-between text-sm gap-4">
                  <span className="text-muted-foreground shrink-0">
                    Tax Rate (%)
                  </span>
                  <Input
                    data-ocid="invoices.tax_rate.input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(Number.parseFloat(e.target.value) || 0)
                    }
                    className="h-7 w-24 text-right text-xs"
                  />
                </div>

                {/* Tax amount */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax Amount</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>

                <Separator className="my-1" />

                {/* Total */}
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>

                {/* Amount Paid */}
                <div className="flex items-center justify-between text-sm gap-4">
                  <span className="text-muted-foreground shrink-0">
                    Amount Paid
                  </span>
                  <Input
                    data-ocid="invoices.amount_paid.input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) =>
                      setAmountPaid(Number.parseFloat(e.target.value) || 0)
                    }
                    className="h-7 w-24 text-right text-xs"
                  />
                </div>

                {/* Balance Due */}
                <div className="flex items-center justify-between text-sm font-medium">
                  <span
                    className={
                      balanceDue > 0 ? "text-destructive" : "text-foreground"
                    }
                  >
                    Balance Due
                  </span>
                  <span
                    className={`tabular-nums font-semibold ${
                      balanceDue > 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Footer fields ── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase opacity-60">
                Notes & Terms
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="inv-notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="inv-notes"
                  data-ocid="invoices.notes.textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes for the customer…"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-terms" className="text-sm font-medium">
                  Terms
                </Label>
                <Textarea
                  id="inv-terms"
                  data-ocid="invoices.terms.textarea"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g. Net 30 — Payment due within 30 days…"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </section>

            {/* Extra bottom padding for footer overlap */}
            <div className="h-4" />
          </form>
        </ScrollArea>

        {/* Sticky footer actions */}
        <div className="px-6 py-4 border-t border-border bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            data-ocid="invoices.cancel_button"
            onClick={onClose}
            disabled={addInvoice.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-invoice-form"
            data-ocid="invoices.submit_button"
            disabled={addInvoice.isPending}
            className="min-w-[120px]"
          >
            {addInvoice.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating…
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </div>
      </SheetContent>

      {/* Import from Job dialog — rendered outside SheetContent to avoid z-index conflicts */}
      <ImportJobDialog
        open={showImportJob}
        onClose={() => setShowImportJob(false)}
        customerId={customerId}
        onImport={importJobLineItems}
      />
    </Sheet>
  );
}
