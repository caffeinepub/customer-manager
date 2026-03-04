import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { AppSidebar } from "./components/AppSidebar";
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

export default function App() {
  const [page, setPage] = useState<Page>({ view: "dashboard" });
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
