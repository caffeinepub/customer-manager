import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Page } from "../App";
import type { Customer, Invoice } from "../backend.d.ts";
import { CreateInvoiceSheet } from "../components/CreateInvoiceSheet";
import { InvoicePreviewModal } from "../components/InvoicePreviewModal";
import { MarkAsPaidDialog } from "../components/MarkAsPaidDialog";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActor } from "../hooks/useActor";
import { useBusinessLogo } from "../hooks/useBusinessLogo";
import {
  formatCurrency,
  formatDate,
  useCustomers,
  useSettings,
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

// ─── Row Actions ──────────────────────────────────────────────
interface RowActionsProps {
  invoice: Invoice;
  customer: Customer;
  onPreview: () => void;
  onMarkPaid: () => void;
}

function InvoiceRowActions({
  invoice,
  onPreview,
  onMarkPaid,
}: RowActionsProps) {
  const canMarkPaid = invoice.status !== "paid" && invoice.status !== "void";

  return (
    <div className="flex items-center gap-1 justify-end">
      {/* Eye / Preview button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        title="View Preview"
        data-ocid="invoices.preview.open_modal_button"
      >
        <Eye className="w-3.5 h-3.5" />
      </Button>

      {/* 3-dot dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            data-ocid="invoices.row.dropdown_menu"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onSelect={onPreview}
          >
            <Eye className="w-4 h-4" />
            View Preview
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onSelect={onMarkPaid}
            disabled={!canMarkPaid}
          >
            <CheckCircle2
              className={`w-4 h-4 ${canMarkPaid ? "text-emerald-500" : "text-muted-foreground"}`}
            />
            Mark as Paid
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function InvoicesPage({ navigate }: Props) {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: allInvoices = [], isLoading: invLoading } =
    useAllInvoices(customers);
  const { data: settings } = useSettings();
  const { logoUrl } = useBusinessLogo();

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Preview modal state
  const [previewInvoice, setPreviewInvoice] = useState<{
    invoice: Invoice;
    customer: Customer;
  } | null>(null);

  // Mark as paid dialog state
  const [markPaidInvoice, setMarkPaidInvoice] = useState<{
    invoice: Invoice;
    customer: Customer;
  } | null>(null);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-ocid="invoices.dropdown_menu" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Invoice
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                data-ocid="invoices.new_invoice_button"
                onSelect={() => setShowCreate(true)}
                className="gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                New Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled
                className="gap-2 text-muted-foreground cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="space-y-3" data-ocid="invoices.loading_state">
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
            {/* Column headers — now 13 cols: Customer(3) ID(2) Issued(2) Due(2) Amount(2) Status(1) Actions(1) */}
            <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-13 gap-4 text-xs font-medium text-muted-foreground border-b border-border">
              <span className="col-span-3">Customer</span>
              <span className="col-span-2">Invoice ID</span>
              <span className="col-span-2">Issued</span>
              <span className="col-span-2">Due</span>
              <span className="col-span-2">Amount</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-1 text-right">Actions</span>
            </div>
            {filtered.map(({ invoice, customer }, idx) => (
              <div
                key={invoice.id}
                data-ocid={`invoices.item.${idx + 1}`}
                className="w-full px-4 py-3 grid grid-cols-13 gap-4 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0"
              >
                {/* Customer name — clickable */}
                <button
                  type="button"
                  className="col-span-3 text-left"
                  onClick={() =>
                    navigate({
                      view: "customer-detail",
                      customerId: customer.id,
                    })
                  }
                >
                  <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                    {customer.name}
                  </p>
                </button>

                {/* Invoice ID */}
                <div className="col-span-2 text-xs text-muted-foreground font-mono">
                  #{invoice.id.slice(0, 8)}
                </div>

                {/* Issued */}
                <div className="col-span-2 text-xs text-muted-foreground">
                  {formatDate(invoice.dateIssued)}
                </div>

                {/* Due */}
                <div className="col-span-2 text-xs text-muted-foreground">
                  {formatDate(invoice.dueDate)}
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <StatusBadge status={invoice.status} />
                </div>

                {/* Actions */}
                <div className="col-span-1">
                  <InvoiceRowActions
                    invoice={invoice}
                    customer={customer}
                    onPreview={() => setPreviewInvoice({ invoice, customer })}
                    onMarkPaid={() => setMarkPaidInvoice({ invoice, customer })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Invoice Sheet */}
      <CreateInvoiceSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        customers={customers}
      />

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          open={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice.invoice}
          customer={previewInvoice.customer}
          settings={settings}
          logoUrl={logoUrl}
        />
      )}

      {/* Mark as Paid Dialog */}
      {markPaidInvoice && (
        <MarkAsPaidDialog
          open={!!markPaidInvoice}
          onClose={() => setMarkPaidInvoice(null)}
          invoice={markPaidInvoice.invoice}
          customerName={markPaidInvoice.customer.name}
        />
      )}
    </div>
  );
}
