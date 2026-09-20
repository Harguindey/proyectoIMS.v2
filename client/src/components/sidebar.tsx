import { Link, useLocation } from "wouter";
import {
  Warehouse,
  ChartPie,
  Map,
  Package,
  ArrowUpDown,
  BarChart3,
  Settings,
  User,
  Users,
  Calendar,
  Truck,
  FileText,
  HelpCircle,
  BookmarkPlus,
  ArrowRightLeft,
  Home,
  Grid3X3,
  MapPin,
  Upload,
  Shield,
  Barcode,
  ShoppingCart,
  Sparkles,
  Receipt,
  ShoppingBag,
  Calculator,
  Target,
  Building,
  ClipboardList,
  ChevronDown,
  CreditCard
} from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { useAuth } from "@/hooks/useAuth";
import { useProduct } from "@/hooks/use-product";
import type { LucideIcon } from "lucide-react";

// Mapa para resolver iconos por nombre (usado en configs de producto)
const ICON_MAP: Record<string, LucideIcon> = {
  ChartPie, Map, Package, ArrowRightLeft, Barcode, Upload, ArrowUpDown,
  BarChart3, Calendar, Truck, Users, FileText, BookmarkPlus, Target,
  Receipt, ShoppingBag, Calculator, Building, Shield, ShoppingCart,
  MapPin, ClipboardList, CreditCard, Settings, HelpCircle, Sparkles,
};
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// Navegación organizada por secciones
const navigationSections = [
  {
    title: null,
    items: [
      { name: "Dashboard", href: "/", icon: ChartPie },
    ]
  },
  {
    title: null,
    items: [
      { name: "Punto de Venta (TPV)", href: "/pos", icon: ShoppingCart },
    ]
  },
  {
    title: "Gestión de Inventario",
    items: [
      { name: "Mapa del Almacén", href: "/warehouse-map", icon: Map },
      { name: "Productos", href: "/products", icon: Package },
      { name: "Gestión de Inventario", href: "/inventory-management", icon: ArrowRightLeft },
      { name: "Entrada Rápida", href: "/quick-scan", icon: Barcode },
      { name: "Importar Datos", href: "/data-import", icon: Upload },
      { name: "Movimientos", href: "/movements", icon: ArrowUpDown },
    ]
  },
  {
    title: "Compras y Proveedores",
    items: [
      { name: "Aprovisionamiento", href: "/procurement", icon: Calendar },
      { name: "Proveedores", href: "/suppliers", icon: Truck },
    ]
  },
  {
    title: "Ventas y Clientes",
    items: [
      { name: "Clientes", href: "/customers", icon: Users },
      { name: "Pedidos", href: "/orders", icon: FileText },
      { name: "Reservas", href: "/reservations", icon: BookmarkPlus },
    ]
  },
  {
    title: "Logística y Envíos",
    items: [
      { name: "Seguimiento", href: "/shipping", icon: MapPin },
      { name: "Transportistas", href: "/shipping-agencies", icon: Truck },
    ]
  },
  {
    title: "SGA - Almacen",
    items: [
      { name: "Picking / Packing", href: "/sga", icon: ClipboardList },
    ]
  },
  {
    title: "Analisis y Reportes",
    items: [
      { name: "Reportes", href: "/reports", icon: BarChart3 },
      { name: "Analisis de Inventario", href: "/inventory-analytics", icon: BarChart3 },
    ]
  },
  {
    title: "ERP",
    items: [
      { name: "Facturacion", href: "/erp/invoices", icon: Receipt },
      { name: "Compras", href: "/erp/purchases", icon: ShoppingBag },
      { name: "Contabilidad", href: "/erp/accounting", icon: Calculator },
      { name: "CRM", href: "/erp/crm", icon: Target },
      { name: "RRHH", href: "/erp/hr", icon: Building },
      { name: "Cumplimiento Fiscal", href: "/erp/fiscal", icon: Shield },
    ]
  },
  {
    title: null,
    items: [
      { name: "Equipo", href: "/team", icon: Users },
      { name: "Facturación", href: "/billing", icon: CreditCard },
      { name: "Configuracion", href: "/settings", icon: Settings },
    ]
  }
];

const adminNavigation = [
  { name: "Accesos Autorizados", href: "/admin/authorized-emails", icon: Shield },
  { name: "Simulación de Datos", href: "/admin/data-simulation", icon: Sparkles },
];

