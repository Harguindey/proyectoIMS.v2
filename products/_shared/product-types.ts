// ─────────────────────────────────────────────────────────────
//  Tipos compartidos para el sistema multi-producto
// ─────────────────────────────────────────────────────────────

export type ProductId =
  | "full"        // Suite completa (el proyecto original)
  | "stock-pro"   // Gestión de Stock e Inventario
  | "compras-pro" // Gestión de Compras y Proveedores
  | "ventas-pro"  // Ventas, Clientes y TPV
  | "logi-pro"    // Logística y Almacén (SGA)
  | "erp-suite";  // Suite ERP Empresarial

export interface NavItem {
  name: string;
  href: string;
  icon: string; // nombre del icono de lucide-react
}

export interface NavSection {
  title: string | null;
  items: NavItem[];
}

export interface ProductConfig {
  id: ProductId;
  name: string;
  tagline: string;
  description: string;
  /** Color HSL del acento principal (sobrescribe --primary en CSS) */
  primaryColor: string;
  /** Color HSL del acento secundario (sobrescribe --accent en CSS) */
  accentColor: string;
  /** Rutas permitidas en este producto (además de las públicas) */
  allowedRoutes: string[];
  /** Secciones de navegación del sidebar */
  navSections: NavSection[];
  /** Ruta por defecto al autenticarse */
  defaultRoute: string;
}
