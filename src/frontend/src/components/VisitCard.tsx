import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit2,
  FileText,
  Receipt,
  X,
} from "lucide-react";
import { useState } from "react";
import { ExternalBlob } from "../backend";
import type { Visit } from "../backend.d.ts";
import { formatCurrency, useExpensesByVisit } from "../hooks/useQueries";
import { ExpenseFormSheet } from "./ExpenseFormSheet";
import { VisitFormSheet } from "./VisitFormSheet";

interface VisitCardProps {
  visit: Visit;
  index: number;
  jobId: string;
}

function nsToDate(ns: bigint): Date {
  return new Date(Number(ns / 1_000_000n));
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: {
    label: "Scheduled",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  },
};

function VisitStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium capitalize border", config.className)}
    >
      {config.label}
    </Badge>
  );
}

interface PhotoLightboxProps {
  photoIds: string[];
  initialIndex: number;
  onClose: () => void;
}

function PhotoLightbox({
  photoIds,
  initialIndex,
  onClose,
}: PhotoLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);

  function prev() {
    setCurrent((i) => (i - 1 + photoIds.length) % photoIds.length);
  }
  function next() {
    setCurrent((i) => (i + 1) % photoIds.length);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="visit.photo.dialog"
        className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none"
      >
        <div className="relative flex items-center justify-center min-h-[50vh] max-h-[80vh]">
          {/* Close */}
          <button
            data-ocid="visit.photo.close_button"
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Prev */}
          {photoIds.length > 1 && (
            <button
              data-ocid="visit.photo.pagination_prev"
              type="button"
              onClick={prev}
              className="absolute left-3 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <img
            src={ExternalBlob.fromURL(photoIds[current]).getDirectURL()}
            alt={`View ${current + 1} of ${photoIds.length}`}
            className="max-w-full max-h-[75vh] object-contain"
          />

          {/* Next */}
          {photoIds.length > 1 && (
            <button
              data-ocid="visit.photo.pagination_next"
              type="button"
              onClick={next}
              className="absolute right-3 z-10 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Counter */}
        {photoIds.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3 bg-black/80">
            {photoIds.map((id, i) => (
              <button
                key={`dot-${id}`}
                type="button"
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === current ? "bg-white" : "bg-white/30",
                )}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VisitCard({ visit, index, jobId }: VisitCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: visitExpenses = [] } = useExpensesByVisit(visit.id);
  const visitExpenseTotal = visitExpenses.reduce((sum, e) => sum + e.amount, 0);

  const scheduledDate = nsToDate(visit.scheduledDate);
  const formattedDate = format(scheduledDate, "EEE, MMM d, yyyy");
  const formattedTime = visit.startTime
    ? format(nsToDate(visit.startTime), "h:mm a")
    : null;

  const visiblePhotos = visit.photoIds.slice(0, 4);
  const extraCount = visit.photoIds.length - 4;

  return (
    <>
      <div
        data-ocid={`visit.card.${index}`}
        className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                {formattedDate}
              </span>
              {formattedTime && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formattedTime}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <VisitStatusBadge status={visit.status} />
            <Button
              data-ocid={`visit.card.add_expense_button.${index}`}
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setAddExpenseOpen(true)}
              title="Add Expense"
            >
              <Receipt className="w-3.5 h-3.5" />
            </Button>
            <Button
              data-ocid={`visit.card.edit_button.${index}`}
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditOpen(true)}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Labor info */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong className="text-foreground">
                {visit.laborHours.toFixed(2)}
              </strong>{" "}
              hrs
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong className="text-foreground">
                {formatCurrency(visit.laborCost)}
              </strong>{" "}
              labor
            </span>
          </div>
          {visit.laborRate > 0 && (
            <div className="text-xs text-muted-foreground ml-auto">
              @ {formatCurrency(visit.laborRate)}/hr
            </div>
          )}
        </div>

        {/* Notes */}
        {visit.notes && (
          <div className="flex items-start gap-2 mb-3">
            <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {visit.notes}
            </p>
          </div>
        )}

        {/* Visit-level expense summary */}
        {visitExpenses.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Receipt className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {visitExpenses.length}{" "}
              {visitExpenses.length === 1 ? "expense" : "expenses"} ·{" "}
              {formatCurrency(visitExpenseTotal)}
            </span>
          </div>
        )}

        {/* Photo thumbnails */}
        {visit.photoIds.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Camera className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {visiblePhotos.map((id, photoIdx) => (
                <button
                  key={id}
                  type="button"
                  data-ocid={`visit.card.photo.${photoIdx + 1}`}
                  onClick={() => setLightboxIndex(photoIdx)}
                  className="w-10 h-10 rounded-md border border-border overflow-hidden hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={ExternalBlob.fromURL(id).getDirectURL()}
                    alt={`Visit attachment ${photoIdx + 1}`}
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
                        const icon = document.createElement("span");
                        icon.innerHTML =
                          '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';
                        parent.appendChild(icon);
                      }
                    }}
                  />
                </button>
              ))}
              {extraCount > 0 && (
                <button
                  type="button"
                  data-ocid="visit.card.photo.more"
                  onClick={() => setLightboxIndex(4)}
                  className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  +{extraCount}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && visit.photoIds.length > 0 && (
        <PhotoLightbox
          photoIds={visit.photoIds}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <VisitFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        jobId={visit.jobId}
        visit={visit}
      />

      <ExpenseFormSheet
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        jobId={jobId}
        visitId={visit.id}
      />
    </>
  );
}
