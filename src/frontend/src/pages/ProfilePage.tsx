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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d.ts";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useSaveUserProfile, useUserProfile } from "../hooks/useQueries";

export function ProfilePage() {
  const { data: profile, isLoading } = useUserProfile();
  const saveProfile = useSaveUserProfile();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "user",
    isActive: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        isActive: profile.isActive,
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updated: UserProfile = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      isActive: form.isActive,
    };
    try {
      await saveProfile.mutateAsync(updated);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    }
  }

  const initials = form.name
    ? form.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="min-h-full">
      <PageHeader
        title="My Profile"
        description="Manage your personal information"
        action={
          <Button
            data-ocid="profile.save_button"
            form="profile-form"
            type="submit"
            disabled={saveProfile.isPending}
            className="gap-2"
          >
            {saveProfile.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Profile
          </Button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4 max-w-lg">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : (
          <form
            id="profile-form"
            onSubmit={handleSave}
            className="space-y-6 max-w-lg"
          >
            {/* Avatar */}
            <Card className="shadow-card">
              <CardContent className="py-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {initials === "?" ? (
                      <User className="w-7 h-7 text-primary/50" />
                    ) : (
                      <span className="text-xl font-bold text-primary font-display">
                        {initials}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground">
                      {form.name || "Your Name"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={form.role} />
                      <StatusBadge
                        status={form.isActive ? "active" : "inactive"}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Fields */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Full Name</Label>
                  <Input
                    id="p-name"
                    data-ocid="profile.input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-email">Email</Label>
                    <Input
                      id="p-email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="jane@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-phone">Phone</Label>
                    <Input
                      id="p-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                  >
                    <SelectTrigger data-ocid="profile.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="p-active"
                    data-ocid="profile.switch"
                    checked={form.isActive}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, isActive: v }))
                    }
                  />
                  <Label htmlFor="p-active">Active account</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                data-ocid="profile.submit_button"
                type="submit"
                disabled={saveProfile.isPending}
                className="gap-2"
              >
                {saveProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Profile
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
