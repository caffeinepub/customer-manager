import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Download,
  FileDown,
  Plus,
  Receipt,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { ExternalBlob } from "../backend";
import type { Customer, Invoice, Job, Visit } from "../backend.d.ts";
import { ExpenseFormSheet } from "../components/ExpenseFormSheet";
import { PageHeader } from "../components/PageHeader";
import { useActor } from "../hooks/useActor";
import {
  formatCurrency,
  formatDate,
  nsToDate,
  useAllExpenses,
  useCustomers,
  useDeleteExpense,
} from "../hooks/useQueries";

interface Props {
  navigate: (p: Page) => void;
}

// ─── Data Loading ─────────────────────────────────────────────

interface JobWithCustomer {
  job: Job;
  customer: Customer;
}

interface InvoiceWithCustomer {
  invoice: Invoice;
  customer: Customer;
}

function useAllFinancialData(customers: Customer[]) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["financials-all", customers.map((c) => c.id)],
    queryFn: async () => {
      if (!actor || customers.length === 0) {
        return {
          jobs: [] as JobWithCustomer[],
          invoices: [] as InvoiceWithCustomer[],
          visits: new Map<string, Visit[]>(),
        };
      }

      // Load all data in parallel per customer
      const customerData = await Promise.all(
        customers.map(async (customer) => {
          const [addresses, invoices] = await Promise.all([
            actor.listAddressesByCustomer(customer.id),
            actor.getInvoicesByCustomer(customer.id),
          ]);

          // Load jobs for all addresses in parallel
          const jobArrays = await Promise.all(
            addresses.map((addr) => actor.getJobsByAddress(addr.id)),
          );
          const jobs = jobArrays.flat();

          return { customer, jobs, invoices };
        }),
      );

      const allJobs: JobWithCustomer[] = [];
      const allInvoices: InvoiceWithCustomer[] = [];

      for (const { customer, jobs, invoices } of customerData) {
        for (const job of jobs) {
          allJobs.push({ job, customer });
        }
        for (const invoice of invoices) {
          allInvoices.push({ invoice, customer });
        }
      }

      // Load visits for all jobs in parallel
      const visitArrays = await Promise.all(
        allJobs.map(async ({ job }) => {
          const visits = await actor.listVisitsByJob(job.id);
          return { jobId: job.id, visits };
        }),
      );

      const visitMap = new Map<string, Visit[]>();
      for (const { jobId, visits } of visitArrays) {
        visitMap.set(jobId, visits);
      }

      return { jobs: allJobs, invoices: allInvoices, visits: visitMap };
    },
    enabled: !!actor && !isFetching && customers.length > 0,
    staleTime: 60_000,
  });
}

