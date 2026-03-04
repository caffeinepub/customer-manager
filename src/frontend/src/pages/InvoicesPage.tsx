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
import { ChevronDown, Download, FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { Page } from "../App";
import type { Customer } from "../backend.d.ts";
import { CreateInvoiceSheet } from "../components/CreateInvoiceSheet";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActor } from "../hooks/useActor";
import { formatCurrency, formatDate, useCustomers } from "../hooks/useQueries";

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

// ─── Main Component ───────────────────────────────────────────
export function InvoicesPage({ navigate }: Props) {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: allInvoices = [], isLoading: invLoading } =
    useAllInvoices(customers);
  const [showCreate, setShowCreate] = useState(false);
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

      <CreateInvoiceSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        customers={customers}
      />
    </div>
  );
}
