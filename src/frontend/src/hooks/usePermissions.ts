import { useCallback, useState } from "react";

export type AppView =
  | "dashboard"
  | "customers"
  | "jobs"
  | "services"
  | "estimates"
  | "invoices"
  | "payments"
  | "financials"
  | "reminders"
  | "mileage-log"
  | "assets"
  | "settings"
  | "profile"
  | "users";

export type PermissionRole = "owner" | "admin" | "tech" | "readonly";

export type PermissionMatrix = Record<AppView, Record<PermissionRole, boolean>>;

// Views that can have their access toggled
export const PERMISSION_VIEWS: { view: AppView; label: string }[] = [
  { view: "dashboard", label: "Dashboard" },
  { view: "customers", label: "Customers" },
  { view: "jobs", label: "Jobs" },
  { view: "services", label: "Services" },
  { view: "estimates", label: "Estimates" },
  { view: "invoices", label: "Invoices" },
  { view: "payments", label: "Payments" },
  { view: "financials", label: "Financials" },
  { view: "reminders", label: "Reminders" },
  { view: "mileage-log", label: "Mileage Log" },
  { view: "assets", label: "Assets" },
  { view: "settings", label: "Settings" },
  { view: "users", label: "Users" },
];

const DEFAULT_MATRIX: PermissionMatrix = {
  dashboard: { owner: true, admin: true, tech: true, readonly: true },
  customers: { owner: true, admin: true, tech: true, readonly: true },
  jobs: { owner: true, admin: true, tech: true, readonly: true },
  services: { owner: true, admin: true, tech: true, readonly: false },
  estimates: { owner: true, admin: true, tech: true, readonly: false },
  invoices: { owner: true, admin: true, tech: false, readonly: false },
  payments: { owner: true, admin: true, tech: false, readonly: false },
  financials: { owner: true, admin: true, tech: false, readonly: false },
  reminders: { owner: true, admin: true, tech: true, readonly: false },
  "mileage-log": { owner: true, admin: true, tech: true, readonly: false },
  assets: { owner: true, admin: true, tech: true, readonly: false },
  settings: { owner: true, admin: false, tech: false, readonly: false },
  profile: { owner: true, admin: true, tech: true, readonly: true },
  users: { owner: true, admin: true, tech: false, readonly: false },
};

const STORAGE_KEY = "permissions_matrix";

function loadMatrix(): PermissionMatrix {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_MATRIX, ...JSON.parse(raw) };
  } catch {
    // ignore parse errors
  }
  return DEFAULT_MATRIX;
}

export function usePermissions() {
  const [matrix, setMatrixState] = useState<PermissionMatrix>(loadMatrix);

  const canAccess = useCallback(
    (role: string, view: AppView): boolean => {
      const normalizedRole = normalizeRole(role);
      const row = matrix[view];
      if (!row) return true; // unknown view = allow
      return row[normalizedRole] ?? false;
    },
    [matrix],
  );

  const setPermission = useCallback(
    (view: AppView, role: PermissionRole, value: boolean) => {
      if (role === "owner") return; // owner always full access
      setMatrixState((prev) => {
        const next = { ...prev, [view]: { ...prev[view], [role]: value } };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  return { matrix, canAccess, setPermission };
}

export function normalizeRole(role: string): PermissionRole {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "tech") return "tech";
  return "readonly";
}
