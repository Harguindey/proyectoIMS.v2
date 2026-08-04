// ─────────────────────────────────────────────────────────────
//  Tipos del sistema multi-producto
// ─────────────────────────────────────────────────────────────

export type ProductId =
  | "full"         // Suite completa (el proyecto original)
  | "stock-pro"    // Gestión de Stock e Inventario
  | "compras-pro"  // Gestión de Compras y Proveedores
  | "ventas-pro"   // Ventas, Clientes y TPV
  | "logi-pro"     // Logística y Almacén (SGA)
  | "erp-suite";   // Suite ERP Empresarial

export interface ProductNavItem {
  name: string;
  href: string;
  icon: string; // nombre del icono lucide-react
}

export interface ProductNavSection {
  title: string | null;
  items: ProductNavItem[];
}

export interface ProductConfig {
  id: ProductId;
  name: string;
  tagline: string;
  description: string;
  /** Color HSL completo, ej: "hsl(217, 84%, 56%)" */
  primaryColor: string;
  /** Rutas internas permitidas (vacío = todas) */
  allowedRoutes: string[];
  /** Secciones del sidebar (vacío = sidebar completo original) */
  navSections: ProductNavSection[];
}