// Mobile Navigation Component
function MobileNavigation() {
  const [location] = useLocation();
  const { isMobile } = useDeviceDetection();

  const mobileNavItems = [
    { name: "Inicio", href: "/", icon: Home },
    { name: "Productos", href: "/products", icon: Package },
    { name: "Movimientos", href: "/movements", icon: ArrowUpDown },
    { name: "Pedidos", href: "/orders", icon: FileText },
    { name: "Más", href: "/menu", icon: Settings }
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom"
      data-testid="mobile-navigation"
    >
      <div className="flex items-center justify-between px-2 py-2">
        {mobileNavItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`
                  flex flex-col items-center rounded-lg transition-colors
                  px-2 py-2 min-w-[60px] min-h-[60px] flex-1 max-w-[80px]
                  ${isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-slate-500 hover:text-slate-700'
                  }
                `}
                data-testid={`nav-mobile-${item.href.replace('/', '') || 'home'}`}
              >
                <Icon size={20} className="mb-1" />
                <span className="text-xs font-medium leading-tight text-center">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { startTour } = useOnboarding();
  const { user } = useAuth();
  const { product, isProductMode } = useProduct();

  // En modo producto usamos las secciones del config; si no, las globales
  const activeSections = isProductMode && product.navSections.length > 0
    ? product.navSections
    : navigationSections;

  const isAdmin = user?.roles?.some(ur => ur.role?.name === 'admin');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
  "Gestión de Inventario": true,
  "Compras y Proveedores": false,
  "Ventas y Clientes": false,
  "Logística y Envíos": false,
  "SGA - Almacen": false,
  "Analisis y Reportes": false,
  "ERP": false,
});

const toggleSection = (title: string) => {
  setOpenSections((prev) => ({
    ...prev,
    [title]: !prev[title],
  }));
};

  return (
    <>
      {/* Desktop Sidebar */}
        <div className="hidden md:flex w-72 side-root border-r side-border flex-col flex-shrink-0">        {/* Logo and Header */}
        <div className="px-5 py-6 border-b side-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 side-logo rounded-2xl flex items-center justify-center">
              <Warehouse className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold side-title tracking-tight">{product.name}</h1>
              <p className="text-xs side-tagline">{product.tagline}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scroll">
          {activeSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
        {section.title && (
          <button
            type="button"
            onClick={() => toggleSection(section.title!)}
            className="side-section w-full flex items-center justify-between px-3 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider transition"
         >
            <span>{section.title}</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${
                openSections[section.title] ? "rotate-180" : ""
              }`}
            />
          </button>
        )}

        {(!section.title || openSections[section.title]) && section.items.map((item) => {
                const isActive = location === item.href;
                // Soporte para icon como string (configs de producto) o componente (nav original)
                const Icon: LucideIcon = typeof item.icon === "string"
                  ? (ICON_MAP[item.icon] ?? Package)
                  : (item.icon as LucideIcon);

                return (
                  <Link key={item.name} href={item.href}>
                    <div className={`
                      flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                      ${isActive ? 'side-item-active' : 'side-item'}
                    `}>
                      <Icon className={`mr-3 ${isActive ? 'side-icon-active' : 'side-icon'}`} size={18} />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <div className="side-section px-3 text-xs font-semibold uppercase tracking-wider">
                  Administración
                </div>
              </div>
              {adminNavigation.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.name} href={item.href}>
                    <div className={`
                      flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                      ${isActive ? 'side-item-active' : 'side-item'}
                    `}>
                      <Icon className={`mr-3 ${isActive ? 'side-icon-active' : 'side-icon'}`} size={18} />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Help Button */}
        <div className="p-3 border-t side-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={startTour}
                className="side-item w-full justify-start"
              >
                <HelpCircle className="mr-2" size={16} />
                <span className="text-sm">Ayuda y Tutorial</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Iniciar tutorial de ayuda</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t side-border">
          <UserProfile />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </>
  );
}

// User Profile Component
function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3 p-2 rounded-xl side-card border">
        <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-slate-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-2">
        <div className="text-center text-sm side-tagline mb-3">
          Inicia sesión para acceder a todas las funciones
        </div>
        <Button
          onClick={() => window.location.href = '/api/login'}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="login-button"
        >
          <User className="mr-2" size={16} />
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email?.split('@')[0] || 'Usuario';

  const userRole = user.roles?.[0]?.role?.displayName || 'Usuario';

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3 p-2 rounded-xl side-card border">
        <div className="w-8 h-8 side-logo rounded-full flex items-center justify-center">
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <User className="text-white" size={14} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium side-title truncate">{displayName}</p>
          <p className="text-xs side-tagline truncate">{userRole}</p>
        </div>
      </div>

      <Button
        onClick={async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });

          window.location.href = "/landing";
        }}
        variant="ghost"
        size="sm"
        className="side-item w-full justify-start"
        data-testid="logout-button"
      >
        <User className="mr-2" size={16} />
        <span className="text-sm">Cerrar Sesión</span>
      </Button>
    </div>
  );
}
