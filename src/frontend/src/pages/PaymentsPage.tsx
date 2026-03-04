import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, DollarSign, Hash, Search, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { Page } from "../App";
import type { Customer } from "../backend.d.ts";
import { PageHeader } from "../components/PageHeader";
import { useActor } from "../hooks/useActor";
import { formatCurrency, formatDate, useCustomers } from "../hooks/useQueries";

interface Props {
  navigate: (p: Page) => void;
}

// ─── Load all paid invoices across customers ───────────────────
function useAllPaidInvoices(customers: Customer[]) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["all-paid-invoices", customers.map((c) => c.id)],
    queryFn: async () => {
      if (!actor || customers.length === 0) return [];
      const results = await Promise.all(
        customers.map(async (customer) => {
          const invoices = await actor.getInvoicesByCustomer(customer.id);
          return invoices
            .filter((inv) => inv.status === "paid")
            .map((inv) => ({ invoice: inv, customer }));
        }),
      );
      return results.flat().sort((a, b) => {
        // Sort by dateIssued descending
        return Number(b.invoice.dateIssued - a.invoice.dateIssued);
      });
    },
    enabled: !!actor && !isFetching && customers.length > 0,
    staleTime: 30_000,
  });
}

// ─── Stat Card ────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ icon: Icon, label, value, sub }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-card">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight mt-0.5">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Method badge ─────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  cash: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  check: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  card: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  transfer: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  other: "bg-secondary text-secondary-foreground",
};

function MethodBadge({ method }: { method: string }) {
  const colorClass = METHOD_COLORS[method] ?? METHOD_COLORS.other;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {method === "—" ? "—" : method.charAt(0).toUpperCase() + method.slice(1)}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function PaymentsPage({ navigate }: Props) {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: paidInvoices = [], isLoading: invoicesLoading } =
    useAllPaidInvoices(customers);

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const isLoading = customersLoading || invoicesLoading;

  // Derive stats
  const totalCollected = useMemo(
    () =>
      paidInvoices.reduce((sum, { invoice }) => sum + invoice.totalAmount, 0),
    [paidInvoices],
  );
  const avgPayment = useMemo(
    () => (paidInvoices.length > 0 ? totalCollected / paidInvoices.length : 0),
    [totalCollected, paidInvoices.length],
  );

  // Filter
  const filtered = useMemo(() => {
    let items = paidInvoices;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        ({ invoice, customer }) =>
          customer.name.toLowerCase().includes(q) ||
          invoice.id.toLowerCase().includes(q),
      );
    }
    // Method filter: since Invoice has no paymentMethod, "all" shows everything,
    // other tabs are future-proof placeholders (no data yet)
    if (methodFilter !== "all") {
      items = []; // no method data available yet
    }
    return items;
  }, [paidInvoices, search, methodFilter]);

  const METHOD_TABS = ["all", "cash", "check", "card", "transfer", "other"];

  return (
    <div className="min-h-full" data-ocid="payments.page">
      <PageHeader
        title="Payments"
        description={`${paidInvoices.length} payment${paidInvoices.length !== 1 ? "s" : ""} recorded`}
      />

      <div className="p-6 space-y-6">
        {/* Stats row */}
        {isLoading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            data-ocid="payments.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={DollarSign}
              label="Total Collected"
              value={formatCurrency(totalCollected)}
              sub="from paid invoices"
            />
            <StatCard
              icon={Hash}
              label="Payments Recorded"
              value={paidInvoices.length.toString()}
              sub={paidInvoices.length === 1 ? "payment" : "payments total"}
            />
            <StatCard
              icon={TrendingUp}
              label="Average Payment"
              value={formatCurrency(avgPayment)}
              sub="per paid invoice"
            />
          </div>
        )}

        {/* Search + filter */}
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              data-ocid="payments.search_input"
              placeholder="Search by customer or invoice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Method tabs */}
          <div className="flex flex-wrap gap-2">
            {METHOD_TABS.map((m) => (
              <button
                type="button"
                key={m}
                data-ocid={m === "all" ? "payments.filter.tab" : undefined}
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  methodFilter === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {m === "all" ? "All" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="payments.empty_state"
            className="text-center py-20 text-muted-foreground"
          >
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="font-semibold text-foreground/60">
              {search || methodFilter !== "all"
                ? "No payments match your filters"
                : "No payments recorded yet"}
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              {search || methodFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Payments appear here once invoices are marked as paid"}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden shadow-card">
            {/* Header */}
            <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground border-b border-border">
              <span className="col-span-3">Customer</span>
              <span className="col-span-2">Invoice #</span>
              <span className="col-span-2">Date Paid</span>
              <span className="col-span-2">Amount</span>
              <span className="col-span-2">Method</span>
              <span className="col-span-1">Notes</span>
            </div>

            {filtered.map(({ invoice, customer }, idx) => (
              <div
                key={invoice.id}
                data-ocid={`payments.item.${idx + 1}`}
                className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0"
              >
                {/* Customer */}
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

                {/* Invoice # */}
                <div className="col-span-2 text-xs text-muted-foreground font-mono">
                  #{invoice.id.slice(0, 8)}
                </div>

                {/* Date Paid */}
                <div className="col-span-2 text-xs text-muted-foreground">
                  {formatDate(invoice.dateIssued)}
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>

                {/* Method */}
                <div className="col-span-2">
                  <MethodBadge method="—" />
                </div>

                {/* Notes */}
                <div className="col-span-1 text-xs text-muted-foreground truncate">
                  {invoice.notes ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
