// ─────────────────────────────────────────────────────────────
//  Registro de todos los productos disponibles
// ─────────────────────────────────────────────────────────────
import type { ProductConfig, ProductId } from "./product-types";

// Rutas públicas comunes a todos los productos
export const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/landing",
  "/accept-invitation",
  "/verify-email",
];

// Rutas de admin y cuenta comunes a todos
const COMMON_ROUTES = [
  "/",
  "/settings",
  "/team",
  "/billing",
  "/reports",
];

// ─── 1. STOCK PRO ────────────────────────────────────────────
const stockPro: ProductConfig = {
  id: "stock-pro",
  name: "StockPro",
  tagline: "Gestión de Stock e Inventario",
  description:
    "Control total de tu inventario: productos, almacén, movimientos y analíticas en tiempo real.",
  primaryColor: "hsl(217, 84%, 56%)",   // Azul (color original)
  accentColor: "hsl(217, 84%, 46%)",
  defaultRoute: "/",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/warehouse-map",
    "/products",
    "/inventory-management",
    "/quick-scan",
    "/data-import",
    "/movements",
    "/inventory-analytics",
    "/admin/users",
    "/admin/authorized-emails",
    "/admin/data-simulation",
  ],
  navSections: [
    {
      title: null,
      items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }],
    },
    {
      title: "Gestión de Inventario",
      items: [
        { name: "Mapa del Almacén", href: "/warehouse-map", icon: "Map" },
        { name: "Productos", href: "/products", icon: "Package" },
        { name: "Gestión de Inventario", href: "/inventory-management", icon: "ArrowRightLeft" },
        { name: "Entrada Rápida", href: "/quick-scan", icon: "Barcode" },
        { name: "Importar Datos", href: "/data-import", icon: "Upload" },
        { name: "Movimientos", href: "/movements", icon: "ArrowUpDown" },
      ],
    },
    {
      title: "Análisis y Reportes",
      items: [
        { name: "Reportes", href: "/reports", icon: "BarChart3" },
        { name: "Análisis de Inventario", href: "/inventory-analytics", icon: "BarChart3" },
      ],
    },
  ],
};

// ─── 2. COMPRAS PRO ──────────────────────────────────────────
const comprasPro: ProductConfig = {
  id: "compras-pro",
  name: "CompraPro",
  tagline: "Gestión de Compras y Proveedores",
  description:
    "Centraliza tus órdenes de compra, proveedores y facturas de entrada en un solo lugar.",
  primaryColor: "hsl(262, 80%, 56%)",   // Morado
  accentColor: "hsl(262, 80%, 46%)",
  defaultRoute: "/",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/procurement",
    "/suppliers",
    "/erp/purchases",
    "/erp/invoices",
    "/admin/users",
    "/admin/authorized-emails",
    "/admin/data-simulation",
  ],
  navSections: [
    {
      title: null,
      items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }],
    },
    {
      title: "Compras y Proveedores",
      items: [
        { name: "Aprovisionamiento", href: "/procurement", icon: "Calendar" },
        { name: "Proveedores", href: "/suppliers", icon: "Truck" },
      ],
    },
    {
      title: "Facturación",
      items: [
        { name: "Facturas de Compra", href: "/erp/purchases", icon: "ShoppingBag" },
        { name: "Facturas", href: "/erp/invoices", icon: "Receipt" },
      ],
    },
    {
      title: "Reportes",
      items: [{ name: "Reportes", href: "/reports", icon: "BarChart3" }],
    },
  ],
};

// ─── 3. VENTAS PRO ───────────────────────────────────────────
const ventasPro: ProductConfig = {
  id: "ventas-pro",
  name: "VentasPro",
  tagline: "Ventas, Clientes y Punto de Venta",
  description:
    "Gestiona clientes, pedidos, reservas y tu TPV desde una plataforma unificada.",
  primaryColor: "hsl(151, 55%, 42%)",   // Verde (color de acento original)
  accentColor: "hsl(151, 55%, 32%)",
  defaultRoute: "/",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/pos",
    "/customers",
    "/orders",
    "/reservations",
    "/erp/crm",
    "/erp/invoices",
    "/admin/users",
    "/admin/authorized-emails",
    "/admin/data-simulation",
  ],
  navSections: [
    {
      title: null,
      items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }],
    },
    {
      title: null,
      items: [{ name: "Punto de Venta (TPV)", href: "/pos", icon: "ShoppingCart" }],
    },
    {
      title: "Ventas y Clientes",
      items: [
        { name: "Clientes", href: "/customers", icon: "Users" },
        { name: "Pedidos", href: "/orders", icon: "FileText" },
        { name: "Reservas", href: "/reservations", icon: "BookmarkPlus" },
      ],
    },
    {
      title: "CRM y Facturación",
      items: [
        { name: "CRM", href: "/erp/crm", icon: "Target" },
        { name: "Facturas", href: "/erp/invoices", icon: "Receipt" },
      ],
    },
    {
      title: "Reportes",
      items: [{ name: "Reportes", href: "/reports", icon: "BarChart3" }],
    },
  ],
};

