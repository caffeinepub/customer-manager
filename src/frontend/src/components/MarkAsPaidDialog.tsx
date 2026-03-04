import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Invoice } from "../backend.d.ts";
import { formatCurrency } from "../hooks/useQueries";

type PaymentMethod = "cash" | "check" | "card" | "transfer" | "other";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  customerName?: string;
}

export function MarkAsPaidDialog({
  open,
  onClose,
  invoice,
  customerName,
}: Props) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(invoice.totalAmount);
  const [method, setMethod] = useState<PaymentMethod>("check");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync amount when invoice changes
  function handleOpenChange(val: boolean) {
    if (val) {
      setAmount(invoice.totalAmount);
      setMethod("check");
      setReferenceNumber("");
      setNotes("");
    } else {
      onClose();
    }
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      // Optimistically update cache: mark invoice as paid
      const updatedInvoice: Invoice = { ...invoice, status: "paid" };

      // Update in "all-invoices" cache
      queryClient.setQueriesData<
        Array<{ invoice: Invoice; customer: unknown }>
      >({ queryKey: ["all-invoices"] }, (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.invoice.id === invoice.id
            ? { ...item, invoice: updatedInvoice }
            : item,
        );
      });

      // Update in "invoices" cache for this customer
      queryClient.setQueryData<Invoice[]>(
        ["invoices", invoice.customerId],
        (old) => {
          if (!old) return old;
          return old.map((inv) =>
            inv.id === invoice.id ? updatedInvoice : inv,
          );
        },
      );

      // Invalidate to ensure fresh data next time
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["all-invoices"] }),
        queryClient.invalidateQueries({
          queryKey: ["invoices", invoice.customerId],
        }),
      ]);

      toast.success(
        `Invoice #${invoice.id.slice(0, 8)} marked as paid — ${formatCurrency(amount)}`,
      );
      onClose();
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: "cash", label: "Cash" },
    { value: "check", label: "Check" },
    { value: "card", label: "Card" },
    { value: "transfer", label: "Bank Transfer" },
    { value: "other", label: "Other" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-ocid="invoices.mark_paid.dialog">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Mark as Paid
          </DialogTitle>
          <DialogDescription>
            Record payment for invoice{" "}
            <span className="font-mono font-medium text-foreground">
              #{invoice.id.slice(0, 8)}
            </span>
            {customerName ? ` — ${customerName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="mark-paid-amount" className="text-sm font-medium">
              Amount Received
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                id="mark-paid-amount"
                data-ocid="invoices.mark_paid.amount.input"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(Number.parseFloat(e.target.value) || 0)
                }
                className="pl-7 font-medium"
              />
            </div>
            {amount !== invoice.totalAmount && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Invoice total is {formatCurrency(invoice.totalAmount)}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="mark-paid-method" className="text-sm font-medium">
              Payment Method
            </Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
            >
              <SelectTrigger
                id="mark-paid-method"
                data-ocid="invoices.mark_paid.method.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-1.5">
            <Label htmlFor="mark-paid-ref" className="text-sm font-medium">
              Reference Number{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="mark-paid-ref"
              data-ocid="invoices.mark_paid.reference.input"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Check #, transaction ID…"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="mark-paid-notes" className="text-sm font-medium">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="mark-paid-notes"
              data-ocid="invoices.mark_paid.notes.textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment notes…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            data-ocid="invoices.mark_paid.cancel_button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="invoices.mark_paid.confirm_button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isSubmitting ? "Recording…" : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
