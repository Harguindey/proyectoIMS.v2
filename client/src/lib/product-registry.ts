// ─────────────────────────────────────────────────────────────
//  Registro de productos — todo en client/src para que Vite
//  pueda importarlo sin salir de su root.
// ─────────────────────────────────────────────────────────────
import type { ProductConfig, ProductId } from "./product-types";

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

const COMMON_ROUTES = ["/", "/settings", "/team", "/billing", "/reports"];

// ─── StockPro ────────────────────────────────────────────────
const stockPro: ProductConfig = {
  id: "stock-pro",
  name: "StockPro",
  tagline: "Gestión de Stock e Inventario",
  description: "Control total de tu inventario: productos, almacén, movimientos y analíticas.",
  primaryColor: "hsl(217, 84%, 56%)",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/warehouse-map", "/products", "/inventory-management",
    "/quick-scan", "/data-import", "/movements", "/inventory-analytics",
    "/admin/users", "/admin/authorized-emails", "/admin/data-simulation",
  ],
  navSections: [
    { title: null, items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }] },
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

// ─── CompraPro ───────────────────────────────────────────────
const comprasPro: ProductConfig = {
  id: "compras-pro",
  name: "CompraPro",
  tagline: "Gestión de Compras y Proveedores",
  description: "Centraliza órdenes de compra, proveedores y facturas de entrada.",
  primaryColor: "hsl(262, 80%, 56%)",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/procurement", "/suppliers", "/erp/purchases", "/erp/invoices",
    "/admin/users", "/admin/authorized-emails", "/admin/data-simulation",
  ],
  navSections: [
    { title: null, items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }] },
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

// ─── VentasPro ───────────────────────────────────────────────
const ventasPro: ProductConfig = {
  id: "ventas-pro",
  name: "VentasPro",
  tagline: "Ventas, Clientes y Punto de Venta",
  description: "Gestiona clientes, pedidos, reservas y TPV desde una plataforma unificada.",
  primaryColor: "hsl(151, 55%, 42%)",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/pos", "/customers", "/orders", "/reservations", "/erp/crm", "/erp/invoices",
    "/admin/users", "/admin/authorized-emails", "/admin/data-simulation",
  ],
  navSections: [
    { title: null, items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }] },
    { title: null, items: [{ name: "Punto de Venta (TPV)", href: "/pos", icon: "ShoppingCart" }] },
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

// ─── LogiPro ─────────────────────────────────────────────────
const logiPro: ProductConfig = {
  id: "logi-pro",
  name: "LogiPro",
  tagline: "Logística y Gestión de Almacén",
  description: "Picking, packing, envíos y trazabilidad para operaciones de almacén eficientes.",
  primaryColor: "hsl(25, 95%, 50%)",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/warehouse-map", "/sga", "/shipping", "/shipping-agencies", "/movements",
    "/admin/users", "/admin/authorized-emails", "/admin/data-simulation",
  ],
  navSections: [
    { title: null, items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }] },
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

// ─── ERPSuite ────────────────────────────────────────────────
const erpSuite: ProductConfig = {
  id: "erp-suite",
  name: "ERPSuite",
  tagline: "Suite ERP Empresarial",
  description: "Contabilidad, RRHH, fiscal, CRM y facturación en una plataforma empresarial.",
  primaryColor: "hsl(243, 75%, 56%)",
  allowedRoutes: [
    ...COMMON_ROUTES,
    "/erp/invoices", "/erp/purchases", "/erp/accounting",
    "/erp/crm", "/erp/hr", "/erp/fiscal",
    "/customers", "/suppliers",
    "/admin/users", "/admin/authorized-emails", "/admin/data-simulation",
  ],
  navSections: [
    { title: null, items: [{ name: "Dashboard", href: "/", icon: "ChartPie" }] },
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

// ─── Suite completa (original) ───────────────────────────────
const fullSuite: ProductConfig = {
  id: "full",
  name: "LogiPro Suite",
  tagline: "Suite Completa de Gestión",
  description: "La plataforma todo-en-uno: inventario, compras, ventas, logística y ERP.",
  primaryColor: "hsl(217, 84%, 56%)",
  allowedRoutes: [],   // vacío = todas las rutas permitidas
  navSections: [],     // vacío = sidebar original completo
};

// ─── Mapa público ────────────────────────────────────────────
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
