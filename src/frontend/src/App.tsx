import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Leaf, Loader2, LogIn, Shield, ShieldOff } from "lucide-react";
import { useState } from "react";
import { AppSidebar } from "./components/AppSidebar";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  type AppView,
  normalizeRole,
  usePermissions,
} from "./hooks/usePermissions";
import { useUserProfile } from "./hooks/useQueries";
import { useUserTheme } from "./hooks/useUserTheme";
import { AssetsPage } from "./pages/AssetsPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { CustomerPortalPage } from "./pages/CustomerPortalPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EstimatesPage } from "./pages/EstimatesPage";
import { FinancialsPage } from "./pages/FinancialsPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { JobsPage } from "./pages/JobsPage";
import { MileageLogPage } from "./pages/MileageLogPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RemindersPage } from "./pages/RemindersPage";
import { ServicesPage } from "./pages/ServicesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";

export type Page =
  | { view: "dashboard" }
  | { view: "customers" }
  | { view: "customer-detail"; customerId: string }
  | { view: "jobs" }
  | { view: "services" }
  | { view: "invoices" }
  | { view: "payments" }
  | { view: "financials" }
  | { view: "estimates" }
  | { view: "reminders" }
  | { view: "mileage-log" }
  | { view: "assets" }
  | { view: "settings" }
  | { view: "profile" }
  | { view: "users" };

// ─── Access Denied Page ───────────────────────────────────────
function AccessDeniedPage() {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <div className="text-center space-y-3">
        <ShieldOff className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="font-display text-xl font-bold text-foreground">
          Access Restricted
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don't have permission to view this page. Contact your admin to
          request access.
        </p>
      </div>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-sidebar">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg">
          <Leaf className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 text-sidebar-foreground/60 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Initializing…</span>
        </div>
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────
function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="flex h-screen bg-sidebar">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-80 shrink-0 p-8 border-r border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-md">
            <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-sidebar-foreground">
              FieldPro
            </p>
            <p className="text-xs text-sidebar-foreground/50">
              Service Manager
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sidebar-foreground/50 text-xs">
              <div className="w-5 h-5 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                <Shield className="w-3 h-3 text-sidebar-primary-foreground/70" />
              </div>
              Secure on-chain storage
            </div>
            <div className="flex items-center gap-2 text-sidebar-foreground/50 text-xs">
              <div className="w-5 h-5 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                <Leaf className="w-3 h-3 text-sidebar-primary-foreground/70" />
              </div>
              Your data, your control
            </div>
          </div>
          <p className="text-xs text-sidebar-foreground/30 leading-relaxed">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sidebar-foreground/50 transition-colors"
            >
              Built with caffeine.ai
            </a>
          </p>
        </div>
      </div>

      {/* Main login area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-md">
              <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <p className="font-display font-bold text-sidebar-foreground">
              FieldPro
            </p>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-sidebar-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-sidebar-foreground/50 leading-relaxed">
              Sign in to access your customers, jobs, and invoices. Your data is
              secured on the Internet Computer.
            </p>
          </div>

          {/* Sign in button */}
          <div className="space-y-3">
            <Button
              data-ocid="login.primary_button"
              onClick={login}
              disabled={isLoggingIn}
              className="w-full h-11 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-semibold gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in with Internet Identity
                </>
              )}
            </Button>
            <p className="text-xs text-center text-sidebar-foreground/30 leading-relaxed">
              Internet Identity is a secure, privacy-preserving authentication
              system. No passwords required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const [page, setPage] = useState<Page>({ view: "dashboard" });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check for customer portal URL param
  const portalId = new URLSearchParams(window.location.search).get("portal");

  // Render portal if requested (no auth required)
  if (portalId) {
    return (
      <>
        <CustomerPortalPage customerId={portalId} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  // Show loading while auth is initializing
  if (isInitializing) {
    return (
      <>
        <LoadingScreen />
        <Toaster position="bottom-right" />
      </>
    );
  }

  // Show login gate if not authenticated
  if (!identity) {
    return (
      <>
        <LoginScreen />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <AuthenticatedApp
      identity={identity}
      page={page}
      setPage={setPage}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    />
  );
}

// ─── Authenticated App (hooks that require auth) ───────────────
interface AuthenticatedAppProps {
  identity: NonNullable<ReturnType<typeof useInternetIdentity>["identity"]>;
  page: Page;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function AuthenticatedApp({
  identity,
  page,
  setPage,
  sidebarOpen,
  setSidebarOpen,
}: AuthenticatedAppProps) {
  const { data: profile } = useUserProfile();
  const { canAccess } = usePermissions();

  // Apply per-user theme on mount (reads from localStorage via useState initializer)
  useUserTheme(identity.getPrincipal()?.toText());

  function navigate(p: Page) {
    setPage(p);
  }

  function getPermissionView(p: Page): AppView {
    // customer-detail maps to the "customers" permission
    if (p.view === "customer-detail") return "customers";
    return p.view as AppView;
  }

  function renderPage() {
    const permView = getPermissionView(page);
    const role = profile?.role ?? "readonly";

    if (!canAccess(role, permView)) {
      return <AccessDeniedPage />;
    }

    switch (page.view) {
      case "dashboard":
        return <DashboardPage navigate={navigate} />;
      case "customers":
        return <CustomersPage navigate={navigate} />;
      case "customer-detail":
        return (
          <CustomerDetailPage
            customerId={page.customerId}
            navigate={navigate}
          />
        );
      case "jobs":
        return <JobsPage navigate={navigate} />;
      case "services":
        return <ServicesPage />;
      case "invoices":
        return <InvoicesPage navigate={navigate} />;
      case "payments":
        return <PaymentsPage navigate={navigate} />;
      case "financials":
        return <FinancialsPage navigate={navigate} />;
      case "estimates":
        return <EstimatesPage navigate={navigate} />;
      case "reminders":
        return <RemindersPage navigate={navigate} />;
      case "mileage-log":
        return <MileageLogPage navigate={navigate} />;
      case "assets":
        return <AssetsPage navigate={navigate} />;
      case "settings":
        return <SettingsPage />;
      case "profile":
        return <ProfilePage />;
      case "users":
        return <UsersPage />;
      default:
        return <DashboardPage navigate={navigate} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        currentView={page.view}
        navigate={navigate}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="animate-fade-in">{renderPage()}</div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
