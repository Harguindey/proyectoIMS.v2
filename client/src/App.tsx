import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { activeProduct, isRouteAllowed, isProductMode } from "@/lib/product";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import WarehouseMap from "@/pages/warehouse-map";
import Products from "@/pages/products-new";
import ProductDetail from "@/pages/product-detail";
import ZoneDetail from "@/pages/zone-detail";
import Movements from "@/pages/movements";
import Reports from "@/pages/reports";
import Procurement from "@/pages/procurement";
import Suppliers from "@/pages/suppliers";
import Customers from "@/pages/customers";
import Orders from "@/pages/orders";
import Reservations from "@/pages/reservations";
import ShippingTracking from "@/pages/shipping-tracking";
import ShippingAgencies from "@/pages/shipping-agencies";
import Settings from "@/pages/settings";
import MenuPage from "@/pages/menu";
import InventoryManagement from "@/pages/inventory-management";
import DataImport from "@/pages/data-import";
import QuickScanPage from "@/pages/quick-scan";
import POSPage from "@/pages/pos";
import InventoryAnalyticsPage from "@/pages/inventory-analytics";
import AdminUsersPage from "@/pages/admin/users";
import AuthorizedEmailsPage from "@/pages/admin/authorized-emails";
import DataSimulationPage from "@/pages/admin/data-simulation";
import InvoicesPage from "@/pages/erp/invoices";
import PurchasesPage from "@/pages/erp/purchases";
import AccountingPage from "@/pages/erp/accounting";
import CrmPage from "@/pages/erp/crm";
import HrPage from "@/pages/erp/hr";
import FiscalCompliancePage from "@/pages/erp/fiscal-compliance";
import SgaPage from "@/pages/sga/index";
import Sidebar from "@/components/sidebar";
import { Header } from "@/components/Header";
import OnboardingTour from "@/components/onboarding-tour";
import { AdminOnly } from "@/components/protected-component";
import { OnboardingProvider, useOnboarding } from "@/hooks/use-onboarding";
import { DeviceProvider } from "@/hooks/use-device-detection";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import PricingPage from "@/pages/pricing";
import BillingPage from "@/pages/billing";
import LandingPage from "@/pages/landing";
import AcceptInvitationPage from "@/pages/accept-invitation";
import TeamPage from "@/pages/team";
import VerifyEmailPage from "@/pages/verify-email";
import OnboardingWizard from "@/components/onboarding-wizard";
import { VerificationBanner } from "@/components/verification-banner";
import { useQuery } from "@tanstack/react-query";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/pricing", "/landing", "/accept-invitation", "/verify-email"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const path = window.location.pathname;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Error comprobando sesión");
      return res.json();
    },
    retry: false,
  });

  if (PUBLIC_PATHS.includes(path)) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!data && path === "/") return <LandingPage />;

  if (!data) {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}

// Bloquea rutas no permitidas por el producto activo
function Guard({ path, component: Component }: { path: string; component: React.ComponentType }) {
  if (!isRouteAllowed(path)) return <NotFound />;
  return <Component />;
}

