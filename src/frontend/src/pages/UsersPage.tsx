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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info, Loader2, Search, Trash2, UserCog, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import { PageHeader } from "../components/PageHeader";
import { useActor } from "../hooks/useActor";
import { useAssignUserRole } from "../hooks/useQueries";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KnownUser {
  principal: string;
}

interface UserEntry {
  principal: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  loaded: boolean;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const KNOWN_USERS_KEY = "fieldpro_known_users";
const USER_ROLES_KEY = "fieldpro_user_roles";

function loadKnownUsers(): KnownUser[] {
  try {
    const raw = localStorage.getItem(KNOWN_USERS_KEY);
    if (raw) return JSON.parse(raw) as KnownUser[];
  } catch {
    // ignore
  }
  return [];
}

function saveKnownUsers(users: KnownUser[]) {
  localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(users));
}

function loadUserRoles(): Record<string, string> {
  try {
    const raw = localStorage.getItem(USER_ROLES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

function saveUserRoles(roles: Record<string, string>) {
  localStorage.setItem(USER_ROLES_KEY, JSON.stringify(roles));
}

// Map display roles to backend UserRole enum
function mapToUserRole(displayRole: string): UserRole {
  if (displayRole === "owner" || displayRole === "admin") return UserRole.admin;
  if (displayRole === "tech") return UserRole.user;
  return UserRole.guest;
}

const DISPLAY_ROLES: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "tech", label: "Tech" },
  { value: "readonly", label: "Read Only" },
];

// ─── UsersPage ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { actor, isFetching } = useActor();
  const assignRole = useAssignUserRole();

  const [knownUsers, setKnownUsers] = useState<KnownUser[]>(loadKnownUsers);
  const [userRoles, setUserRoles] =
    useState<Record<string, string>>(loadUserRoles);
  const [entries, setEntries] = useState<UserEntry[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [lookupInput, setLookupInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  // Fetch profiles for all known users whenever the actor or list changes
  useEffect(() => {
    if (!actor || isFetching || knownUsers.length === 0) {
      if (knownUsers.length === 0) setEntries([]);
      return;
    }

    let cancelled = false;
    setLoadingProfiles(true);

    async function fetchAll() {
      const { Principal } = await import("@icp-sdk/core/principal");
      const results = await Promise.all(
        knownUsers.map(async ({ principal }) => {
          try {
            const p = Principal.fromText(principal);
            const profile = await actor!.getUserProfile(p);
            const localRole = userRoles[principal];
            return {
              principal,
              name: profile?.name ?? "",
              email: profile?.email ?? "",
              phone: profile?.phone ?? "",
              role: localRole ?? profile?.role ?? "readonly",
              isActive: profile?.isActive ?? true,
              loaded: !!profile,
            } satisfies UserEntry;
          } catch {
            return {
              principal,
              name: "",
              email: "",
              phone: "",
              role: userRoles[principal] ?? "readonly",
              isActive: true,
              loaded: false,
            } satisfies UserEntry;
          }
        }),
      );
      if (!cancelled) {
        setEntries(results);
        setLoadingProfiles(false);
      }
    }

    fetchAll().catch(() => {
      if (!cancelled) setLoadingProfiles(false);
    });

    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, knownUsers, userRoles]);

  async function handleLookup() {
    const trimmed = lookupInput.trim();
    if (!trimmed) {
      toast.error("Enter a Principal ID to look up");
      return;
    }
    if (knownUsers.some((u) => u.principal === trimmed)) {
      toast.info("This user is already in the list");
      return;
    }
    if (!actor) {
      toast.error("Not connected");
      return;
    }

    setLookupLoading(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(trimmed);
      const profile = await actor.getUserProfile(p);
      const updated = [...knownUsers, { principal: trimmed }];
      setKnownUsers(updated);
      saveKnownUsers(updated);
      setLookupInput("");
      if (profile) {
        toast.success(`Added ${profile.name || "user"} to the team`);
      } else {
        toast.success("User added — profile not set up yet");
      }
    } catch {
      toast.error("Invalid Principal ID — check the format and try again");
    } finally {
      setLookupLoading(false);
    }
  }

  function handleRemove(principal: string) {
    const updated = knownUsers.filter((u) => u.principal !== principal);
    setKnownUsers(updated);
    saveKnownUsers(updated);
    setEntries((prev) => prev.filter((e) => e.principal !== principal));
    toast.success("User removed from the team list");
  }

  async function handleRoleChange(principal: string, newRole: string) {
    // Update local role override
    const updatedRoles = { ...userRoles, [principal]: newRole };
    setUserRoles(updatedRoles);
    saveUserRoles(updatedRoles);
    setEntries((prev) =>
      prev.map((e) =>
        e.principal === principal ? { ...e, role: newRole } : e,
      ),
    );

    // Also call assignCallerUserRole for backend access control
    if (!actor) return;
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(principal);
      const backendRole = mapToUserRole(newRole);
      await assignRole.mutateAsync({ user: p, role: backendRole });
      toast.success("Role updated — takes effect on next sign-in");
    } catch {
      toast.error("Failed to update backend role");
    }
  }

  function handleActiveToggle(principal: string, isActive: boolean) {
    setEntries((prev) =>
      prev.map((e) => (e.principal === principal ? { ...e, isActive } : e)),
    );
    // Active status is a local UI concern since we can't write to another user's profile
    toast.success(
      isActive ? "User marked as active" : "User marked as inactive",
    );
  }

  const isLoading = isFetching || loadingProfiles;

  return (
    <div className="min-h-full" data-ocid="users.page">
      <PageHeader
        title="Users"
        description="Manage team member access and roles"
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Users appear here after you add their Principal ID below. Share the
            app link with your team so they can sign in and set up their
            profile. Role changes take effect when the user next signs in.
          </p>
        </div>

        {/* Add User Card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                Add Team Member
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter a user's Principal ID to add them to the team. They can find
              their Principal ID in their Profile page after signing in.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="principal-input">Principal ID</Label>
                <Input
                  id="principal-input"
                  data-ocid="users.add_user.input"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="aaaaa-bbbbb-ccccc-ddddd-eee"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                />
              </div>
              <Button
                data-ocid="users.add_user.button"
                onClick={handleLookup}
                disabled={lookupLoading || !lookupInput.trim()}
                className="gap-2 shrink-0"
              >
                {lookupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {lookupLoading ? "Looking up…" : "Add User"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                Team Members
              </CardTitle>
              {entries.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {entries.length} {entries.length === 1 ? "user" : "users"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && knownUsers.length > 0 ? (
              <div className="p-6 space-y-3">
                {knownUsers.map((u) => (
                  <Skeleton
                    key={u.principal}
                    className="h-12 w-full rounded-md"
                  />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div
                data-ocid="users.empty_state"
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <UserCog className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  No users registered yet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Add a team member using the form above. Users will appear here
                  once you've added their Principal ID.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="users.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Name / Principal</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="pr-6 w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow
                        key={entry.principal}
                        data-ocid={`users.item.${index + 1}`}
                      >
                        {/* Name + Principal */}
                        <TableCell className="pl-6">
                          {entry.loaded ? (
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {entry.name || "No name set"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                                {entry.principal}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-muted-foreground italic">
                                Profile not set up
                              </p>
                              <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                                {entry.principal}
                              </p>
                            </div>
                          )}
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          {entry.email ? (
                            <span className="text-sm text-foreground">
                              {entry.email}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              —
                            </span>
                          )}
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          {entry.phone ? (
                            <span className="text-sm text-foreground">
                              {entry.phone}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              —
                            </span>
                          )}
                        </TableCell>

                        {/* Role Select */}
                        <TableCell>
                          <Select
                            value={entry.role}
                            onValueChange={(v) =>
                              handleRoleChange(entry.principal, v)
                            }
                          >
                            <SelectTrigger
                              data-ocid={`users.role.select.${index + 1}`}
                              className="h-8 w-32 text-xs"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISPLAY_ROLES.map((r) => (
                                <SelectItem
                                  key={r.value}
                                  value={r.value}
                                  className="text-xs"
                                >
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Active Switch */}
                        <TableCell className="text-center">
                          <Switch
                            data-ocid={`users.active.switch.${index + 1}`}
                            checked={entry.isActive}
                            onCheckedChange={(v) =>
                              handleActiveToggle(entry.principal, v)
                            }
                            aria-label={`Toggle active status for ${entry.name || entry.principal}`}
                          />
                        </TableCell>

                        {/* Remove Button */}
                        <TableCell className="pr-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`users.delete_button.${index + 1}`}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemove(entry.principal)}
                            aria-label={`Remove ${entry.name || entry.principal}`}
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
          </CardContent>
        </Card>

        {/* Note about role sync */}
        {entries.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Role changes are stored locally and take effect when each user next
            signs in.
          </p>
        )}
      </div>
    </div>
  );
}
