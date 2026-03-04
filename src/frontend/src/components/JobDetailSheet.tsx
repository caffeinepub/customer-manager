import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Briefcase,
  CalendarDays,
  DollarSign,
  FileText,
  MapPin,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { Address, Customer, Job } from "../backend.d.ts";
import {
  formatCurrency,
  formatDate,
  nsToDate,
  useCustomers,
  useListVisitsByJob,
} from "../hooks/useQueries";
import { CreateInvoiceSheet, type LineItem } from "./CreateInvoiceSheet";
import { StatusBadge } from "./StatusBadge";
import { VisitCard } from "./VisitCard";
import { VisitFormSheet } from "./VisitFormSheet";

interface JobDetailSheetProps {
  open: boolean;
  onClose: () => void;
  jobEntry: { job: Job; customer: Customer; address?: Address } | null;
}

export function JobDetailSheet({
  open,
  onClose,
  jobEntry,
}: JobDetailSheetProps) {
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false);
  const [pendingLineItems, setPendingLineItems] = useState<LineItem[]>([]);
  const [pendingNotes, setPendingNotes] = useState("");

  const { data: visits = [], isLoading: visitsLoading } = useListVisitsByJob(
    jobEntry?.job.id ?? "",
  );

  const { data: customers = [] } = useCustomers();

  if (!jobEntry) return null;

  const { job, customer, address } = jobEntry;

  const completedVisits = visits.filter((v) => v.status === "completed");

  function handleGenerateInvoice() {
    const lineItems: LineItem[] = completedVisits.map((v) => {
      const dateStr = format(nsToDate(v.scheduledDate), "MMM d, yyyy");
      return {
        id: crypto.randomUUID(),
        type: "labor" as const,
        description: `Visit on ${dateStr}${v.notes ? `: ${v.notes}` : ""}`,
        quantity: v.laborHours,
        unitPrice: v.laborRate,
      };
    });

    const addressParts = [address?.street, address?.city]
      .filter(Boolean)
      .join(", ");
    const notes = addressParts
      ? `Generated from job visits at ${addressParts}`
      : "Generated from job visits";

    setPendingLineItems(lineItems);
    setPendingNotes(notes);
    setInvoiceSheetOpen(true);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          data-ocid="jobs.detail.sheet"
          className="w-full sm:max-w-xl overflow-y-auto"
          side="right"
        >
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <SheetTitle className="font-display text-lg leading-tight">
                  {customer.name}
                </SheetTitle>
                {address && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {address.street}, {address.city}, {address.state}
                    </span>
                  </div>
                )}
              </div>
              <StatusBadge status={job.status} />
            </div>
          </SheetHeader>

          {/* Job summary cards */}
          <div className="py-4 grid grid-cols-2 gap-3 border-b border-border">
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <DollarSign className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Job Cost</p>
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(job.cost)}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-sm font-bold text-foreground">
                  {formatDate(job.startTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Visits section */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-sm text-foreground">
                Visits
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  data-ocid="jobs.detail.generate_invoice_button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  disabled={completedVisits.length === 0}
                  onClick={handleGenerateInvoice}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generate Invoice
                </Button>
                <Button
                  data-ocid="visit.add_button"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setAddVisitOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Visit
                </Button>
              </div>
            </div>

            {visitsLoading ? (
              <div data-ocid="jobs.detail.loading_state" className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : visits.length === 0 ? (
              <div
                data-ocid="visit.empty_state"
                className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border"
              >
                <Briefcase className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  No visits yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Add a visit to track time, labor, and photos
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 text-xs h-8"
                  onClick={() => setAddVisitOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add First Visit
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visits.map((v, idx) => (
                  <VisitCard key={v.id} visit={v} index={idx + 1} />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Visit Sheet — rendered outside the main sheet to avoid nesting */}
      <VisitFormSheet
        open={addVisitOpen}
        onClose={() => setAddVisitOpen(false)}
        jobId={job.id}
      />

      {/* Generate Invoice Sheet — rendered outside the main sheet to avoid nesting */}
      <CreateInvoiceSheet
        open={invoiceSheetOpen}
        onClose={() => setInvoiceSheetOpen(false)}
        customers={customers}
        initialCustomerId={customer.id}
        initialLineItems={pendingLineItems}
        initialNotes={pendingNotes}
      />
    </>
  );
}
