// ─────────────────────────────────────────────────────────────
//  Hook para leer el producto activo desde cualquier componente
// ─────────────────────────────────────────────────────────────
import { activeProduct, isProductMode, isRouteAllowed } from "@/lib/product";

export function useProduct() {
  return {
    product: activeProduct,
    isProductMode: isProductMode(),
    isRouteAllowed,
  };
}