// ─── 4. LOGI PRO ─────────────────────────────────────────────
const logiPro: ProductConfig = {
  id: "logi-pro",
  name: "LogiPro",
  tagline: "Logística y Gestión de Almacén",
  description:
    "Picking, packing, envíos y trazabilidad logística para operaciones de almacén eficientes.",
  primaryColor: "hsl(25, 95%, 50%)",    // Naranja
  accentColor: "hsl(25, 95%, 40%)",
  defaultRoute: "/",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/warehouse-map",
    "/sga",
    "/shipping",
    "/shipping-agencies",
    "/movements",
    "/admin/users",
    "/admin/authorized-emails",
    "/admin/data-simulation",
  ],
  navSections: [
    {
      title: null,
      items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }],
    },
    {
      title: "SGA – Almacén",
      items: [
        { name: "Mapa del Almacén", href: "/warehouse-map", icon: "Map" },
        { name: "Picking / Packing", href: "/sga", icon: "ClipboardList" },
        { name: "Movimientos", href: "/movements", icon: "ArrowUpDown" },
      ],
    },
    {
      title: "Logística y Envíos",
      items: [
        { name: "Seguimiento", href: "/shipping", icon: "MapPin" },
        { name: "Transportistas", href: "/shipping-agencies", icon: "Truck" },
      ],
    },
    {
      title: "Reportes",
      items: [{ name: "Reportes", href: "/reports", icon: "BarChart3" }],
    },
  ],
};

// ─── 5. ERP SUITE ────────────────────────────────────────────
const erpSuite: ProductConfig = {
  id: "erp-suite",
  name: "ERPSuite",
  tagline: "Suite ERP Empresarial",
  description:
    "Contabilidad, RRHH, cumplimiento fiscal, CRM y facturación en una única plataforma empresarial.",
  primaryColor: "hsl(243, 75%, 56%)",   // Índigo
  accentColor: "hsl(243, 75%, 46%)",
  defaultRoute: "/",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/erp/invoices",
    "/erp/purchases",
    "/erp/accounting",
    "/erp/crm",
    "/erp/hr",
    "/erp/fiscal",
    "/customers",
    "/suppliers",
    "/admin/users",
    "/admin/authorized-emails",
    "/admin/data-simulation",
  ],
  navSections: [
    {
      title: null,
      items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }],
    },
    {
      title: "ERP",
      items: [
        { name: "Facturación", href: "/erp/invoices", icon: "Receipt" },
        { name: "Compras", href: "/erp/purchases", icon: "ShoppingBag" },
        { name: "Contabilidad", href: "/erp/accounting", icon: "Calculator" },
        { name: "CRM", href: "/erp/crm", icon: "Target" },
        { name: "RRHH", href: "/erp/hr", icon: "Building" },
        { name: "Cumplimiento Fiscal", href: "/erp/fiscal", icon: "Shield" },
      ],
    },
    {
      title: "Relaciones",
      items: [
        { name: "Clientes", href: "/customers", icon: "Users" },
        { name: "Proveedores", href: "/suppliers", icon: "Truck" },
      ],
    },
    {
      title: "Reportes",
      items: [{ name: "Reportes", href: "/reports", icon: "BarChart3" }],
    },
  ],
};

// ─── 6. FULL SUITE (original) ────────────────────────────────
const fullSuite: ProductConfig = {
  id: "full",
  name: "LogiPro Suite",
  tagline: "Suite Completa de Gestión",
  description: "La plataforma todo-en-uno: inventario, compras, ventas, logística y ERP.",
  primaryColor: "hsl(217, 84%, 56%)",
  accentColor: "hsl(151, 55%, 42%)",
  defaultRoute: "/",
  allowedRoutes: [], // vacío = todas las rutas permitidas
  navSections: [], // vacío = usar sidebar original completo
};

// ─── Mapa de productos ───────────────────────────────────────
export const PRODUCT_REGISTRY: Record<ProductId, ProductConfig> = {
  "full": fullSuite,
  "stock-pro": stockPro,
  "compras-pro": comprasPro,
  "ventas-pro": ventasPro,
  "logi-pro": logiPro,
  "erp-suite": erpSuite,
};

export function getProductConfig(id?: string): ProductConfig {
  if (id && id in PRODUCT_REGISTRY) {
    return PRODUCT_REGISTRY[id as ProductId];
  }
  return PRODUCT_REGISTRY["full"];
}
