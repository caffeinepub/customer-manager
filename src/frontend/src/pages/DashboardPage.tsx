import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { StatusBadge } from "../components/StatusBadge";
import { useActor } from "../hooks/useActor";
import {
  formatCurrency,
  formatDate,
  useCustomers,
  useLoadSeedData,
} from "../hooks/useQueries";
import { useInvoicesByCustomer } from "../hooks/useQueries";

interface Props {
  navigate: (p: Page) => void;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-display font-bold text-foreground">
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentInvoicesWidget({ navigate }: { navigate: (p: Page) => void }) {
  const { data: customers = [] } = useCustomers();
  // Grab invoices from first 3 customers for demo
  const first3 = customers.slice(0, 3);

  if (first3.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground text-sm"
        data-ocid="invoices.empty_state"
      >
        No invoices yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {first3.map((c) => (
        <InvoiceRow
          key={c.id}
          customerId={c.id}
          customerName={c.name}
          navigate={navigate}
        />
      ))}
    </div>
  );
}

function InvoiceRow({
  customerId,
  customerName,
  navigate,
}: {
  customerId: string;
  customerName: string;
  navigate: (p: Page) => void;
}) {
  const { data: invoices = [] } = useInvoicesByCustomer(customerId);
  if (invoices.length === 0) return null;
  const latest = invoices[0];
  return (
    <button
      type="button"
      onClick={() => navigate({ view: "customer-detail", customerId })}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{customerName}</p>
        <p className="text-xs text-muted-foreground">
          Due {formatDate(latest.dueDate)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(latest.totalAmount)}
        </span>
        <StatusBadge status={latest.status} />
      </div>
    </button>
  );
}

export function DashboardPage({ navigate }: Props) {
  const { data: customers = [], isLoading } = useCustomers();
  const loadSeed = useLoadSeedData();
  const [seeded, setSeeded] = useState(false);
  const qc = useQueryClient();
  const { actor } = useActor();

  const isEmpty = !isLoading && customers.length === 0 && !seeded;

  async function handleLoadSeed() {
    try {
      await loadSeed.mutateAsync();
      await qc.invalidateQueries({ queryKey: ["customers"] });
      await qc.refetchQueries({ queryKey: ["customers"] });
      setSeeded(true);
      toast.success("Sample data loaded successfully!");
    } catch {
      toast.error("Failed to load sample data");
    }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card/30">
        <h1 className="font-display text-xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back — here's your business overview
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Seed data banner */}
        {isEmpty && (
          <Card className="border-2 border-primary/20 bg-accent/30 shadow-none">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sprout className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-foreground">
                    Get started with sample data
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Load realistic customers, jobs, and invoices to explore the
                    app.
                  </p>
                </div>
                <Button
                  data-ocid="dashboard.load_seed_button"
                  onClick={handleLoadSeed}
                  disabled={loadSeed.isPending || !actor}
                  className="shrink-0"
                >
                  {loadSeed.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <Sprout className="mr-2 w-4 h-4" />
                      Load Sample Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title="Active Customers"
            value={customers.filter((c) => c.isActive).length}
            icon={Users}
            color="bg-primary/10 text-primary"
            loading={isLoading}
          />
          <SummaryCard
            title="Total Customers"
            value={customers.length}
            icon={TrendingUp}
            color="bg-chart-2/20 text-chart-2"
            loading={isLoading}
          />
          <SummaryCard
            title="Data Loaded"
            value={customers.length > 0 ? "Yes" : "No"}
            icon={CheckCircle2}
            color="bg-chart-1/20 text-chart-1"
            loading={isLoading}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="font-display font-semibold text-foreground mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate({ view: "customers" })}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </Button>
            <Button
              onClick={() => navigate({ view: "jobs" })}
              variant="outline"
              className="gap-2"
            >
              <Briefcase className="w-4 h-4" />
              View Jobs
            </Button>
            <Button
              onClick={() => navigate({ view: "invoices" })}
              variant="outline"
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              View Invoices
            </Button>
            <Button
              onClick={() => navigate({ view: "services" })}
              variant="outline"
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              Manage Services
            </Button>
          </div>
        </div>

        {/* Customers Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Recent Customers
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ view: "customers" })}
                  className="text-xs text-primary"
                >
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : customers.length === 0 ? (
                <div
                  className="text-center py-8 text-muted-foreground text-sm"
                  data-ocid="customers.empty_state"
                >
                  No customers yet. Load sample data or add your first customer.
                </div>
              ) : (
                <div className="space-y-1">
                  {customers.slice(0, 5).map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() =>
                        navigate({ view: "customer-detail", customerId: c.id })
                      }
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.email}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={c.isActive ? "active" : "inactive"}
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Recent Invoices
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ view: "invoices" })}
                  className="text-xs text-primary"
                >
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <RecentInvoicesWidget navigate={navigate} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
