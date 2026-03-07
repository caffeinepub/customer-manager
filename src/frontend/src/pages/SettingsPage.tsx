import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Lock, Save, ShieldCheck, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Settings } from "../backend.d.ts";
import { PageHeader } from "../components/PageHeader";
import { useBusinessLogo } from "../hooks/useBusinessLogo";
import {
  PERMISSION_VIEWS,
  type PermissionRole,
  usePermissions,
} from "../hooks/usePermissions";
import {
  useSettings,
  useUpdateSettings,
  useUserProfile,
} from "../hooks/useQueries";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { logoUrl, setLogoUrl } = useBusinessLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile } = useUserProfile();
  const { matrix, setPermission } = usePermissions();

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setLogoUrl(result);
        toast.success("Logo uploaded");
      }
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  const [form, setForm] = useState({
    companyName: "",
    companyPhone: "",
    companyEmail: "",
    companyAddress: "",
    defaultLaborRate: "",
    defaultTaxRate: "",
    currency: "USD",
    invoicePrefix: "INV-",
    invoiceStartingNumber: "1001",
    paymentTermsDays: "30",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName,
        companyPhone: settings.companyPhone,
        companyEmail: settings.companyEmail,
        companyAddress: settings.companyAddress,
        defaultLaborRate: String(settings.defaultLaborRate),
        defaultTaxRate: String(settings.defaultTaxRate),
        currency: settings.currency,
        invoicePrefix: settings.invoicePrefix,
        invoiceStartingNumber: String(settings.invoiceStartingNumber),
        paymentTermsDays: String(settings.paymentTermsDays),
      });
    }
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updated: Settings = {
      companyName: form.companyName.trim(),
      companyPhone: form.companyPhone.trim(),
      companyEmail: form.companyEmail.trim(),
      companyAddress: form.companyAddress.trim(),
      defaultLaborRate: Number.parseFloat(form.defaultLaborRate) || 0,
      defaultTaxRate: Number.parseFloat(form.defaultTaxRate) || 0,
      currency: form.currency.trim() || "USD",
      invoicePrefix: form.invoicePrefix.trim() || "INV-",
      invoiceStartingNumber: BigInt(
        Number.parseInt(form.invoiceStartingNumber) || 1001,
      ),
      paymentTermsDays: BigInt(Number.parseInt(form.paymentTermsDays) || 30),
    };
    try {
      await updateSettings.mutateAsync(updated);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  }

  const canManagePermissions =
    profile?.role === "owner" || profile?.role === "admin";

  if (isLoading) {
    return (
      <div className="min-h-full">
        <PageHeader title="Settings" />
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Settings"
        description="Configure your business settings"
        action={
          <Button
            data-ocid="settings.save_button"
            form="settings-form"
            type="submit"
            disabled={updateSettings.isPending}
            className="gap-2"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        }
      />

      <div className="p-6">
        <form
          id="settings-form"
          onSubmit={handleSave}
          className="space-y-6 max-w-2xl"
        >
          {/* Business Logo */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Business Logo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-5">
                {/* Preview */}
                {logoUrl ? (
                  <div className="relative shrink-0">
                    <img
                      src={logoUrl}
                      alt="Business logo preview"
                      className="max-h-20 max-w-[160px] object-contain rounded-lg border border-border bg-muted/30 p-1"
                    />
                  </div>
                ) : (
                  <div className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/40">
                    <Upload className="w-6 h-6" />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    {logoUrl
                      ? "Your logo will appear on invoices and in the sidebar."
                      : "Upload a PNG, JPG, or SVG logo. It will appear on invoices and in the sidebar."}
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-ocid="settings.logo.upload_button"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {logoUrl ? "Replace Logo" : "Upload Logo"}
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-ocid="settings.logo.delete_button"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setLogoUrl(null);
                          toast.success("Logo removed");
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Company Name</Label>
                <Input
                  id="s-name"
                  data-ocid="settings.input"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                  placeholder="Green Thumb Landscaping"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-phone">Phone</Label>
                  <Input
                    id="s-phone"
                    type="tel"
                    value={form.companyPhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, companyPhone: e.target.value }))
                    }
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">Email</Label>
                  <Input
                    id="s-email"
                    type="email"
                    value={form.companyEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, companyEmail: e.target.value }))
                    }
                    placeholder="info@company.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-addr">Address</Label>
                <Input
                  id="s-addr"
                  value={form.companyAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyAddress: e.target.value }))
                  }
                  placeholder="123 Main St, Springfield, IL 62701"
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Settings */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Financial Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-labor">Default Labor Rate ($/hr)</Label>
                  <Input
                    id="s-labor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.defaultLaborRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        defaultLaborRate: e.target.value,
                      }))
                    }
                    placeholder="65.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-tax">Default Tax Rate (%)</Label>
                  <Input
                    id="s-tax"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.defaultTaxRate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, defaultTaxRate: e.target.value }))
                    }
                    placeholder="8.5"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-currency">Currency</Label>
                <Input
                  id="s-currency"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                  placeholder="USD"
                  maxLength={3}
                  className="max-w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Invoice Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-prefix">Invoice Prefix</Label>
                  <Input
                    id="s-prefix"
                    value={form.invoicePrefix}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, invoicePrefix: e.target.value }))
                    }
                    placeholder="INV-"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-start-num">Starting Number</Label>
                  <Input
                    id="s-start-num"
                    type="number"
                    min="1"
                    value={form.invoiceStartingNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        invoiceStartingNumber: e.target.value,
                      }))
                    }
                    placeholder="1001"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-terms">Payment Terms (days)</Label>
                <Input
                  id="s-terms"
                  type="number"
                  min="1"
                  value={form.paymentTermsDays}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentTermsDays: e.target.value }))
                  }
                  placeholder="30"
                  className="max-w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile save button */}
          <div className="flex justify-end">
            <Button
              data-ocid="settings.save_button"
              type="submit"
              disabled={updateSettings.isPending}
              className="gap-2"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </div>
        </form>

        {/* Users & Permissions — outside the form to avoid submit interference */}
        {canManagePermissions && (
          <div className="max-w-2xl mt-6">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">
                    Users &amp; Permissions
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Control which sections each role can access. Owner access
                  cannot be revoked.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <TooltipProvider>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-semibold text-foreground pb-3 pr-4 w-36">
                          Page
                        </th>
                        <th className="text-center font-semibold text-foreground pb-3 px-3 w-20">
                          <span className="flex flex-col items-center gap-0.5">
                            <Lock className="w-3.5 h-3.5 text-primary" />
                            Owner
                          </span>
                        </th>
                        <th className="text-center font-semibold text-foreground pb-3 px-3 w-20">
                          Admin
                        </th>
                        <th className="text-center font-semibold text-foreground pb-3 px-3 w-20">
                          Tech
                        </th>
                        <th className="text-center font-semibold text-foreground pb-3 px-3 w-24">
                          Read&nbsp;Only
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_VIEWS.map(({ view, label }) => (
                        <tr
                          key={view}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-foreground">
                            {label}
                          </td>
                          {/* Owner — always locked */}
                          <td className="py-3 px-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                                  <Lock className="w-3.5 h-3.5 text-primary" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Owner always has full access
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          {/* Admin */}
                          <td className="py-3 px-3 text-center">
                            <Switch
                              data-ocid="settings.permissions.switch"
                              checked={matrix[view]?.admin ?? false}
                              onCheckedChange={(checked) =>
                                setPermission(
                                  view,
                                  "admin" as PermissionRole,
                                  checked,
                                )
                              }
                              aria-label={`Admin access to ${label}`}
                            />
                          </td>
                          {/* Tech */}
                          <td className="py-3 px-3 text-center">
                            <Switch
                              data-ocid="settings.permissions.switch"
                              checked={matrix[view]?.tech ?? false}
                              onCheckedChange={(checked) =>
                                setPermission(
                                  view,
                                  "tech" as PermissionRole,
                                  checked,
                                )
                              }
                              aria-label={`Tech access to ${label}`}
                            />
                          </td>
                          {/* Read Only */}
                          <td className="py-3 px-3 text-center">
                            <Switch
                              data-ocid="settings.permissions.switch"
                              checked={matrix[view]?.readonly ?? false}
                              onCheckedChange={(checked) =>
                                setPermission(
                                  view,
                                  "readonly" as PermissionRole,
                                  checked,
                                )
                              }
                              aria-label={`Read-only access to ${label}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TooltipProvider>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
