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
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Customer, Invoice } from "../backend.d.ts";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActor } from "../hooks/useActor";
import {
  dateToNs,
  formatCurrency,
  formatDate,
  useAddInvoice,
  useCustomers,
} from "../hooks/useQueries";

interface Props {
  navigate: (p: Page) => void;
}

// ─── Load all invoices across customers ───────────────────────
function useAllInvoices(customers: Customer[]) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["all-invoices", customers.map((c) => c.id)],
    queryFn: async () => {
      if (!actor || customers.length === 0) return [];
      const results = await Promise.all(
        customers.map(async (customer) => {
          const invoices = await actor.getInvoicesByCustomer(customer.id);
          return invoices.map((inv) => ({ invoice: inv, customer }));
        }),
      );
      return results.flat();
    },
    enabled: !!actor && !isFetching && customers.length > 0,
    staleTime: 30_000,
  });
}

// ─── Add Invoice Dialog ───────────────────────────────────────
function AddInvoiceDialog({
  open,
  onClose,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
}) {
  const addInvoice = useAddInvoice();
  const [form, setForm] = useState({
    customerId: "",
    status: "draft",
    totalAmount: "",
    notes: "",
    issueDate: "",
    dueDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      toast.error("Please select a customer");
      return;
    }
    const now = new Date();
    const due = form.dueDate
      ? new Date(form.dueDate)
      : new Date(now.getTime() + 30 * 86400000);

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      customerId: form.customerId,
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
        customerId: "",
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
      <DialogContent className="max-w-md" data-ocid="invoices.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select
              value={form.customerId}
              onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
            >
              <SelectTrigger data-ocid="invoices.select">
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
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger>
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
              data-ocid="invoices.input"
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
              data-ocid="invoices.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="invoices.submit_button"
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

// ─── Main Component ───────────────────────────────────────────
export function InvoicesPage({ navigate }: Props) {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: allInvoices = [], isLoading: invLoading } =
    useAllInvoices(customers);
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const isLoading = customersLoading || invLoading;

  const filtered = useMemo(() => {
    if (statusFilter === "all") return allInvoices;
    return allInvoices.filter((i) => i.invoice.status === statusFilter);
  }, [allInvoices, statusFilter]);

  const statuses = [
    "all",
    "draft",
    "sent",
    "viewed",
    "paid",
    "overdue",
    "void",
  ];

  return (
    <div className="min-h-full">
      <PageHeader
        title="Invoices"
        description={`${allInvoices.length} total invoices`}
        action={
          <Button
            data-ocid="invoices.add_button"
            onClick={() => setShowAdd(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Invoice
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              type="button"
              key={s}
              data-ocid={s === "all" ? "invoices.filter.tab" : undefined}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {/* Invoices list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="invoices.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {statusFilter !== "all"
                ? `No ${statusFilter} invoices`
                : "No invoices yet"}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden shadow-card">
            <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground border-b border-border">
              <span className="col-span-3">Customer</span>
              <span className="col-span-2">Invoice ID</span>
              <span className="col-span-2">Issued</span>
              <span className="col-span-2">Due</span>
              <span className="col-span-2">Amount</span>
              <span className="col-span-1">Status</span>
            </div>
            {filtered.map(({ invoice, customer }, idx) => (
              <button
                type="button"
                key={invoice.id}
                data-ocid={`invoices.item.${idx + 1}`}
                onClick={() =>
                  navigate({ view: "customer-detail", customerId: customer.id })
                }
                className="w-full px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0 text-left"
              >
                <div className="col-span-3">
                  <p className="text-sm font-medium text-foreground truncate">
                    {customer.name}
                  </p>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground font-mono">
                  #{invoice.id.slice(0, 8)}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {formatDate(invoice.dateIssued)}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {formatDate(invoice.dueDate)}
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
                <div className="col-span-1">
                  <StatusBadge status={invoice.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AddInvoiceDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        customers={customers}
      />
    </div>
  );
}
