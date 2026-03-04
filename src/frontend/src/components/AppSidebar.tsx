import { cn } from "@/lib/utils";
import {
  BarChart2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  Leaf,
  Settings,
  User,
  Users,
  Wrench,
} from "lucide-react";
import type { Page } from "../App";

interface NavItem {
  label: string;
  icon: React.ElementType;
  view: Page["view"];
  ocid: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    view: "dashboard",
    ocid: "nav.dashboard.link",
  },
  {
    label: "Customers",
    icon: Users,
    view: "customers",
    ocid: "nav.customers.link",
  },
  { label: "Jobs", icon: Briefcase, view: "jobs", ocid: "nav.jobs.link" },
  {
    label: "Services",
    icon: Wrench,
    view: "services",
    ocid: "nav.services.link",
  },
  {
    label: "Invoices",
    icon: FileText,
    view: "invoices",
    ocid: "nav.invoices.link",
  },
  {
    label: "Payments",
    icon: CreditCard,
    view: "payments",
    ocid: "nav.payments.link",
  },
  {
    label: "Financials",
    icon: BarChart2,
    view: "financials",
    ocid: "nav.financials.link",
  },
  {
    label: "Settings",
    icon: Settings,
    view: "settings",
    ocid: "nav.settings.link",
  },
  {
    label: "My Profile",
    icon: User,
    view: "profile",
    ocid: "nav.profile.link",
  },
];

interface Props {
  currentView: Page["view"];
  navigate: (p: Page) => void;
  open: boolean;
  onToggle: () => void;
}

export function AppSidebar({ currentView, navigate, open, onToggle }: Props) {
  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0",
        open ? "w-56" : "w-16",
      )}
      style={{ borderRight: "1px solid oklch(var(--sidebar-border))" }}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b",
          "border-sidebar-border",
        )}
      >
        <div className="shrink-0 w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Leaf className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {open && (
          <div className="overflow-hidden">
            <p className="font-display font-bold text-sm leading-tight text-sidebar-foreground whitespace-nowrap">
              FieldPro
            </p>
            <p className="text-xs text-sidebar-foreground/50 whitespace-nowrap">
              Service Manager
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.view ||
              (item.view === "customers" && currentView === "customer-detail");

            return (
              <li key={item.view}>
                <button
                  type="button"
                  data-ocid={item.ocid}
                  onClick={() => navigate({ view: item.view } as Page)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs"
                      : "text-sidebar-foreground/70",
                  )}
                  title={!open ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {open && (
                    <span className="whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "absolute -right-3 top-[4.5rem] z-10",
          "w-6 h-6 rounded-full bg-sidebar-accent border border-sidebar-border",
          "flex items-center justify-center text-sidebar-foreground/60",
          "hover:text-sidebar-foreground transition-colors shadow-xs",
        )}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        {open ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {/* Footer */}
      {open && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/30 leading-relaxed">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sidebar-foreground/60 transition-colors"
            >
              Built with caffeine.ai
            </a>
          </p>
        </div>
      )}
    </aside>
  );
}
