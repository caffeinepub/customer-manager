import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  ImageIcon,
  MapPin,
  Plus,
  Receipt,
  TrendingDown,
  X,
} from "lucide-react";
import { useState } from "react";
import { ExternalBlob } from "../backend";
import type { Address, Customer, Job } from "../backend.d.ts";
import {
  formatCurrency,
  formatDate,
  nsToDate,
  useCustomers,
  useExpensesByJob,
  useListVisitsByJob,
} from "../hooks/useQueries";
import { CreateInvoiceSheet, type LineItem } from "./CreateInvoiceSheet";
import { ExpenseFormSheet } from "./ExpenseFormSheet";
import { StatusBadge } from "./StatusBadge";
import { VisitCard } from "./VisitCard";
import { VisitFormSheet } from "./VisitFormSheet";

interface JobDetailSheetProps {
  open: boolean;
  onClose: () => void;
  jobEntry: { job: Job; customer: Customer; address?: Address } | null;
}

// ─── Photo Lightbox ───────────────────────────────────────────

interface LightboxItem {
  blobId: string;
  visitDate: string;
}

interface PhotoLightboxProps {
  items: LightboxItem[];
  initialIndex: number;
  onClose: () => void;
}

function PhotoLightbox({ items, initialIndex, onClose }: PhotoLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);

  function prev() {
    setCurrent((i) => (i - 1 + items.length) % items.length);
  }
  function next() {
    setCurrent((i) => (i + 1) % items.length);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="job.photo.dialog"
        className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none"
      >
        <div className="relative flex items-center justify-center min-h-[50vh] max-h-[80vh]">
          <button
            data-ocid="job.photo.close_button"
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {items.length > 1 && (
            <button
              data-ocid="job.photo.pagination_prev"
              type="button"
              onClick={prev}
              className="absolute left-3 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col items-center">
            <img
              src={ExternalBlob.fromURL(items[current].blobId).getDirectURL()}
              alt={`Visit on ${items[current].visitDate}`}
              className="max-w-full max-h-[70vh] object-contain"
            />
            <p className="text-white/60 text-xs mt-2 pb-2">
              Visit: {items[current].visitDate}
            </p>
          </div>

          {items.length > 1 && (
            <button
              data-ocid="job.photo.pagination_next"
              type="button"
              onClick={next}
              className="absolute right-3 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3 bg-black/80">
            {items.map((item, i) => (
              <button
                key={`dot-${item.blobId}`}
                type="button"
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function JobDetailSheet({
  open,
  onClose,
  jobEntry,
}: JobDetailSheetProps) {
  const [addVisitOpen, setAddVisitOpen] = useState(false);
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<
    import("../backend.d.ts").Expense | undefined
  >(undefined);
  const [pendingLineItems, setPendingLineItems] = useState<LineItem[]>([]);
  const [pendingNotes, setPendingNotes] = useState("");
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[] | null>(
    null,
  );
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: visits = [], isLoading: visitsLoading } = useListVisitsByJob(
    jobEntry?.job.id ?? "",
  );

  const { data: expenses = [], isLoading: expensesLoading } = useExpensesByJob(
    jobEntry?.job.id ?? "",
  );

  const { data: customers = [] } = useCustomers();

  if (!jobEntry) return null;

  const { job, customer, address } = jobEntry;

  const completedVisits = visits.filter((v) => v.status === "completed");

  // Aggregate all photos across visits for the Photos tab
  const allPhotos: LightboxItem[] = visits.flatMap((v) => {
    const dateStr = format(nsToDate(v.scheduledDate), "MMM d, yyyy");
    return v.photoIds.map((id) => ({ blobId: id, visitDate: dateStr }));
  });

  // Group photos by visit for display
  const photosByVisit = visits
    .filter((v) => v.photoIds.length > 0)
    .map((v) => ({
      visitDate: format(nsToDate(v.scheduledDate), "EEE, MMM d, yyyy"),
      photos: v.photoIds,
    }));

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLaborCost = visits.reduce((sum, v) => sum + v.laborCost, 0);
  const totalLaborHours = visits.reduce((sum, v) => sum + v.laborHours, 0);
  const totalCost = totalLaborCost + totalExpenses;

  function handleOpenLightbox(items: LightboxItem[], startIndex: number) {
    setLightboxItems(items);
    setLightboxIndex(startIndex);
  }

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
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground/70">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>Start: {formatDate(job.startTime)}</span>
                </div>
              </div>
              <StatusBadge status={job.status} />
            </div>
          </SheetHeader>

          {/* Job summary cards */}
          <div className="py-4 grid grid-cols-3 gap-3 border-b border-border">
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Total Labor</p>
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(totalLaborCost)}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {totalLaborHours.toFixed(1)} hrs
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <TrendingDown className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalCost)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabbed content */}
          <Tabs defaultValue="visits" className="pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger data-ocid="jobs.detail.visits.tab" value="visits">
                Visits
                {visits.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-xs h-4 min-w-4 px-1"
                  >
                    {visits.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger data-ocid="jobs.detail.photos.tab" value="photos">
                Photos
                {allPhotos.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-xs h-4 min-w-4 px-1"
                  >
                    {allPhotos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                data-ocid="jobs.detail.expenses.tab"
                value="expenses"
              >
                Expenses
                {expenses.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-xs h-4 min-w-4 px-1"
                  >
                    {expenses.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Visits Tab ───────────────────────── */}
            <TabsContent value="visits" className="mt-4 space-y-3">
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

              {visits.length > 0 && (
                <div className="flex items-center gap-0 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {visits.length} visit{visits.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-px h-5 bg-border/60" />
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {totalLaborHours.toFixed(1)} hrs
                    </span>
                  </div>
                  <div className="w-px h-5 bg-border/60" />
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {formatCurrency(totalLaborCost)} labor
                    </span>
                  </div>
                </div>
              )}

              {visitsLoading ? (
                <div
                  data-ocid="jobs.detail.loading_state"
                  className="space-y-3"
                >
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
                    <VisitCard
                      key={v.id}
                      visit={v}
                      index={idx + 1}
                      jobId={job.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Photos Tab ───────────────────────── */}
            <TabsContent value="photos" className="mt-4 space-y-5">
              {allPhotos.length === 0 ? (
                <div
                  data-ocid="jobs.photos.empty_state"
                  className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed border-border"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No photos yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Add visits and upload photos to see them here
                  </p>
                </div>
              ) : (
                photosByVisit.map((group) => (
                  <div key={group.visitDate} className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.visitDate}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {group.photos.map((blobId, photoIdx) => {
                        const globalIdx = allPhotos.findIndex(
                          (p) => p.blobId === blobId,
                        );
                        return (
                          <button
                            key={blobId}
                            type="button"
                            data-ocid={`jobs.photos.item.${photoIdx + 1}`}
                            onClick={() =>
                              handleOpenLightbox(
                                allPhotos,
                                globalIdx >= 0 ? globalIdx : 0,
                              )
                            }
                            className="aspect-square rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img
                              src={ExternalBlob.fromURL(blobId).getDirectURL()}
                              alt={`Visit on ${group.visitDate}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = "none";
                                const parent = el.parentElement;
                                if (parent) {
                                  parent.classList.add(
                                    "bg-muted",
                                    "flex",
                                    "items-center",
                                    "justify-center",
                                  );
                                }
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Expenses Tab ─────────────────────── */}
            <TabsContent value="expenses" className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-sm text-foreground">
                  Expenses
                </h3>
                <Button
                  data-ocid="jobs.expenses.add_button"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => {
                    setEditingExpense(undefined);
                    setAddExpenseOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Expense
                </Button>
              </div>

              {expensesLoading ? (
                <div
                  data-ocid="jobs.expenses.loading_state"
                  className="space-y-2"
                >
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : expenses.length === 0 ? (
                <div
                  data-ocid="jobs.expenses.empty_state"
                  className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border"
                >
                  <Receipt className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No expenses yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Track fuel, dump fees, tools, and other costs
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5 text-xs h-8"
                    onClick={() => {
                      setEditingExpense(undefined);
                      setAddExpenseOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Total */}
                  <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Total Expenses
                    </span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {formatCurrency(totalExpenses)}
                    </span>
                  </div>

                  {expenses.map((expense, idx) => (
                    <button
                      key={expense.id}
                      type="button"
                      data-ocid={`jobs.expenses.item.${idx + 1}`}
                      onClick={() => {
                        setEditingExpense(expense);
                        setAddExpenseOpen(true);
                      }}
                      className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {expense.expenseType.replace("_", " ")}
                            </Badge>
                            {expense.receiptBlobId && (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 text-emerald-600 border-emerald-200"
                              >
                                <Receipt className="w-2.5 h-2.5" />
                                Receipt
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground mt-1 truncate">
                            {expense.description}
                          </p>
                          {expense.vendorName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {expense.vendorName}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrency(expense.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(
                                Number(expense.dateIncurred / 1_000_000n),
                              ),
                              "MMM d, yyyy",
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Receipt thumbnail */}
                      {expense.receiptBlobId && (
                        <div className="mt-2 w-16 h-12 rounded-md border border-border overflow-hidden">
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
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Photo Lightbox */}
      {lightboxItems && lightboxItems.length > 0 && (
        <PhotoLightbox
          items={lightboxItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxItems(null)}
        />
      )}

      {/* Add Visit Sheet */}
      <VisitFormSheet
        open={addVisitOpen}
        onClose={() => setAddVisitOpen(false)}
        jobId={job.id}
      />

      {/* Add/Edit Expense Sheet */}
      <ExpenseFormSheet
        open={addExpenseOpen}
        onClose={() => {
          setAddExpenseOpen(false);
          setEditingExpense(undefined);
        }}
        jobId={job.id}
        expense={editingExpense}
      />

      {/* Generate Invoice Sheet */}
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
