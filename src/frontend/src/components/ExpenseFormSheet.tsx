import { Badge } from "@/components/ui/badge";
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
import {
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  ScanLine,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { Expense } from "../backend.d.ts";
import { dateToNs, useAddExpense, useUpdateExpense } from "../hooks/useQueries";
import { useStorageClient } from "../hooks/useStorageClient";

interface ExpenseFormSheetProps {
  open: boolean;
  onClose: () => void;
  jobId?: string;
  visitId?: string;
  expense?: Expense; // for editing
}

const EXPENSE_CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "dump_fee", label: "Dump Fee" },
  { value: "tool", label: "Tool / Equipment" },
  { value: "supplies", label: "Supplies" },
  { value: "other", label: "Other" },
] as const;

function parseFilenameForExpense(filename: string): {
  date: string;
  vendor: string;
} {
  const base = filename.replace(/\.[^.]+$/, ""); // strip extension

  // Try to find date patterns
  let date = format(new Date(), "yyyy-MM-dd");

  // YYYY-MM-DD
  const ymdMatch = base.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
  if (ymdMatch) {
    date = `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  } else {
    // MM-DD-YYYY or MM_DD_YYYY
    const mdyMatch = base.match(/(\d{2})[_-](\d{2})[_-](\d{4})/);
    if (mdyMatch) {
      date = `${mdyMatch[3]}-${mdyMatch[1]}-${mdyMatch[2]}`;
    }
  }

  // Try to extract vendor — anything that looks like words (not just digits)
  const cleaned = base
    .replace(/\d{4}[_-]\d{2}[_-]\d{2}/g, "")
    .replace(/\d{2}[_-]\d{2}[_-]\d{4}/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordParts = cleaned
    .split(" ")
    .filter((w) => /[a-zA-Z]/.test(w))
    .slice(0, 4);
  const vendor =
    wordParts.length > 0
      ? wordParts
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
      : "";

  return { date, vendor };
}

export function ExpenseFormSheet({
  open,
  onClose,
  jobId,
  visitId,
  expense,
}: ExpenseFormSheetProps) {
  const addExpense = useAddExpense();
  const updateExpense = useUpdateExpense();
  const storageClient = useStorageClient();
  const isEditing = !!expense;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState(() => {
    const defaultDate = expense?.dateIncurred
      ? format(
          new Date(Number(expense.dateIncurred / 1_000_000n)),
          "yyyy-MM-dd",
        )
      : format(new Date(), "yyyy-MM-dd");

    return {
      category: expense?.expenseType ?? "other",
      description: expense?.description ?? "",
      amount: expense ? String(expense.amount) : "",
      date: defaultDate,
      vendorName: expense?.vendorName ?? "",
      notes: expense?.notes ?? "",
      receiptBlobId: expense?.receiptBlobId,
    };
  });

  async function handleReceiptSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);

    if (file.type === "application/pdf") {
      // PDFs: just show filename, no scanning
      setReceiptPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Image: create preview
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreviewUrl(previewUrl);

    // Show scanning animation
    setIsScanning(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Parse filename for hints
    const { date, vendor } = parseFilenameForExpense(file.name);

    setForm((f) => ({
      ...f,
      date,
      vendorName: f.vendorName || vendor,
    }));

    setIsScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeReceipt() {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setForm((f) => ({ ...f, receiptBlobId: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!form.amount || Number.parseFloat(form.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    let receiptBlobId = form.receiptBlobId;

    // Upload receipt if pending
    if (receiptFile) {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        const bytes = new Uint8Array(await receiptFile.arrayBuffer());
        const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
          setUploadProgress(Math.round(pct * 100)),
        );
        receiptBlobId = await storageClient.store(blob);
      } catch (_err) {
        toast.error("Failed to upload receipt");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const now = dateToNs(new Date());
    const dateIncurred = form.date ? dateToNs(new Date(form.date)) : now;

    const expenseData: Expense = {
      id: expense?.id ?? crypto.randomUUID(),
      expenseType: form.category,
      description: form.description.trim(),
      amount: Number.parseFloat(form.amount),
      dateIncurred,
      vendorName: form.vendorName.trim() || undefined,
      notes: form.notes.trim() || undefined,
      jobId: jobId || expense?.jobId,
      visitId: visitId || expense?.visitId,
      receiptBlobId,
    };

    try {
      if (isEditing) {
        await updateExpense.mutateAsync(expenseData);
        toast.success("Expense updated");
      } else {
        await addExpense.mutateAsync(expenseData);
        toast.success("Expense added");
      }
      onClose();
    } catch {
      toast.error(
        isEditing ? "Failed to update expense" : "Failed to add expense",
      );
    }
  }

  const isPending = addExpense.isPending || updateExpense.isPending;
  const isPDF = receiptFile?.type === "application/pdf";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        data-ocid="expense.form.sheet"
        className="w-full sm:max-w-lg overflow-y-auto"
        side="right"
      >
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="font-display text-lg">
            {isEditing ? "Edit Expense" : "Add Expense"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-5 pb-8">
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Category *
            </Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger data-ocid="expense.form.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Description *
            </Label>
            <Input
              data-ocid="expense.form.input"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="e.g. Gas for truck, dump fee at transfer station…"
              required
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Amount *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  $
                </span>
                <Input
                  data-ocid="expense.form.amount.input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0.00"
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Date *
              </Label>
              <Input
                data-ocid="expense.form.date.input"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Vendor Name
            </Label>
            <Input
              data-ocid="expense.form.vendor.input"
              value={form.vendorName}
              onChange={(e) =>
                setForm((f) => ({ ...f, vendorName: e.target.value }))
              }
              placeholder="e.g. Chevron, Home Depot…"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Notes
            </Label>
            <Textarea
              data-ocid="expense.form.textarea"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              placeholder="Optional notes…"
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              Receipt
            </Label>

            {/* Existing receipt badge */}
            {form.receiptBlobId && !receiptFile && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex-1">
                  Receipt attached
                </span>
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove receipt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Scanning indicator */}
            {isScanning && (
              <div
                data-ocid="expense.form.loading_state"
                className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20"
              >
                <ScanLine className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">
                  Scanning receipt…
                </span>
              </div>
            )}

            {/* Image preview */}
            {receiptPreviewUrl && !isScanning && (
              <div className="relative group inline-block">
                <img
                  src={receiptPreviewUrl}
                  alt="Receipt preview"
                  className="w-full max-h-40 object-contain rounded-lg border border-border bg-muted"
                />
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove receipt"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* PDF indicator */}
            {isPDF && receiptFile && (
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted border border-border">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {receiptFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF receipt</p>
                </div>
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove receipt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="w-8 text-right">{uploadProgress}%</span>
              </div>
            )}

            {/* Upload button — hidden if already have a pending file */}
            {!receiptFile && !form.receiptBlobId && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleReceiptSelect}
                />
                <Button
                  data-ocid="expense.form.upload_button"
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Receipt
                </Button>
                <p className="text-xs text-muted-foreground">
                  Upload a photo or PDF to auto-fill date and vendor fields
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button
              data-ocid="expense.form.cancel_button"
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              data-ocid="expense.form.submit_button"
              type="submit"
              className="flex-1"
              disabled={isPending || isUploading || isScanning}
            >
              {isPending || isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isEditing ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
