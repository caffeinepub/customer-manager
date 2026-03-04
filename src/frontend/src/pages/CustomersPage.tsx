import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, Search, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Customer } from "../backend.d.ts";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAddCustomer, useCustomers } from "../hooks/useQueries";

interface Props {
  navigate: (p: Page) => void;
}

function AddCustomerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addCustomer = useAddCustomer();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    tags: "",
    isActive: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const customer: Customer = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isActive: form.isActive,
    };
    try {
      await addCustomer.mutateAsync(customer);
      toast.success("Customer added successfully");
      setForm({
        name: "",
        email: "",
        phone: "",
        notes: "",
        tags: "",
        isActive: true,
      });
      onClose();
    } catch {
      toast.error("Failed to add customer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="customers.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name *</Label>
            <Input
              id="c-name"
              data-ocid="customers.input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="John Smith"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Phone</Label>
            <Input
              id="c-phone"
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-tags">Tags (comma-separated)</Label>
            <Input
              id="c-tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="residential, vip, referral"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
              data-ocid="customers.textarea"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Any additional notes…"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="c-active"
              data-ocid="customers.switch"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <Label htmlFor="c-active">Active customer</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="customers.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="customers.submit_button"
              disabled={addCustomer.isPending}
            >
              {addCustomer.isPending ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add Customer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomersPage({ navigate }: Props) {
  const { data: customers = [], isLoading } = useCustomers();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-full">
      <PageHeader
        title="Customers"
        description={`${customers.length} total customers`}
        action={
          <Button
            data-ocid="customers.add_button"
            onClick={() => setShowAdd(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="customers.search_input"
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="customers.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {search ? "No customers match your search" : "No customers yet"}
            </p>
            {!search && (
              <p className="text-sm mt-1">
                Add your first customer to get started.
              </p>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden shadow-card">
            <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground border-b border-border">
              <span className="col-span-4">Name</span>
              <span className="col-span-3">Email</span>
              <span className="col-span-2">Phone</span>
              <span className="col-span-2">Tags</span>
              <span className="col-span-1">Status</span>
            </div>
            {filtered.map((customer, idx) => (
              <button
                type="button"
                key={customer.id}
                data-ocid={`customers.item.${idx + 1}`}
                onClick={() =>
                  navigate({ view: "customer-detail", customerId: customer.id })
                }
                className="w-full px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-accent/30 transition-colors border-b border-border last:border-0 text-left"
              >
                <div className="col-span-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">
                    {customer.name}
                  </span>
                </div>
                <span className="col-span-3 text-sm text-muted-foreground truncate">
                  {customer.email || "—"}
                </span>
                <span className="col-span-2 text-sm text-muted-foreground truncate">
                  {customer.phone || "—"}
                </span>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {customer.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs py-0">
                      {tag}
                    </Badge>
                  ))}
                  {customer.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{customer.tags.length - 2}
                    </span>
                  )}
                </div>
                <div className="col-span-1">
                  <StatusBadge
                    status={customer.isActive ? "active" : "inactive"}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AddCustomerDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
