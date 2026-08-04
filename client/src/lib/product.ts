import { getProductConfig, PUBLIC_ROUTES } from "./product-registry";
import type { ProductConfig } from "./product-types";

const PRODUCT_ID = import.meta.env.VITE_PRODUCT as string | undefined;

export const activeProduct: ProductConfig = getProductConfig(PRODUCT_ID);

export function isProductMode(): boolean {
  return activeProduct.id !== "full";
}

export function isRouteAllowed(path: string): boolean {
  if (!isProductMode()) return true;
  const allowed = [...activeProduct.allowedRoutes, ...PUBLIC_ROUTES];
  return allowed.some((r) => path === r || path.startsWith(r + "/"));
}

export { PUBLIC_ROUTES };
