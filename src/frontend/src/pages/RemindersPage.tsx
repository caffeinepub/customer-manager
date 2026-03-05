import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { cn } from "@/lib/utils";
import { Bell, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { PageHeader } from "../components/PageHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useCustomers } from "../hooks/useQueries";
import type { FollowUpReminder } from "../types/local";

interface Props {
  navigate: (p: Page) => void;
}

// ─── Add / Edit Dialog ───────────────────────────────────────
function ReminderDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (r: FollowUpReminder) => void;
}) {
  const { data: customers = [] } = useCustomers();
  const [form, setForm] = useState({
    customerId: "",
    dueDate: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      toast.error("Select a customer");
      return;
    }
    if (!form.dueDate) {
      toast.error("Select a due date");
      return;
    }
    setSaving(true);
    const reminder: FollowUpReminder = {
      id: crypto.randomUUID(),
      customerId: form.customerId,
      dueDate: form.dueDate,
      note: form.note.trim(),
      isDone: false,
      createdAt: new Date().toISOString(),
    };
    onSave(reminder);
    setForm({ customerId: "", dueDate: "", note: "" });
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-ocid="reminder.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Reminder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select
              value={form.customerId}
              onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
            >
              <SelectTrigger data-ocid="reminder.select">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Due Date *</Label>
            <Input
              data-ocid="reminder.input"
              type="date"
              required
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g., Follow up on drywall repair satisfaction"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="reminder.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-ocid="reminder.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemindersPage({ navigate: _navigate }: Props) {
  const [reminders, setReminders] = useLocalStorage<FollowUpReminder[]>(
    "fp_reminders",
    [],
  );
  const { data: customers = [] } = useCustomers();
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [showDialog, setShowDialog] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const sorted = useMemo(
    () => [...reminders].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [reminders],
  );

  const filtered = useMemo(() => {
    if (filter === "pending") return sorted.filter((r) => !r.isDone);
    if (filter === "done") return sorted.filter((r) => r.isDone);
    return sorted;
  }, [sorted, filter]);

  const pending = reminders.filter((r) => !r.isDone).length;
  const overdue = reminders.filter(
    (r) => !r.isDone && r.dueDate < today,
  ).length;

  function handleSave(r: FollowUpReminder) {
    setReminders((prev) => [r, ...prev]);
    toast.success("Reminder added");
  }

  function toggleDone(id: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isDone: !r.isDone } : r)),
    );
  }

  function handleDelete(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reminder deleted");
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Reminders"
        description="Follow-up reminders for your customers"
        action={
          <Button
            onClick={() => setShowDialog(true)}
            className="gap-2"
            data-ocid="reminders.primary_button"
          >
            <Plus className="w-4 h-4" />
            Add Reminder
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Pending Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {pending}
              </p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "shadow-card",
              overdue > 0 && "border-destructive/50",
            )}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-display font-bold",
                  overdue > 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {overdue}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              type="button"
              key={f}
              data-ocid="reminders.filter.tab"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div
            data-ocid="reminders.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No reminders yet</p>
            <p className="text-sm mt-1">
              Add follow-up reminders for your customers.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r, idx) => {
              const customer = customers.find((c) => c.id === r.customerId);
              const isOverdue = !r.isDone && r.dueDate < today;
              return (
                <div
                  key={r.id}
                  data-ocid={`reminders.item.${idx + 1}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    r.isDone
                      ? "border-border bg-muted/30 opacity-60"
                      : isOverdue
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border bg-card hover:bg-accent/20",
                  )}
                >
                  <Checkbox
                    checked={r.isDone}
                    onCheckedChange={() => toggleDone(r.id)}
                    className="mt-0.5"
                    data-ocid={`reminders.checkbox.${idx + 1}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          r.isDone
                            ? "line-through text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {customer?.name ?? "Unknown customer"}
                      </p>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          isOverdue
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isOverdue ? "Overdue · " : ""}
                        {new Date(`${r.dueDate}T00:00:00`).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                    {r.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.note}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(r.id)}
                    data-ocid={`reminders.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReminderDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSave={handleSave}
      />
    </div>
  );
}
