import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Camera, Clock, DollarSign, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Visit } from "../backend.d.ts";
import { dateToNs } from "../hooks/useQueries";
import { useAddVisit, useUpdateVisit } from "../hooks/useQueries";

interface VisitFormSheetProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  visit?: Visit; // if editing
}

function toDatetimeLocal(ns: bigint): string {
  const d = new Date(Number(ns / 1_000_000n));
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function toOptionalDatetimeLocal(ns?: bigint): string {
  if (ns === undefined || ns === null) return "";
  return toDatetimeLocal(ns);
}

export function VisitFormSheet({
  open,
  onClose,
  jobId,
  visit,
}: VisitFormSheetProps) {
  const addVisit = useAddVisit();
  const updateVisit = useUpdateVisit();
  const isEditing = !!visit;

  const [form, setForm] = useState(() => ({
    scheduledDate: visit
      ? toDatetimeLocal(visit.scheduledDate)
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    startTime: visit ? toOptionalDatetimeLocal(visit.startTime) : "",
    endTime: visit ? toOptionalDatetimeLocal(visit.endTime) : "",
    status: visit?.status ?? "scheduled",
    laborHours: visit ? String(visit.laborHours) : "0",
    laborRate: visit ? String(visit.laborRate) : "0",
    notes: visit?.notes ?? "",
    internalNotes: visit?.internalNotes ?? "",
  }));

  const laborCost =
    (Number.parseFloat(form.laborHours) || 0) *
    (Number.parseFloat(form.laborRate) || 0);

  // Photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [_pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadProgress] = useState<number>(0);
  const [isUploading] = useState(false);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Create preview URLs
    const urls = files.map((f) => URL.createObjectURL(f));
    setPendingPhotos((prev) => [...prev, ...files]);
    setPhotoPreviewUrls((prev) => [...prev, ...urls]);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const now = dateToNs(new Date());
    const scheduledDate = form.scheduledDate
      ? dateToNs(new Date(form.scheduledDate))
      : now;
    const startTime = form.startTime
      ? dateToNs(new Date(form.startTime))
      : undefined;
    const endTime = form.endTime ? dateToNs(new Date(form.endTime)) : undefined;

    // TODO: Upload pendingPhotos using StorageClient and collect their hashes
    // For now, keep existing photoIds if editing; photos will be uploaded via the storage flow
    const existingPhotoIds = visit?.photoIds ?? [];

    const updatedVisit: Visit = {
      id: visit?.id ?? crypto.randomUUID(),
      jobId,
      scheduledDate,
      startTime,
      endTime,
      status: form.status,
      laborHours: Number.parseFloat(form.laborHours) || 0,
      laborRate: Number.parseFloat(form.laborRate) || 0,
      laborCost,
      notes: form.notes.trim() || undefined,
      internalNotes: form.internalNotes.trim() || undefined,
      photoIds: existingPhotoIds,
      createdAt: visit?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      if (isEditing) {
        await updateVisit.mutateAsync(updatedVisit);
        toast.success("Visit updated");
      } else {
        await addVisit.mutateAsync(updatedVisit);
        toast.success("Visit added");
      }
      onClose();
    } catch {
      toast.error(isEditing ? "Failed to update visit" : "Failed to add visit");
    }
  }

  const isPending = addVisit.isPending || updateVisit.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        data-ocid="visit.form.sheet"
        className="w-full sm:max-w-lg overflow-y-auto"
        side="right"
      >
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="font-display text-lg">
            {isEditing ? "Edit Visit" : "Add Visit"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-5 pb-8">
          {/* Scheduled Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Scheduled Date *
            </Label>
            <Input
              type="datetime-local"
              value={form.scheduledDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduledDate: e.target.value }))
              }
              required
            />
          </div>

          {/* Start / End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Start Time
              </Label>
              <Input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                End Time
              </Label>
              <Input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger data-ocid="visit.form.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["scheduled", "in_progress", "completed", "cancelled"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Labor */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Labor
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.laborHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, laborHours: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Rate ($/hr)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.laborRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, laborRate: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground text-xs">Labor Cost</span>
              <span className="font-semibold text-foreground">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(laborCost)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Notes
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              placeholder="Customer-facing notes…"
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Internal Notes
            </Label>
            <Textarea
              value={form.internalNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, internalNotes: e.target.value }))
              }
              rows={2}
              placeholder="Internal team notes…"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Photos
            </Label>

            {/* Existing photos from visit */}
            {isEditing && visit && visit.photoIds.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {visit.photoIds.length} existing photo
                  {visit.photoIds.length !== 1 ? "s" : ""}
                </p>
                {/* TODO: Render photo thumbnails using StorageClient.getDirectURL */}
                <div className="flex flex-wrap gap-2">
                  {visit.photoIds.map((id) => (
                    <div
                      key={id}
                      className="w-16 h-16 rounded-md bg-muted border border-border flex items-center justify-center"
                    >
                      <Camera className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New photo previews */}
            {photoPreviewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoPreviewUrls.map((url, idx) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded-md border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <Button
              data-ocid="visit.form.upload_button"
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              Add Photos
            </Button>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button
              data-ocid="visit.form.cancel_button"
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              data-ocid="visit.form.submit_button"
              type="submit"
              className="flex-1"
              disabled={isPending || isUploading}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isEditing ? "Save Changes" : "Add Visit"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
