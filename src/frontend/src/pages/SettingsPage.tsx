import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Settings } from "../backend.d.ts";
import { PageHeader } from "../components/PageHeader";
import { useSettings, useUpdateSettings } from "../hooks/useQueries";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

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
      </div>
    </div>
  );
}
