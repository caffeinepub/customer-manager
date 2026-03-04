import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Camera, Clock, DollarSign, Edit2, FileText } from "lucide-react";
import { useState } from "react";
import type { Visit } from "../backend.d.ts";
import { formatCurrency } from "../hooks/useQueries";
import { VisitFormSheet } from "./VisitFormSheet";

interface VisitCardProps {
  visit: Visit;
  index: number;
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

export function VisitCard({ visit, index }: VisitCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  const scheduledDate = nsToDate(visit.scheduledDate);
  const formattedDate = format(scheduledDate, "EEE, MMM d, yyyy");
  const formattedTime = visit.startTime
    ? format(nsToDate(visit.startTime), "h:mm a")
    : null;

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
          <div className="flex items-center gap-2 shrink-0">
            <VisitStatusBadge status={visit.status} />
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

        {/* Photo thumbnails */}
        {visit.photoIds.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Camera className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {visit.photoIds.slice(0, 4).map((id) => (
                <div
                  key={id}
                  className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center overflow-hidden"
                >
                  {/* TODO: Use StorageClient.getDirectURL(id) to render actual image */}
                  <Camera className="w-4 h-4 text-muted-foreground/40" />
                </div>
              ))}
              {visit.photoIds.length > 4 && (
                <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{visit.photoIds.length - 4}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <VisitFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        jobId={visit.jobId}
        visit={visit}
      />
    </>
  );
}