function Router() {
  const path = window.location.pathname;

  if (path === "/login") return <LoginPage />;
  if (path === "/signup") return <SignupPage />;
  if (path === "/forgot-password") return <ForgotPasswordPage />;
  if (path === "/reset-password") return <ResetPasswordPage />;
  if (path === "/pricing") return <PricingPage />;
  if (path === "/landing") return <LandingPage />;
  if (path === "/accept-invitation") return <AcceptInvitationPage />;
  if (path === "/verify-email") return <VerifyEmailPage />;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        <VerificationBanner />
        <Header />
        <div className="flex-1 overflow-auto custom-scroll">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/warehouse-map"><Guard path="/warehouse-map" component={WarehouseMap} /></Route>
            <Route path="/products"><Guard path="/products" component={Products} /></Route>
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/zone/:id" component={ZoneDetail} />
            <Route path="/inventory-management"><Guard path="/inventory-management" component={InventoryManagement} /></Route>
            <Route path="/data-import"><Guard path="/data-import" component={DataImport} /></Route>
            <Route path="/quick-scan"><Guard path="/quick-scan" component={QuickScanPage} /></Route>
            <Route path="/pos"><Guard path="/pos" component={POSPage} /></Route>
            <Route path="/movements"><Guard path="/movements" component={Movements} /></Route>
            <Route path="/procurement"><Guard path="/procurement" component={Procurement} /></Route>
            <Route path="/suppliers"><Guard path="/suppliers" component={Suppliers} /></Route>
            <Route path="/customers"><Guard path="/customers" component={Customers} /></Route>
            <Route path="/orders"><Guard path="/orders" component={Orders} /></Route>
            <Route path="/reservations"><Guard path="/reservations" component={Reservations} /></Route>
            <Route path="/shipping"><Guard path="/shipping" component={ShippingTracking} /></Route>
            <Route path="/shipping-agencies"><Guard path="/shipping-agencies" component={ShippingAgencies} /></Route>
            <Route path="/reports"><Guard path="/reports" component={Reports} /></Route>
            <Route path="/inventory-analytics"><Guard path="/inventory-analytics" component={InventoryAnalyticsPage} /></Route>
            <Route path="/menu" component={MenuPage} />
            <Route path="/erp/invoices"><Guard path="/erp/invoices" component={InvoicesPage} /></Route>
            <Route path="/erp/purchases"><Guard path="/erp/purchases" component={PurchasesPage} /></Route>
            <Route path="/erp/accounting"><Guard path="/erp/accounting" component={AccountingPage} /></Route>
            <Route path="/erp/crm"><Guard path="/erp/crm" component={CrmPage} /></Route>
            <Route path="/erp/hr"><Guard path="/erp/hr" component={HrPage} /></Route>
            <Route path="/erp/fiscal"><Guard path="/erp/fiscal" component={FiscalCompliancePage} /></Route>
            <Route path="/sga"><Guard path="/sga" component={SgaPage} /></Route>
            <Route path="/settings" component={Settings} />
            <Route path="/billing" component={BillingPage} />
            <Route path="/team" component={TeamPage} />
            <Route path="/admin/users">
              <AdminOnly fallback={<NotFound />}><AdminUsersPage /></AdminOnly>
            </Route>
            <Route path="/admin/authorized-emails">
              <AdminOnly fallback={<NotFound />}><AuthorizedEmailsPage /></AdminOnly>
            </Route>
            <Route path="/admin/data-simulation">
              <AdminOnly fallback={<NotFound />}><DataSimulationPage /></AdminOnly>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    </div>
  );
}

function OnboardingGate() {
  const path = window.location.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  const { data: authData } = useQuery({ queryKey: ["/api/auth/user"] });
  const isLoggedIn = !!authData;

  const { data: onboardingStatus, refetch } = useQuery<{ completed: boolean; orgName: string }>({
    queryKey: ["/api/onboarding/status"],
    enabled: isLoggedIn && !isPublic,
    retry: false,
  });

  const { maybeAutoStart } = useOnboarding();

  const wizardDone = onboardingStatus?.completed === true;
  const showWizard = isLoggedIn && !isPublic && onboardingStatus?.completed === false;

  // El tour guiado se muestra una sola vez: tras iniciar sesión, en una página
  // privada y cuando el asistente de configuración ya está completado.
  // maybeAutoStart solo abre el tour si nunca se ha visto (ver useOnboarding).
  useEffect(() => {
    if (isLoggedIn && !isPublic && wizardDone) {
      const t = setTimeout(() => maybeAutoStart(), 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isPublic, wizardDone]);

  return (
    <OnboardingWizard
      open={showWizard}
      initialOrgName={onboardingStatus?.orgName ?? ""}
      onComplete={() => refetch()}
    />
  );
}

/** Renderiza el tour una única vez, controlado por el contexto de onboarding. */
function TourHost() {
  const { showTour, closeTour } = useOnboarding();
  return (
    <OnboardingTour
      open={showTour}
      onOpenChange={(open) => {
        // Cerrar por cualquier vía (X, "saltar" o "finalizar") lo marca como visto.
        if (!open) closeTour();
      }}
      onComplete={closeTour}
    />
  );
}

/** Aplica el color primario del producto activo via CSS custom properties */
function ProductTheme() {
  useEffect(() => {
    if (!isProductMode()) return;
    // Extraer valores H S L del string "hsl(H, S%, L%)"
    const hsl = activeProduct.primaryColor
      .replace("hsl(", "")
      .replace(")", "")
      .split(",")
      .map((s) => s.trim());
    const [h, s, l] = hsl;
    document.documentElement.style.setProperty("--primary", `${h} ${s} ${l}`);
    document.documentElement.style.setProperty("--ring", `${h} ${s} ${l}`);
    document.title = activeProduct.name;
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DeviceProvider>
        <TooltipProvider>
          <OnboardingProvider>
            <ProductTheme />
            <Toaster />
            <AuthGate>
              <Router />
            </AuthGate>
            <OnboardingGate />
            <TourHost />
          </OnboardingProvider>
        </TooltipProvider>
      </DeviceProvider>
    </QueryClientProvider>
  );
}

export default App;
