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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Service } from "../backend.d.ts";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAddService } from "../hooks/useQueries";
import { formatCurrency } from "../hooks/useQueries";

// ─── Local service store using localStorage + query ───────────
function useServices() {
  return useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: () => {
      const raw = localStorage.getItem("fieldpro_services");
      if (raw) {
        try {
          return JSON.parse(raw) as Service[];
        } catch {
          return getDefaultServices();
        }
      }
      return getDefaultServices();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

function getDefaultServices(): Service[] {
  return [
    {
      id: "svc-001",
      name: "Lawn Mowing",
      description: "Standard lawn mowing including edging and blowing",
      isActive: true,
      price: 65,
      laborRate: 45,
      notes: "Per visit rate for standard residential properties",
    },
    {
      id: "svc-002",
      name: "Hedge Trimming",
      description: "Shape and trim hedges, bushes, and shrubs",
      isActive: true,
      price: 85,
      laborRate: 50,
      notes: undefined,
    },
    {
      id: "svc-003",
      name: "Leaf Removal",
      description: "Seasonal leaf collection and disposal",
      isActive: true,
      price: 120,
      laborRate: 45,
      notes: "Includes disposal fee",
    },
    {
      id: "svc-004",
      name: "Irrigation Setup",
      description: "Install and configure sprinkler systems",
      isActive: true,
      price: 350,
      laborRate: 75,
      notes: "Materials charged separately",
    },
    {
      id: "svc-005",
      name: "Snow Removal",
      description: "Driveway and walkway snow clearing",
      isActive: false,
      price: 95,
      laborRate: 50,
      notes: "Seasonal service, Oct–Mar",
    },
  ];
}

function saveServicesToLocal(services: Service[]) {
  localStorage.setItem("fieldpro_services", JSON.stringify(services));
}

// ─── Add Service Dialog ───────────────────────────────────────
function AddServiceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addService = useAddService();
  const qc = useQueryClient();
  const { data: services = [] } = useServices();
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    laborRate: "",
    notes: "",
    isActive: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const service: Service = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number.parseFloat(form.price) || 0,
      laborRate: Number.parseFloat(form.laborRate) || 0,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };
    try {
      await addService.mutateAsync(service);
      // Also save to local cache
      const updated = [...services, service];
      saveServicesToLocal(updated);
      qc.setQueryData<Service[]>(["services"], updated);
      toast.success("Service added");
      setForm({
        name: "",
        description: "",
        price: "",
        laborRate: "",
        notes: "",
        isActive: true,
      });
      onClose();
    } catch {
      toast.error("Failed to add service");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="services.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              data-ocid="services.input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Lawn Mowing"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              data-ocid="services.textarea"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="Describe the service…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Labor Rate ($/hr)</Label>
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
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="svc-active"
              data-ocid="services.switch"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <Label htmlFor="svc-active">Active</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="services.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="services.submit_button"
              disabled={addService.isPending}
            >
              {addService.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Add Service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function ServicesPage() {
  const { data: services = [], isLoading } = useServices();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="min-h-full">
      <PageHeader
        title="Services"
        description={`${services.length} services configured`}
        action={
          <Button
            data-ocid="services.add_button"
            onClick={() => setShowAdd(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div
            data-ocid="services.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No services yet</p>
            <p className="text-sm mt-1">
              Add your first service to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, idx) => (
              <Card
                key={service.id}
                data-ocid={`services.item.${idx + 1}`}
                className="shadow-card hover:shadow-card-hover transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {service.name}
                    </CardTitle>
                    <StatusBadge
                      status={service.isActive ? "active" : "inactive"}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(service.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Labor Rate
                      </p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(service.laborRate)}/hr
                      </p>
                    </div>
                  </div>
                  {service.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic border-t border-border pt-2">
                      {service.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddServiceDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
