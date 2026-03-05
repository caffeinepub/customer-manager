import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Download, Loader2, Plus, Trash2, Truck, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { PageHeader } from "../components/PageHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Asset, MileageLog } from "../types/local";

const STATUS_BADGE: Record<
  Asset["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  in_repair: {
    label: "In Repair",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  retired: {
    label: "Retired",
    className: "bg-muted text-muted-foreground",
  },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

// ─── Asset Sheet ─────────────────────────────────────────────
function AssetSheet({
  open,
  onClose,
  existing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Asset;
  onSave: (a: Asset) => void;
}) {
  const [form, setForm] = useState<{
    name: string;
    type: Asset["type"];
    make: string;
    model: string;
    year: string;
    serialNumber: string;
    purchaseDate: string;
    purchaseCost: string;
    currentValue: string;
    status: Asset["status"];
    notes: string;
  }>({
    name: existing?.name ?? "",
    type: existing?.type ?? "vehicle",
    make: existing?.make ?? "",
    model: existing?.model ?? "",
    year: existing?.year ? String(existing.year) : "",
    serialNumber: existing?.serialNumber ?? "",
    purchaseDate: existing?.purchaseDate ?? "",
    purchaseCost: existing?.purchaseCost ? String(existing.purchaseCost) : "",
    currentValue: existing?.currentValue ? String(existing.currentValue) : "",
    status: existing?.status ?? "active",
    notes: existing?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  function f(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) {
      toast.error("Asset name is required");
      return;
    }
    setSaving(true);
    const asset: Asset = {
      id: existing?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      type: form.type,
      make: form.make.trim(),
      model: form.model.trim(),
      year: form.year ? Number.parseInt(form.year) : undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      purchaseDate: form.purchaseDate || undefined,
      purchaseCost: form.purchaseCost
        ? Number.parseFloat(form.purchaseCost)
        : undefined,
      currentValue: form.currentValue
        ? Number.parseFloat(form.currentValue)
        : undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    onSave(asset);
    setSaving(false);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-lg overflow-y-auto"
        data-ocid="asset.sheet"
      >
        <SheetHeader>
          <SheetTitle className="font-display">
            {existing ? "Edit Asset" : "Add Asset"}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              data-ocid="asset.input"
              required
              value={form.name}
              onChange={(e) => f("name", e.target.value)}
              placeholder="e.g., Ford F-150, Milwaukee Drill"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => f("type", v)}>
                <SelectTrigger data-ocid="asset.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["vehicle", "tool", "equipment", "other"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => f("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["active", "in_repair", "retired"] as Asset["status"][]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_BADGE[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Make</Label>
              <Input
                value={form.make}
                onChange={(e) => f("make", e.target.value)}
                placeholder="Ford"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => f("model", e.target.value)}
                placeholder="F-150"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={form.year}
                onChange={(e) => f("year", e.target.value)}
                placeholder="2022"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Serial / VIN Number</Label>
            <Input
              value={form.serialNumber}
              onChange={(e) => f("serialNumber", e.target.value)}
              placeholder="SN-123456"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => f("purchaseDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Cost</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.purchaseCost}
                onChange={(e) => f("purchaseCost", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Current Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.currentValue}
                onChange={(e) => f("currentValue", e.target.value)}
                placeholder="0.00"
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

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="asset.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-ocid="asset.submit_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {existing ? "Update Asset" : "Add Asset"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface Props {
  navigate: (p: Page) => void;
}

export function AssetsPage({ navigate: _navigate }: Props) {
  const [assets, setAssets] = useLocalStorage<Asset[]>("fp_assets", []);
  const [mileageLogs] = useLocalStorage<MileageLog[]>("fp_mileage_logs", []);
  const [typeFilter, setTypeFilter] = useState<"all" | Asset["type"]>("all");
  const [showSheet, setShowSheet] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();

  const filtered = useMemo(() => {
    if (typeFilter === "all") return assets;
    return assets.filter((a) => a.type === typeFilter);
  }, [assets, typeFilter]);

  const totalFleetValue = assets.reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const activeAssets = assets.filter((a) => a.status === "active").length;
  const vehicleCount = assets.filter((a) => a.type === "vehicle").length;
  const toolCount = assets.filter(
    (a) => a.type === "tool" || a.type === "equipment",
  ).length;

  function handleSave(asset: Asset) {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === asset.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = asset;
        return copy;
      }
      return [asset, ...prev];
    });
    toast.success("Asset saved");
  }

  function handleDelete(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    toast.success("Asset deleted");
  }

  function getMileageForAsset(asset: Asset) {
    if (asset.type !== "vehicle") return 0;
    return mileageLogs
      .filter(
        (l) =>
          l.purpose.toLowerCase().includes(asset.name.toLowerCase()) ||
          l.purpose.toLowerCase().includes(asset.make.toLowerCase()) ||
          l.purpose.toLowerCase().includes(asset.model.toLowerCase()),
      )
      .reduce((s, l) => s + l.distanceMiles, 0);
  }

  function exportCSV() {
    const rows = [
      [
        "Name",
        "Type",
        "Make",
        "Model",
        "Year",
        "Status",
        "Purchase Cost",
        "Current Value",
        "Serial",
        "Notes",
      ],
      ...assets.map((a) => [
        a.name,
        a.type,
        a.make,
        a.model,
        a.year?.toString() ?? "",
        a.status,
        a.purchaseCost?.toFixed(2) ?? "",
        a.currentValue?.toFixed(2) ?? "",
        a.serialNumber ?? "",
        a.notes ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Assets"
        description="Vehicles, tools & equipment"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5"
              data-ocid="assets.secondary_button"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setEditingAsset(undefined);
                setShowSheet(true);
              }}
              className="gap-2"
              data-ocid="assets.primary_button"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {assets.length}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Active Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {activeAssets}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Fleet Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display font-bold text-foreground">
                {formatCurrency(totalFleetValue)}
              </p>
              <p className="text-xs text-muted-foreground">current value</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    {vehicleCount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vehicles
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-chart-2" />
                  <span className="text-sm font-bold text-foreground">
                    {toolCount}
                  </span>
                  <span className="text-xs text-muted-foreground">tools</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          {(["all", "vehicle", "tool", "equipment", "other"] as const).map(
            (t) => (
              <button
                type="button"
                key={t}
                data-ocid="assets.filter.tab"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {t === "all" ? "All" : t}
              </button>
            ),
          )}
        </div>

        {/* Assets List */}
        {filtered.length === 0 ? (
          <div
            data-ocid="assets.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No assets yet</p>
            <p className="text-sm mt-1">
              Track your vehicles, tools, and equipment.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden shadow-card">
            <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground border-b border-border">
              <span className="col-span-3">Name</span>
              <span className="col-span-2">Make / Model</span>
              <span className="col-span-1">Year</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Current Value</span>
              <span className="col-span-1">Mileage</span>
              <span className="col-span-1" />
            </div>
            {filtered.map((asset, idx) => {
              const assetMileage = getMileageForAsset(asset);
              const badge = STATUS_BADGE[asset.status];
              return (
                <div
                  key={asset.id}
                  data-ocid={`assets.item.${idx + 1}`}
                  className="px-4 py-3 grid grid-cols-12 gap-3 items-center border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                >
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-foreground truncate">
                      {asset.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {asset.type}
                    </p>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground truncate">
                    {asset.make} {asset.model}
                  </div>
                  <div className="col-span-1 text-sm text-muted-foreground">
                    {asset.year ?? "—"}
                  </div>
                  <div className="col-span-2">
                    <Badge
                      className={`text-xs font-medium border-0 ${badge.className}`}
                    >
                      {badge.label}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-sm font-semibold">
                    {asset.currentValue
                      ? formatCurrency(asset.currentValue)
                      : "—"}
                  </div>
                  <div className="col-span-1 text-xs text-muted-foreground">
                    {asset.type === "vehicle" && assetMileage > 0
                      ? `${assetMileage.toFixed(0)} mi`
                      : "—"}
                  </div>
                  <div className="col-span-1 flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setEditingAsset(asset);
                        setShowSheet(true);
                      }}
                      data-ocid={`assets.edit_button.${idx + 1}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(asset.id)}
                      data-ocid={`assets.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AssetSheet
        open={showSheet}
        onClose={() => {
          setShowSheet(false);
          setEditingAsset(undefined);
        }}
        existing={editingAsset}
        onSave={handleSave}
      />
    </div>
  );
}
