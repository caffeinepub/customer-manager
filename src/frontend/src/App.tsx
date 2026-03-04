import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Leaf, Loader2, LogIn, Shield } from "lucide-react";
import { useState } from "react";
import { AppSidebar } from "./components/AppSidebar";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { JobsPage } from "./pages/JobsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ServicesPage } from "./pages/ServicesPage";
import { SettingsPage } from "./pages/SettingsPage";

export type Page =
  | { view: "dashboard" }
  | { view: "customers" }
  | { view: "customer-detail"; customerId: string }
  | { view: "jobs" }
  | { view: "services" }
  | { view: "invoices" }
  | { view: "settings" }
  | { view: "profile" };

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

  function navigate(p: Page) {
    setPage(p);
  }

  function renderPage() {
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
      case "settings":
        return <SettingsPage />;
      case "profile":
        return <ProfilePage />;
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
