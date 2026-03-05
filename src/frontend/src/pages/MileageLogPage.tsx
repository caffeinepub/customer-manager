import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, Navigation, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { PageHeader } from "../components/PageHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useCustomers } from "../hooks/useQueries";
import type { MileageLog } from "../types/local";

const IRS_RATE = 0.67; // 2024 IRS standard mileage rate

interface Props {
  navigate: (p: Page) => void;
}

// ─── Add Mileage Dialog ──────────────────────────────────────
function AddMileageDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (m: MileageLog) => void;
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    startLocation: "",
    endLocation: "",
    distanceMiles: "",
    purpose: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  function f(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.startLocation || !form.endLocation) {
      toast.error("Start and end locations are required");
      return;
    }
    setSaving(true);
    const log: MileageLog = {
      id: crypto.randomUUID(),
      date: form.date,
      startLocation: form.startLocation.trim(),
      endLocation: form.endLocation.trim(),
      distanceMiles: Number.parseFloat(form.distanceMiles) || 0,
      purpose: form.purpose.trim(),
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onSave(log);
    setForm({
      date: new Date().toISOString().split("T")[0],
      startLocation: "",
      endLocation: "",
      distanceMiles: "",
      purpose: "",
      notes: "",
    });
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="mileage.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Log Mileage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input
              data-ocid="mileage.input"
              type="date"
              required
              value={form.date}
              onChange={(e) => f("date", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Location *</Label>
              <Input
                required
                value={form.startLocation}
                onChange={(e) => f("startLocation", e.target.value)}
                placeholder="123 Home St, City"
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Location *</Label>
              <Input
                required
                value={form.endLocation}
                onChange={(e) => f("endLocation", e.target.value)}
                placeholder="456 Job Site Rd"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Distance (miles) *</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                required
                value={form.distanceMiles}
                onChange={(e) => f("distanceMiles", e.target.value)}
                placeholder="12.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Input
                value={form.purpose}
                onChange={(e) => f("purpose", e.target.value)}
                placeholder="Job site visit"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => f("notes", e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="mileage.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-ocid="mileage.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Log
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MileageLogPage({ navigate: _navigate }: Props) {
  const [logs, setLogs] = useLocalStorage<MileageLog[]>("fp_mileage_logs", []);
  const { data: customers = [] } = useCustomers();
  const [showDialog, setShowDialog] = useState(false);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisYear = `${now.getFullYear()}`;

  const totalMiles = useMemo(
    () => logs.reduce((s, l) => s + l.distanceMiles, 0),
    [logs],
  );
  const monthMiles = useMemo(
    () =>
      logs
        .filter((l) => l.date.startsWith(thisMonth))
        .reduce((s, l) => s + l.distanceMiles, 0),
    [logs, thisMonth],
  );
  const yearMiles = useMemo(
    () =>
      logs
        .filter((l) => l.date.startsWith(thisYear))
        .reduce((s, l) => s + l.distanceMiles, 0),
    [logs, thisYear],
  );
  const estimatedDeduction = yearMiles * IRS_RATE;

  // Per-job breakdown (use purpose as job label since logs may not have jobId)
  const perPurpose = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      const key = l.purpose || "General";
      map.set(key, (map.get(key) ?? 0) + l.distanceMiles);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [logs]);

  function handleSave(m: MileageLog) {
    setLogs((prev) => [m, ...prev]);
    toast.success("Mileage logged");
  }

  function handleDelete(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    toast.success("Log deleted");
  }

  function exportCSV() {
    const rows = [
      ["Date", "Start", "End", "Miles", "Purpose", "Notes"],
      ...logs.map((l) => [
        l.date,
        l.startLocation,
        l.endLocation,
        l.distanceMiles.toFixed(1),
        l.purpose,
        l.notes ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mileage_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // suppress unused warning
  void customers;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Mileage Log"
        description="Track business driving for tax deductions"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5"
              data-ocid="mileage.secondary_button"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowDialog(true)}
              className="gap-2"
              data-ocid="mileage.primary_button"
            >
              <Plus className="w-4 h-4" />
              Log Miles
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Miles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {totalMiles.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">all time</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {monthMiles.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">miles</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                This Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {yearMiles.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">miles</p>
            </CardContent>
          </Card>
          <Card className="shadow-card border-chart-1/30">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Est. Deduction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-chart-1">
                ${estimatedDeduction.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                @ ${IRS_RATE}/mi IRS rate
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Per-purpose breakdown */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Miles by Purpose
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {perPurpose.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4">No data yet</p>
              ) : (
                <div className="divide-y divide-border">
                  {perPurpose.map(([purpose, miles]) => (
                    <div
                      key={purpose}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span className="text-sm text-foreground truncate max-w-[60%]">
                        {purpose}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {miles.toFixed(1)} mi
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Table */}
          <div className="lg:col-span-2">
            {logs.length === 0 ? (
              <div
                data-ocid="mileage.empty_state"
                className="text-center py-16 text-muted-foreground"
              >
                <Navigation className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No mileage logged yet</p>
                <p className="text-sm mt-1">
                  Track your business driving for tax deductions.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden shadow-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Route</TableHead>
                      <TableHead className="text-xs">Miles</TableHead>
                      <TableHead className="text-xs">Purpose</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, idx) => (
                      <TableRow
                        key={log.id}
                        data-ocid={`mileage.item.${idx + 1}`}
                      >
                        <TableCell className="text-xs">
                          {new Date(`${log.date}T00:00:00`).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px]">
                          <p className="truncate text-foreground">
                            {log.startLocation}
                          </p>
                          <p className="truncate text-muted-foreground">
                            → {log.endLocation}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          {log.distanceMiles.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {log.purpose || "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(log.id)}
                            data-ocid={`mileage.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddMileageDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSave={handleSave}
      />
    </div>
  );
}