// ─── Export Helpers ───────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function triggerPrint(title: string): void {
  const printContent = document.getElementById("financials-print-target");
  if (!printContent) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 2px solid #e0e0e0; }
        td { padding: 8px 12px; border-bottom: 1px solid #e8e8e8; font-size: 12px; }
        tr:last-child td { border-bottom: none; }
        .totals-row td { font-weight: 700; background: #f9f9f9; border-top: 2px solid #e0e0e0; }
        .text-right { text-align: right; }
        .profit-pos { color: #166534; }
        .profit-neg { color: #991b1b; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="subtitle">Generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      ${printContent.innerHTML}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

function StatCard({ icon: Icon, label, value, sub, trend }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 shadow-card">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-lg font-bold text-foreground leading-tight">
            {value}
          </p>
          {trend === "up" && (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          {trend === "down" && (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
          )}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-700",
  invoiced: "bg-violet-500/10 text-violet-700",
  completed: "bg-blue-500/10 text-blue-700",
  in_progress: "bg-amber-500/10 text-amber-700",
  scheduled: "bg-sky-500/10 text-sky-700",
  lead: "bg-gray-500/10 text-gray-600",
  cancelled: "bg-red-500/10 text-red-700",
};

function StatusChip({ status }: { status: string }) {
  const colorClass =
    STATUS_COLORS[status] ?? "bg-secondary text-secondary-foreground";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}
    >
      {label}
    </span>
  );
}

// ─── By Job Tab ───────────────────────────────────────────────

interface JobRow {
  job: Job;
  customer: Customer;
  laborCost: number;
  revenue: number;
  profit: number;
}

interface ByJobTabProps {
  jobs: JobWithCustomer[];
  invoices: InvoiceWithCustomer[];
  visits: Map<string, Visit[]>;
  navigate: (p: Page) => void;
  onExportCSV: (rows: JobRow[]) => void;
  onExportPDF: () => void;
}

function ByJobTab({
  jobs,
  invoices,
  navigate,
  visits,
  onExportCSV,
  onExportPDF,
}: ByJobTabProps) {
  const rows = useMemo<JobRow[]>(() => {
    return jobs.map(({ job, customer }) => {
      const jobVisits = visits.get(job.id) ?? [];
      const laborCost = jobVisits.reduce((sum, v) => sum + v.laborCost, 0);

      const paidInvoices = invoices.filter(
        ({ invoice }) =>
          invoice.status === "paid" && invoice.jobIds.includes(job.id),
      );
      const revenue = paidInvoices.reduce(
        (sum, { invoice }) => sum + invoice.totalAmount,
        0,
      );
      const profit = revenue - job.cost;

      return { job, customer, laborCost, revenue, profit };
    });
  }, [jobs, invoices, visits]);

  const totalRevenue = useMemo(
    () => rows.reduce((s, r) => s + r.revenue, 0),
    [rows],
  );
  const totalCost = useMemo(
    () => rows.reduce((s, r) => s + r.job.cost, 0),
    [rows],
  );
  const totalProfit = useMemo(
    () => rows.reduce((s, r) => s + r.profit, 0),
    [rows],
  );

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Wallet}
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          sub="from paid invoices"
          trend="up"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Total Job Costs"
          value={formatCurrency(totalCost)}
          sub="across all jobs"
        />
        <StatCard
          icon={TrendingUp}
          label="Net Profit"
          value={formatCurrency(totalProfit)}
          sub="revenue minus costs"
          trend={totalProfit >= 0 ? "up" : "down"}
        />
      </div>

      {/* Print target */}
      <div id="financials-print-target" className="hidden">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Job ID</th>
              <th>Status</th>
              <th className="text-right">Labor Cost</th>
              <th className="text-right">Job Cost</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.job.id}>
                <td>{row.customer.name}</td>
                <td>{row.job.id.slice(0, 8)}</td>
                <td>{row.job.status}</td>
                <td className="text-right">{formatCurrency(row.laborCost)}</td>
                <td className="text-right">{formatCurrency(row.job.cost)}</td>
                <td className="text-right">{formatCurrency(row.revenue)}</td>
                <td
                  className={`text-right ${row.profit >= 0 ? "profit-pos" : "profit-neg"}`}
                >
                  {formatCurrency(row.profit)}
                </td>
              </tr>
            ))}
            <tr className="totals-row">
              <td colSpan={3}>
                <strong>Totals</strong>
              </td>
              <td className="text-right">
                {formatCurrency(rows.reduce((s, r) => s + r.laborCost, 0))}
              </td>
              <td className="text-right">{formatCurrency(totalCost)}</td>
              <td className="text-right">{formatCurrency(totalRevenue)}</td>
              <td className="text-right">{formatCurrency(totalProfit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Export controls */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button
          data-ocid="financials.export_pdf.button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onExportPDF}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </Button>
        <Button
          data-ocid="financials.export_csv.button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onExportCSV(rows)}
          disabled={rows.length === 0}
        >
          <FileDown className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div
          data-ocid="financials.empty_state"
          className="text-center py-20 text-muted-foreground"
        >
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-foreground/60">No job data yet</p>
          <p className="text-sm mt-1">
            Jobs will appear here once they are created
          </p>
        </div>
      ) : (
        <div
          data-ocid="financials.table"
          className="border border-border rounded-xl overflow-hidden shadow-card"
        >
          <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-13 gap-3 text-xs font-medium text-muted-foreground border-b border-border">
            <span className="col-span-3">Customer</span>
            <span className="col-span-2">Job ID</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1 text-right">Labor</span>
            <span className="col-span-1 text-right">Cost</span>
            <span className="col-span-2 text-right">Revenue</span>
            <span className="col-span-2 text-right">Profit</span>
          </div>
          {rows.map((row, idx) => (
            <div
              key={row.job.id}
              data-ocid={`financials.item.${idx + 1}`}
              className="px-4 py-3 grid grid-cols-13 gap-3 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0"
            >
              <button
                type="button"
                className="col-span-3 text-left"
                onClick={() =>
                  navigate({
                    view: "customer-detail",
                    customerId: row.customer.id,
                  })
                }
              >
                <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                  {row.customer.name}
                </p>
              </button>
              <div className="col-span-2 text-xs text-muted-foreground font-mono">
                #{row.job.id.slice(0, 8)}
              </div>
              <div className="col-span-2">
                <StatusChip status={row.job.status} />
              </div>
              <div className="col-span-1 text-xs text-right text-muted-foreground">
                {formatCurrency(row.laborCost)}
              </div>
              <div className="col-span-1 text-xs text-right text-muted-foreground">
                {formatCurrency(row.job.cost)}
              </div>
              <div className="col-span-2 text-sm font-semibold text-right text-foreground">
                {formatCurrency(row.revenue)}
              </div>
              <div
                className={`col-span-2 text-sm font-bold text-right ${row.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}
              >
                {row.profit >= 0 ? "+" : ""}
                {formatCurrency(row.profit)}
              </div>
            </div>
          ))}
          {/* Totals row */}
          <div className="px-4 py-3 grid grid-cols-13 gap-3 items-center bg-muted/40 border-t-2 border-border">
            <span className="col-span-5 text-xs font-bold text-foreground">
              Totals
            </span>
            <span className="col-span-2" />
            <div className="col-span-1 text-xs text-right font-bold text-foreground">
              {formatCurrency(rows.reduce((s, r) => s + r.laborCost, 0))}
            </div>
            <div className="col-span-1 text-xs text-right font-bold text-foreground">
              {formatCurrency(totalCost)}
            </div>
            <div className="col-span-2 text-sm text-right font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </div>
            <div
              className={`col-span-2 text-sm text-right font-bold ${totalProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}
            >
              {totalProfit >= 0 ? "+" : ""}
              {formatCurrency(totalProfit)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── By Customer Tab ──────────────────────────────────────────

interface CustomerRow {
  customer: Customer;
  jobCount: number;
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  totalJobCosts: number;
}

interface ByCustomerTabProps {
  jobs: JobWithCustomer[];
  invoices: InvoiceWithCustomer[];
  navigate: (p: Page) => void;
  onExportCSV: (rows: CustomerRow[]) => void;
  onExportPDF: () => void;
}

function ByCustomerTab({
  jobs,
  invoices,
  navigate,
  onExportCSV,
  onExportPDF,
}: ByCustomerTabProps) {
  const rows = useMemo<CustomerRow[]>(() => {
    const customerMap = new Map<
      string,
      {
        customer: Customer;
        jobCount: number;
        totalInvoiced: number;
        totalPaid: number;
        totalJobCosts: number;
      }
    >();

    // Aggregate jobs
    for (const { job, customer } of jobs) {
      const existing = customerMap.get(customer.id);
      if (existing) {
        existing.jobCount += 1;
        existing.totalJobCosts += job.cost;
      } else {
        customerMap.set(customer.id, {
          customer,
          jobCount: 1,
          totalInvoiced: 0,
          totalPaid: 0,
          totalJobCosts: job.cost,
        });
      }
    }

    // Aggregate invoices
    for (const { invoice, customer } of invoices) {
      const existing = customerMap.get(customer.id);
      if (existing) {
        existing.totalInvoiced += invoice.totalAmount;
        if (invoice.status === "paid") {
          existing.totalPaid += invoice.totalAmount;
        }
      } else {
        customerMap.set(customer.id, {
          customer,
          jobCount: 0,
          totalInvoiced: invoice.totalAmount,
          totalPaid: invoice.status === "paid" ? invoice.totalAmount : 0,
          totalJobCosts: 0,
        });
      }
    }

    return Array.from(customerMap.values()).map((v) => ({
      ...v,
      balanceDue: v.totalInvoiced - v.totalPaid,
    }));
  }, [jobs, invoices]);

  const totalRevenue = useMemo(
    () => rows.reduce((s, r) => s + r.totalPaid, 0),
    [rows],
  );
  const totalInvoiced = useMemo(
    () => rows.reduce((s, r) => s + r.totalInvoiced, 0),
    [rows],
  );
  const totalBalance = useMemo(
    () => rows.reduce((s, r) => s + r.balanceDue, 0),
    [rows],
  );

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Wallet}
          label="Total Invoiced"
          value={formatCurrency(totalInvoiced)}
          sub="across all customers"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Collected"
          value={formatCurrency(totalRevenue)}
          sub="from paid invoices"
          trend="up"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Outstanding Balance"
          value={formatCurrency(totalBalance)}
          sub="unpaid invoices"
          trend={totalBalance > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Print target */}
      <div id="financials-print-target" className="hidden">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th className="text-right"># Jobs</th>
              <th className="text-right">Total Invoiced</th>
              <th className="text-right">Total Paid</th>
              <th className="text-right">Balance Due</th>
              <th className="text-right">Job Costs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.customer.id}>
                <td>{row.customer.name}</td>
                <td className="text-right">{row.jobCount}</td>
                <td className="text-right">
                  {formatCurrency(row.totalInvoiced)}
                </td>
                <td className="text-right">{formatCurrency(row.totalPaid)}</td>
                <td className="text-right">{formatCurrency(row.balanceDue)}</td>
                <td className="text-right">
                  {formatCurrency(row.totalJobCosts)}
                </td>
              </tr>
            ))}
            <tr className="totals-row">
              <td>
                <strong>Totals</strong>
              </td>
              <td className="text-right">
                {rows.reduce((s, r) => s + r.jobCount, 0)}
              </td>
              <td className="text-right">{formatCurrency(totalInvoiced)}</td>
              <td className="text-right">{formatCurrency(totalRevenue)}</td>
              <td className="text-right">{formatCurrency(totalBalance)}</td>
              <td className="text-right">
                {formatCurrency(rows.reduce((s, r) => s + r.totalJobCosts, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Export controls */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button
          data-ocid="financials.export_pdf.button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onExportPDF}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </Button>
        <Button
          data-ocid="financials.export_csv.button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onExportCSV(rows)}
          disabled={rows.length === 0}
        >
          <FileDown className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div
          data-ocid="financials.empty_state"
          className="text-center py-20 text-muted-foreground"
        >
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-foreground/60">
            No customer data yet
          </p>
          <p className="text-sm mt-1">
            Add customers and create invoices to see data here
          </p>
        </div>
      ) : (
        <div
          data-ocid="financials.table"
          className="border border-border rounded-xl overflow-hidden shadow-card"
        >
          <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground border-b border-border">
            <span className="col-span-3">Customer</span>
            <span className="col-span-1 text-right"># Jobs</span>
            <span className="col-span-2 text-right">Invoiced</span>
            <span className="col-span-2 text-right">Paid</span>
            <span className="col-span-2 text-right">Balance Due</span>
            <span className="col-span-2 text-right">Job Costs</span>
          </div>
          {rows.map((row, idx) => (
            <div
              key={row.customer.id}
              data-ocid={`financials.item.${idx + 1}`}
              className="px-4 py-3 grid grid-cols-12 gap-3 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0"
            >
              <button
                type="button"
                className="col-span-3 text-left"
                onClick={() =>
                  navigate({
                    view: "customer-detail",
                    customerId: row.customer.id,
                  })
                }
              >
                <p className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate">
                  {row.customer.name}
                </p>
                {row.customer.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {row.customer.email}
                  </p>
                )}
              </button>
              <div className="col-span-1 text-sm text-right text-muted-foreground font-medium">
                {row.jobCount}
              </div>
              <div className="col-span-2 text-sm text-right text-foreground">
                {formatCurrency(row.totalInvoiced)}
              </div>
              <div className="col-span-2 text-sm text-right font-semibold text-emerald-700">
                {formatCurrency(row.totalPaid)}
              </div>
              <div
                className={`col-span-2 text-sm text-right font-semibold ${row.balanceDue > 0 ? "text-amber-600" : "text-muted-foreground"}`}
              >
                {formatCurrency(row.balanceDue)}
              </div>
              <div className="col-span-2 text-sm text-right text-muted-foreground">
                {formatCurrency(row.totalJobCosts)}
              </div>
            </div>
          ))}
          {/* Totals row */}
          <div className="px-4 py-3 grid grid-cols-12 gap-3 items-center bg-muted/40 border-t-2 border-border">
            <span className="col-span-3 text-xs font-bold text-foreground">
              Totals
            </span>
            <div className="col-span-1 text-sm text-right font-bold text-foreground">
              {rows.reduce((s, r) => s + r.jobCount, 0)}
            </div>
            <div className="col-span-2 text-sm text-right font-bold text-foreground">
              {formatCurrency(totalInvoiced)}
            </div>
            <div className="col-span-2 text-sm text-right font-bold text-emerald-700">
              {formatCurrency(totalRevenue)}
            </div>
            <div
              className={`col-span-2 text-sm text-right font-bold ${totalBalance > 0 ? "text-amber-600" : "text-muted-foreground"}`}
            >
              {formatCurrency(totalBalance)}
            </div>
            <div className="col-span-2 text-sm text-right font-bold text-foreground">
              {formatCurrency(rows.reduce((s, r) => s + r.totalJobCosts, 0))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Summary Tab ──────────────────────────────────────────────

type PeriodMode = "quarterly" | "annual";

interface PeriodRow {
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

interface SummaryTabProps {
  invoices: InvoiceWithCustomer[];
  jobs: JobWithCustomer[];
  onExportCSV: (rows: PeriodRow[], period: PeriodMode, year: number) => void;
  onExportPDF: () => void;
}

function SummaryTab({
  invoices,
  jobs,
  onExportCSV,
  onExportPDF,
}: SummaryTabProps) {
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState<PeriodMode>("quarterly");
  const [year, setYear] = useState<number>(currentYear);

  const years = useMemo<number[]>(() => {
    const y: number[] = [];
    for (let i = currentYear; i >= currentYear - 3; i--) y.push(i);
    return y;
  }, [currentYear]);

  const rows = useMemo<PeriodRow[]>(() => {
    if (period === "quarterly") {
      const quarters: PeriodRow[] = [
        { label: "Q1 (Jan–Mar)", revenue: 0, expenses: 0, netProfit: 0 },
        { label: "Q2 (Apr–Jun)", revenue: 0, expenses: 0, netProfit: 0 },
        { label: "Q3 (Jul–Sep)", revenue: 0, expenses: 0, netProfit: 0 },
        { label: "Q4 (Oct–Dec)", revenue: 0, expenses: 0, netProfit: 0 },
      ];

      for (const { invoice } of invoices) {
        if (invoice.status !== "paid") continue;
        const d = nsToDate(invoice.dateIssued);
        if (d.getFullYear() !== year) continue;
        const q = Math.floor(d.getMonth() / 3);
        quarters[q].revenue += invoice.totalAmount;
      }

      for (const { job } of jobs) {
        const d = nsToDate(job.startTime);
        if (d.getFullYear() !== year) continue;
        const q = Math.floor(d.getMonth() / 3);
        quarters[q].expenses += job.cost;
      }

      for (const q of quarters) {
        q.netProfit = q.revenue - q.expenses;
      }
      return quarters;
    }

    // Annual mode — last 4 years
    const annualMap = new Map<number, PeriodRow>();
    for (const y of years) {
      annualMap.set(y, {
        label: y.toString(),
        revenue: 0,
        expenses: 0,
        netProfit: 0,
      });
    }

    for (const { invoice } of invoices) {
      if (invoice.status !== "paid") continue;
      const d = nsToDate(invoice.dateIssued);
      const row = annualMap.get(d.getFullYear());
      if (row) row.revenue += invoice.totalAmount;
    }

    for (const { job } of jobs) {
      const d = nsToDate(job.startTime);
      const row = annualMap.get(d.getFullYear());
      if (row) row.expenses += job.cost;
    }

    const result = Array.from(annualMap.values());
    for (const r of result) {
      r.netProfit = r.revenue - r.expenses;
    }
    return result;
  }, [invoices, jobs, period, year, years]);

  const totalRevenue = useMemo(
    () => rows.reduce((s, r) => s + r.revenue, 0),
    [rows],
  );
  const totalExpenses = useMemo(
    () => rows.reduce((s, r) => s + r.expenses, 0),
    [rows],
  );
  const totalProfit = useMemo(
    () => rows.reduce((s, r) => s + r.netProfit, 0),
    [rows],
  );

  const periodLabel = period === "quarterly" ? `Q${year}` : "Annual";

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div
          data-ocid="financials.period.toggle"
          className="flex rounded-lg border border-border overflow-hidden"
        >
          {(["quarterly", "annual"] as PeriodMode[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-accent"
              }`}
            >
              {p === "quarterly" ? "Quarterly" : "Annual"}
            </button>
          ))}
        </div>

        {period === "quarterly" && (
          <Select
            value={year.toString()}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger
              data-ocid="financials.year.select"
              className="w-28 h-9 text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Wallet}
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          sub={period === "quarterly" ? `in ${year}` : "across all years"}
          trend="up"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Total Expenses"
          value={formatCurrency(totalExpenses)}
          sub="job costs"
        />
        <StatCard
          icon={TrendingUp}
          label="Net Profit"
          value={formatCurrency(totalProfit)}
          sub="revenue minus expenses"
          trend={totalProfit >= 0 ? "up" : "down"}
        />
      </div>

      {/* Print target */}
      <div id="financials-print-target" className="hidden">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Expenses</th>
              <th className="text-right">Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="text-right">{formatCurrency(row.revenue)}</td>
                <td className="text-right">{formatCurrency(row.expenses)}</td>
                <td
                  className={`text-right ${row.netProfit >= 0 ? "profit-pos" : "profit-neg"}`}
                >
                  {formatCurrency(row.netProfit)}
                </td>
              </tr>
            ))}
            <tr className="totals-row">
              <td>
                <strong>Totals</strong>
              </td>
              <td className="text-right">{formatCurrency(totalRevenue)}</td>
              <td className="text-right">{formatCurrency(totalExpenses)}</td>
              <td className="text-right">{formatCurrency(totalProfit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Export controls */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button
          data-ocid="financials.export_pdf.button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onExportPDF}
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </Button>
        <Button
          data-ocid="financials.export_csv.button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onExportCSV(rows, period, year)}
        >
          <FileDown className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div
        data-ocid="financials.table"
        className="border border-border rounded-xl overflow-hidden shadow-card"
      >
        <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground border-b border-border">
          <span className="col-span-3">Period</span>
          <span className="col-span-3 text-right">Revenue</span>
          <span className="col-span-3 text-right">Expenses</span>
          <span className="col-span-3 text-right">Net Profit</span>
        </div>
        {rows.map((row, idx) => (
          <div
            key={row.label}
            data-ocid={`financials.item.${idx + 1}`}
            className="px-4 py-3.5 grid grid-cols-12 gap-4 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0"
          >
            <div className="col-span-3 text-sm font-semibold text-foreground">
              {row.label}
            </div>
            <div className="col-span-3 text-sm text-right font-medium text-foreground">
              {formatCurrency(row.revenue)}
            </div>
            <div className="col-span-3 text-sm text-right text-muted-foreground">
              {formatCurrency(row.expenses)}
            </div>
            <div
              className={`col-span-3 text-sm text-right font-bold ${row.netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}
            >
              {row.netProfit >= 0 ? "+" : ""}
              {formatCurrency(row.netProfit)}
            </div>
          </div>
        ))}
        {/* Totals row */}
        <div className="px-4 py-3.5 grid grid-cols-12 gap-4 items-center bg-muted/40 border-t-2 border-border">
          <span className="col-span-3 text-xs font-bold text-foreground">
            Totals — {periodLabel}
          </span>
          <div className="col-span-3 text-sm text-right font-bold text-foreground">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="col-span-3 text-sm text-right font-bold text-foreground">
            {formatCurrency(totalExpenses)}
          </div>
          <div
            className={`col-span-3 text-sm text-right font-bold ${totalProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}
          >
            {totalProfit >= 0 ? "+" : ""}
            {formatCurrency(totalProfit)}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  fuel: "Fuel",
  dump_fee: "Dump Fee",
  tool: "Tool / Equipment",
  supplies: "Supplies",
  other: "Other",
};

function ExpensesTab() {
  const { data: expenses = [], isLoading } = useAllExpenses();
  const deleteExpense = useDeleteExpense();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingExpense = useMemo(
    () => (editingId ? expenses.find((e) => e.id === editingId) : undefined),
    [editingId, expenses],
  );

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        !search ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.vendorName?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCategory =
        filterCategory === "all" || e.expenseType === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, filterCategory]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      map.set(e.expenseType, (map.get(e.expenseType) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  async function handleDelete(id: string) {
    try {
      await deleteExpense.mutateAsync(id);
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete expense");
    }
  }

  function exportExpensesCSV() {
    const header = ["Date", "Category", "Description", "Vendor", "Amount"];
    const rows = filtered.map((e) => [
      format(new Date(Number(e.dateIncurred / 1_000_000n)), "yyyy-MM-dd"),
      e.expenseType,
      e.description,
      e.vendorName ?? "",
      e.amount.toFixed(2),
    ]);
    const csvContent = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div data-ocid="financials.expenses.loading_state" className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={Wallet}
          label="Total Expenses"
          value={formatCurrency(totalAmount)}
          sub={`${filtered.length} entries`}
        />
        {byCategory.slice(0, 3).map(([cat, amount]) => (
          <StatCard
            key={cat}
            icon={Receipt}
            label={EXPENSE_CATEGORY_LABELS[cat] ?? cat}
            value={formatCurrency(amount)}
            sub={`${filtered.filter((e) => e.expenseType === cat).length} entries`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            data-ocid="financials.expenses.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger
            data-ocid="financials.expenses.select"
            className="w-40 h-9 text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          data-ocid="financials.expenses.export_csv.button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-9"
          onClick={exportExpensesCSV}
          disabled={filtered.length === 0}
        >
          <FileDown className="w-3.5 h-3.5" />
          CSV
        </Button>

        <Button
          data-ocid="financials.expenses.add_button"
          size="sm"
          className="gap-1.5 h-9"
          onClick={() => {
            setEditingId(null);
            setAddOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          data-ocid="financials.expenses.empty_state"
          className="text-center py-20 text-muted-foreground"
        >
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-foreground/60">No expenses found</p>
          <p className="text-sm mt-1">
            Add expenses or adjust your search filters
          </p>
        </div>
      ) : (
        <div
          data-ocid="financials.expenses.table"
          className="border border-border rounded-xl overflow-hidden shadow-card"
        >
          <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground border-b border-border">
            <span className="col-span-2">Date</span>
            <span className="col-span-2">Category</span>
            <span className="col-span-4">Description / Vendor</span>
            <span className="col-span-2 text-right">Amount</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>
          {filtered.map((expense, idx) => (
            <div
              key={expense.id}
              data-ocid={`financials.expenses.item.${idx + 1}`}
              className="px-4 py-3 grid grid-cols-12 gap-3 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0"
            >
              <div className="col-span-2 text-xs text-muted-foreground">
                {format(
                  new Date(Number(expense.dateIncurred / 1_000_000n)),
                  "MMM d, yyyy",
                )}
              </div>
              <div className="col-span-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {expense.expenseType.replace("_", " ")}
                </Badge>
              </div>
              <div className="col-span-4 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {expense.description}
                </p>
                {expense.vendorName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {expense.vendorName}
                  </p>
                )}
                {expense.receiptBlobId && (
                  <div className="mt-1 w-10 h-7 rounded border border-border overflow-hidden">
                    <img
                      src={ExternalBlob.fromURL(
                        expense.receiptBlobId,
                      ).getDirectURL()}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="col-span-2 text-sm font-bold text-right text-foreground">
                {formatCurrency(expense.amount)}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                <Button
                  data-ocid={`financials.expenses.edit_button.${idx + 1}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEditingId(expense.id);
                    setAddOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  data-ocid={`financials.expenses.delete_button.${idx + 1}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(expense.id)}
                  disabled={deleteExpense.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {/* Totals row */}
          <div className="px-4 py-3 grid grid-cols-12 gap-3 items-center bg-muted/40 border-t-2 border-border">
            <span className="col-span-8 text-xs font-bold text-foreground">
              Total ({filtered.length} expenses)
            </span>
            <div className="col-span-2 text-sm text-right font-bold text-foreground">
              {formatCurrency(totalAmount)}
            </div>
            <span className="col-span-2" />
          </div>
        </div>
      )}

      {/* Add / Edit Expense Sheet */}
      <ExpenseFormSheet
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditingId(null);
        }}
        expense={editingExpense}
      />
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function FinancialsPage({ navigate }: Props) {
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: financialData, isLoading: dataLoading } =
    useAllFinancialData(customers);

  const isLoading = customersLoading || dataLoading;

  const jobs = financialData?.jobs ?? [];
  const invoices = financialData?.invoices ?? [];
  const visits = financialData?.visits ?? new Map<string, Visit[]>();

  const [activeTab, setActiveTab] = useState("by-job");

  // ── CSV exporters ────────────────────────────────────────────

  function exportJobsCSV(rows: JobRow[]) {
    const header = [
      "Customer",
      "Job ID",
      "Status",
      "Labor Cost",
      "Job Cost",
      "Revenue",
      "Profit",
    ];
    const dataRows = rows.map((r) => [
      r.customer.name,
      r.job.id.slice(0, 8),
      r.job.status,
      r.laborCost.toFixed(2),
      r.job.cost.toFixed(2),
      r.revenue.toFixed(2),
      r.profit.toFixed(2),
    ]);
    downloadCSV(`financials-by-job-${new Date().getFullYear()}.csv`, [
      header,
      ...dataRows,
    ]);
  }

  function exportCustomersCSV(rows: CustomerRow[]) {
    const header = [
      "Customer",
      "# Jobs",
      "Total Invoiced",
      "Total Paid",
      "Balance Due",
      "Job Costs",
    ];
    const dataRows = rows.map((r) => [
      r.customer.name,
      r.jobCount.toString(),
      r.totalInvoiced.toFixed(2),
      r.totalPaid.toFixed(2),
      r.balanceDue.toFixed(2),
      r.totalJobCosts.toFixed(2),
    ]);
    downloadCSV(`financials-by-customer-${new Date().getFullYear()}.csv`, [
      header,
      ...dataRows,
    ]);
  }

  function exportSummaryCSV(
    rows: PeriodRow[],
    periodMode: PeriodMode,
    selectedYear: number,
  ) {
    const header = ["Period", "Revenue", "Expenses", "Net Profit"];
    const dataRows = rows.map((r) => [
      r.label,
      r.revenue.toFixed(2),
      r.expenses.toFixed(2),
      r.netProfit.toFixed(2),
    ]);
    const suffix = periodMode === "quarterly" ? `q-${selectedYear}` : "annual";
    downloadCSV(`financials-summary-${suffix}.csv`, [header, ...dataRows]);
  }

  // ── PDF exporter ────────────────────────────────────────────

  const tabTitles: Record<string, string> = {
    "by-job": "Financial Report — By Job",
    "by-customer": "Financial Report — By Customer",
    summary: "Financial Report — Summary",
  };

  function handleExportPDF() {
    triggerPrint(tabTitles[activeTab] ?? "Financial Report");
  }

  return (
    <div className="min-h-full" data-ocid="financials.page">
      <PageHeader
        title="Financials"
        description="Bookkeeping & tax preparation"
        action={
          <div className="flex items-center gap-2">
            <Button
              data-ocid="financials.export_pdf.button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportPDF}
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
            <Button
              data-ocid="financials.export_csv.button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                // Delegate to active tab's export
                const event = new CustomEvent("financials-export-csv");
                window.dispatchEvent(event);
              }}
            >
              <FileDown className="w-3.5 h-3.5" />
              CSV
            </Button>
          </div>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div data-ocid="financials.loading_state" className="space-y-6">
            {/* Stat skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
            {/* Table skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-xl grid-cols-4">
              <TabsTrigger data-ocid="financials.tab.by_job" value="by-job">
                By Job
              </TabsTrigger>
              <TabsTrigger
                data-ocid="financials.tab.by_customer"
                value="by-customer"
              >
                By Customer
              </TabsTrigger>
              <TabsTrigger data-ocid="financials.tab.summary" value="summary">
                Summary
              </TabsTrigger>
              <TabsTrigger data-ocid="financials.tab.expenses" value="expenses">
                Expenses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="by-job" className="mt-0">
              <ByJobTab
                jobs={jobs}
                invoices={invoices}
                visits={visits}
                navigate={navigate}
                onExportCSV={exportJobsCSV}
                onExportPDF={handleExportPDF}
              />
            </TabsContent>

            <TabsContent value="by-customer" className="mt-0">
              <ByCustomerTab
                jobs={jobs}
                invoices={invoices}
                navigate={navigate}
                onExportCSV={exportCustomersCSV}
                onExportPDF={handleExportPDF}
              />
            </TabsContent>

            <TabsContent value="summary" className="mt-0">
              <SummaryTab
                invoices={invoices}
                jobs={jobs}
                onExportCSV={exportSummaryCSV}
                onExportPDF={handleExportPDF}
              />
            </TabsContent>

            <TabsContent value="expenses" className="mt-0">
              <ExpensesTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
