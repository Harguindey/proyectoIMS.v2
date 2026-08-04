import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  products, customers, suppliers, warehouseZones, 
  customerOrders, shippingAgencies 
} from "@shared/schema";

/**
 * Multi-tenant validation guards
 * These helpers ensure that related entities belong to the same organization
 */

export class OrganizationMismatchError extends Error {
  constructor(
    public readonly context: string,
    public readonly expectedOrgId: number,
    public readonly actualOrgId: number | null
  ) {
    super(
      `Organization mismatch in ${context}: expected ${expectedOrgId}, got ${actualOrgId ?? 'null'}`
    );
    this.name = 'OrganizationMismatchError';
  }
}

/**
 * Assert that an entity's organizationId matches the expected organizationId
 * Throws OrganizationMismatchError if they don't match
 */
export function assertSameOrg(
  entityOrgId: number | null | undefined,
  organizationId: number,
  context: string
): void {
  if (entityOrgId !== organizationId) {
    throw new OrganizationMismatchError(context, organizationId, entityOrgId ?? null);
  }
}

/**
 * Validate that a product belongs to the specified organization
 */
export async function validateProductOrg(
  productId: number,
  organizationId: number
): Promise<void> {
  const [product] = await db
    .select({ organizationId: products.organizationId })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  assertSameOrg(product.organizationId, organizationId, `product ${productId}`);
}

/**
 * Validate that a customer belongs to the specified organization
 */
export async function validateCustomerOrg(
  customerId: number,
  organizationId: number
): Promise<void> {
  const [customer] = await db
    .select({ organizationId: customers.organizationId })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer) {
    throw new Error(`Customer ${customerId} not found`);
  }

  assertSameOrg(customer.organizationId, organizationId, `customer ${customerId}`);
}

/**
 * Validate that a supplier belongs to the specified organization
 */
export async function validateSupplierOrg(
  supplierId: number,
  organizationId: number
): Promise<void> {
  const [supplier] = await db
    .select({ organizationId: suppliers.organizationId })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new Error(`Supplier ${supplierId} not found`);
  }

  assertSameOrg(supplier.organizationId, organizationId, `supplier ${supplierId}`);
}

/**
 * Validate that a warehouse zone belongs to the specified organization
 */
export async function validateZoneOrg(
  zoneId: number,
  organizationId: number
): Promise<void> {
  const [zone] = await db
    .select({ organizationId: warehouseZones.organizationId })
    .from(warehouseZones)
    .where(eq(warehouseZones.id, zoneId))
    .limit(1);

  if (!zone) {
    throw new Error(`Warehouse zone ${zoneId} not found`);
  }

  assertSameOrg(zone.organizationId, organizationId, `warehouse zone ${zoneId}`);
}

/**
 * Validate that a customer order belongs to the specified organization
 */
export async function validateOrderOrg(
  orderId: number,
  organizationId: number
): Promise<void> {
  const [order] = await db
    .select({ organizationId: customerOrders.organizationId })
    .from(customerOrders)
    .where(eq(customerOrders.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error(`Customer order ${orderId} not found`);
  }

  assertSameOrg(order.organizationId, organizationId, `customer order ${orderId}`);
}

/**
 * Validate that a shipping agency belongs to the specified organization
 */
export async function validateShippingAgencyOrg(
  agencyId: number,
  organizationId: number
): Promise<void> {
  const [agency] = await db
    .select({ organizationId: shippingAgencies.organizationId })
    .from(shippingAgencies)
    .where(eq(shippingAgencies.id, agencyId))
    .limit(1);

  if (!agency) {
    throw new Error(`Shipping agency ${agencyId} not found`);
  }

  assertSameOrg(agency.organizationId, organizationId, `shipping agency ${agencyId}`);
}

/**
 * Transaction wrapper for multi-table operations
 * Ensures all-or-nothing commits for complex operations
 */
export async function withTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  return await db.transaction(async () => {
    return await operation();
  });
}
