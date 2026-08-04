import { pgTable, text, serial, integer, timestamp, decimal, varchar, date, boolean, json, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth - Extended with role relationships
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roles table - admin, supervisor, operador, viewer
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User-Role relationships (Many-to-Many)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("idx_user_roles_user_id").on(table.userId),
  index("idx_user_roles_role_id").on(table.roleId),
]);

// Permissions table for granular access control
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  module: varchar("module", { length: 50 }).notNull(), // inventory, warehouse, movements, orders, suppliers, customers, reports
  action: varchar("action", { length: 20 }).notNull(), // read, write, delete, admin
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_permissions_module_action").on(table.module, table.action),
]);

// Role-Permission relationships
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_role_permissions_role_id").on(table.roleId),
  index("idx_role_permissions_permission_id").on(table.permissionId),
]);

// ==================== MULTI-TENANT TABLES ====================

// Organizations (Companies/Tenants) - Each customer company is one organization
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL-friendly identifier
  industry: varchar("industry", { length: 100 }), // tires, electronics, clothing, etc.
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  currency: varchar("currency", { length: 3 }).default("EUR"), // ISO 4217 currency code
  language: varchar("language", { length: 10 }).default("es"),
  plan: varchar("plan", { length: 20 }).notNull().default("free"), // free, professional, enterprise
  isActive: boolean("is_active").default(true),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  settings: json("settings"), // Logo, colors, custom fields, etc.
  warehouseAddress: text("warehouse_address"), // Default warehouse address for this org
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organizations_slug").on(table.slug),
  index("idx_organizations_is_active").on(table.isActive),
]);

// User-Organization relationships (Many-to-Many) - Users can belong to multiple orgs
export const organizationUsers = pgTable("organization_users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 50 }).notNull().default("member"), // owner, admin, member, viewer
  isActive: boolean("is_active").default(true),
  invitedBy: varchar("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_org_users_user_id").on(table.userId),
  index("idx_org_users_org_id").on(table.organizationId),
]);

// ==================== BUSINESS TABLES (Now Multi-Tenant) ====================

export const warehouseZones = pgTable("warehouse_zones", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(100),
  currentOccupancy: integer("current_occupancy").notNull().default(0),
}, (table) => [
  index("idx_warehouse_zones_org_id").on(table.organizationId),
  uniqueIndex("uq_warehouse_zones_org_code").on(table.organizationId, table.code),
]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(100),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  warehouseZoneId: integer("warehouse_zone_id").references(() => warehouseZones.id),
  leadTimeDays: integer("lead_time_days").default(7),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name"),
  reorderPoint: integer("reorder_point"),
  safetyStock: integer("safety_stock"),
  orderQuantity: integer("order_quantity"),
  isDropshipping: boolean("is_dropshipping").default(false),
  dropshippingSupplierId: integer("dropshipping_supplier_id").references(() => suppliers.id),
  dropshippingLeadTimeDays: integer("dropshipping_lead_time_days"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_products_org_id").on(table.organizationId),
  uniqueIndex("uq_products_org_sku").on(table.organizationId, table.sku),
  index("idx_products_org_supplier").on(table.organizationId, table.supplierId),
  index("idx_products_org_zone").on(table.organizationId, table.warehouseZoneId),
]);

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  reliability: decimal("reliability", { precision: 5, scale: 2 }).default("95.00"), // percentage
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_suppliers_org_id").on(table.organizationId),
]);

export const procurementPlans = pgTable("procurement_plans", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  productId: integer("product_id").notNull().references(() => products.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  plannedOrderDate: timestamp("planned_order_date").notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("planned"), // planned, ordered, delivered, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_procurement_plans_org_id").on(table.organizationId),
  index("idx_procurement_plans_org_product").on(table.organizationId, table.productId),
  index("idx_procurement_plans_org_status").on(table.organizationId, table.status),
]);

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text("type").notNull(), // 'entry' | 'exit' | 'transfer'
  quantity: integer("quantity").notNull(),
  fromZoneId: integer("from_zone_id").references(() => warehouseZones.id),
  toZoneId: integer("to_zone_id").references(() => warehouseZones.id),
  reason: text("reason"),
  notes: text("notes"),
  orderId: integer("order_id").references(() => customerOrders.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_stock_movements_org_id").on(table.organizationId),
  index("idx_stock_movements_org_product").on(table.organizationId, table.productId),
  index("idx_stock_movements_org_type").on(table.organizationId, table.type),
]);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_customers_org_id").on(table.organizationId),
  index("idx_customers_org_email").on(table.organizationId, table.email),
]);

export const customerAddresses = pgTable("customer_addresses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: integer("customer_id").references(() => customers.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state"),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("México"),
  isDefault: boolean("is_default").default(false),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_customer_addresses_org_id").on(table.organizationId),
]);

export const customerOrders = pgTable("customer_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  orderNumber: text("order_number").notNull(),
  status: text("status", { 
    enum: ["pending", "preparing", "shipped", "delivered", "cancelled"] 
  }).notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  orderDate: timestamp("order_date").defaultNow(),
  shippedDate: timestamp("shipped_date"),
  deliveredDate: timestamp("delivered_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_customer_orders_org_id").on(table.organizationId),
  uniqueIndex("uq_customer_orders_org_order_num").on(table.organizationId, table.orderNumber),
  index("idx_customer_orders_org_customer").on(table.organizationId, table.customerId),
]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderId: integer("order_id").notNull().references(() => customerOrders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  reservedStock: integer("reserved_stock").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_order_items_org_id").on(table.organizationId),
  index("idx_order_items_org_order").on(table.organizationId, table.orderId),
  index("idx_order_items_org_product").on(table.organizationId, table.productId),
]);

// Agencias de transporte
export const shippingAgencies = pgTable("shipping_agencies", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  website: text("website"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  apiEndpoint: text("api_endpoint"),
  trackingUrlTemplate: text("tracking_url_template"), // e.g., "https://tracking.company.com/track/{trackingNumber}"
  isActive: boolean("is_active").default(true),
  deliveryTimeMin: integer("delivery_time_min").default(1), // días mínimos
  deliveryTimeMax: integer("delivery_time_max").default(7), // días máximos
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_shipping_agencies_org_id").on(table.organizationId),
  uniqueIndex("uq_shipping_agencies_org_code").on(table.organizationId, table.code),
]);

// Tarifas de envío por zona/peso
export const shippingRates = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  agencyId: integer("agency_id").notNull().references(() => shippingAgencies.id),
  zoneName: text("zone_name").notNull(), // "Nacional", "Península", "Islas", "Internacional"
  weightMin: decimal("weight_min", { precision: 8, scale: 2 }).default("0.00"), // kg
  weightMax: decimal("weight_max", { precision: 8, scale: 2 }).default("999.99"), // kg
  baseCost: decimal("base_cost", { precision: 10, scale: 2 }).notNull(),
  costPerKg: decimal("cost_per_kg", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_shipping_rates_org_id").on(table.organizationId),
]);

// Información extendida de pedidos con logística
export const orderShipping = pgTable("order_shipping", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderId: integer("order_id").notNull().references(() => customerOrders.id),
  shippingAgencyId: integer("shipping_agency_id").references(() => shippingAgencies.id),
  trackingNumber: text("tracking_number"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  estimatedWeight: decimal("estimated_weight", { precision: 8, scale: 2 }), // kg
  packageDimensions: text("package_dimensions"), // "30x20x15 cm"
  shippingZone: text("shipping_zone"), // "Nacional", "Península", etc.
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone"),
  recipientEmail: text("recipient_email"),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingPostalCode: text("shipping_postal_code").notNull(),
  shippingCountry: text("shipping_country").default("España"),
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  deliveryAttempts: integer("delivery_attempts").default(0),
  specialInstructions: text("special_instructions"),
  requiresSignature: boolean("requires_signature").default(false),
  isFragile: boolean("is_fragile").default(false),
  insuranceValue: decimal("insurance_value", { precision: 10, scale: 2 }),
  status: text("status", {
    enum: ["pending", "processing", "shipped", "in_transit", "out_for_delivery", "delivered", "failed_delivery", "returned"]
  }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_order_shipping_org_id").on(table.organizationId),
  index("idx_order_shipping_org_order").on(table.organizationId, table.orderId),
  index("idx_order_shipping_org_status").on(table.organizationId, table.status),
]);

// Eventos de tracking
export const shippingEvents = pgTable("shipping_events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderShippingId: integer("order_shipping_id").notNull().references(() => orderShipping.id),
  eventType: text("event_type").notNull(), // "pickup", "transit", "delivery_attempt", "delivered", etc.
  eventDescription: text("event_description").notNull(),
  eventLocation: text("event_location"),
  eventDate: timestamp("event_date").notNull(),
  isPublic: boolean("is_public").default(true), // si se muestra al cliente
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_shipping_events_org_id").on(table.organizationId),
]);

// Authorized Emails - Access Control Whitelist
export const authorizedEmails = pgTable("authorized_emails", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  plan: varchar("plan", { length: 20 }).notNull().default('free'), // 'free' or 'premium'
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ==================== MULTI-TENANT SCHEMAS ====================

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationUserSchema = createInsertSchema(organizationUsers).omit({
  id: true,
  joinedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type OrganizationUser = typeof organizationUsers.$inferSelect;
export type InsertOrganizationUser = z.infer<typeof insertOrganizationUserSchema>;

// ==================== BUSINESS SCHEMAS ====================

export const insertWarehouseZoneSchema = createInsertSchema(warehouseZones).omit({
  id: true,
  organizationId: true,
  currentOccupancy: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertProcurementPlanSchema = createInsertSchema(procurementPlans).omit({
  id: true,
  organizationId: true,
  createdAt: true,
}).extend({
  plannedOrderDate: z.coerce.date(),
  expectedDeliveryDate: z.coerce.date(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export const insertCustomerOrderSchema = createInsertSchema(customerOrders).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  orderDate: true,
  shippedDate: true,
  deliveredDate: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  organizationId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export type WarehouseZone = typeof warehouseZones.$inferSelect;
export type InsertWarehouseZone = z.infer<typeof insertWarehouseZoneSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type ProcurementPlan = typeof procurementPlans.$inferSelect;
export type InsertProcurementPlan = z.infer<typeof insertProcurementPlanSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;

export type CustomerOrder = typeof customerOrders.$inferSelect;
export type InsertCustomerOrder = z.infer<typeof insertCustomerOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Esquemas de validación para logística
export const insertShippingAgencySchema = createInsertSchema(shippingAgencies).omit({
  id: true,
  createdAt: true,
});

export const insertShippingRateSchema = createInsertSchema(shippingRates).omit({
  id: true,
  createdAt: true,
});

export const insertOrderShippingSchema = createInsertSchema(orderShipping).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShippingEventSchema = createInsertSchema(shippingEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  eventDate: z.coerce.date(),
});

// Tipos para logística
export type ShippingAgency = typeof shippingAgencies.$inferSelect;
export type InsertShippingAgency = z.infer<typeof insertShippingAgencySchema>;

export type ShippingRate = typeof shippingRates.$inferSelect;
export type InsertShippingRate = z.infer<typeof insertShippingRateSchema>;

export type OrderShipping = typeof orderShipping.$inferSelect;
export type InsertOrderShipping = z.infer<typeof insertOrderShippingSchema>;

export type ShippingEvent = typeof shippingEvents.$inferSelect;
export type InsertShippingEvent = z.infer<typeof insertShippingEventSchema>;

// Esquema y tipos para Authorized Emails
export const insertAuthorizedEmailSchema = createInsertSchema(authorizedEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  plan: z.enum(['free', 'premium']).default('free'),
});

export type AuthorizedEmail = typeof authorizedEmails.$inferSelect;
export type InsertAuthorizedEmail = z.infer<typeof insertAuthorizedEmailSchema>;

// Nueva tabla: Reservas de productos
export const productReservations = pgTable("product_reservations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  reservationDate: timestamp("reservation_date").defaultNow(),
  expirationDate: timestamp("expiration_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, expired, converted, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_product_reservations_org_id").on(table.organizationId),
]);

// Nueva tabla: Seguimiento de envíos
export const shipmentTracking = pgTable("shipment_tracking", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderId: integer("order_id").notNull().references(() => customerOrders.id),
  carrier: varchar("carrier", { length: 50 }).notNull(), // correos, seur, ups, dhl
  trackingNumber: varchar("tracking_number", { length: 100 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending, shipped, in_transit, delivered, exception
  shippedDate: timestamp("shipped_date"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  lastUpdate: timestamp("last_update").defaultNow(),
  trackingEvents: json("tracking_events"), // Array de eventos de seguimiento
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_shipment_tracking_org_id").on(table.organizationId),
]);

// Nueva tabla: Devoluciones
export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderId: integer("order_id").notNull().references(() => customerOrders.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  returnNumber: varchar("return_number", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("requested"), // requested, approved, shipped_back, received, processed, refunded
  reason: varchar("reason", { length: 100 }).notNull(), // defective, wrong_item, not_as_described, changed_mind
  description: text("description"),
  requestDate: timestamp("request_date").defaultNow(),
  approvedDate: timestamp("approved_date"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundMethod: varchar("refund_method", { length: 30 }), // original_payment, store_credit, bank_transfer
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_returns_org_id").on(table.organizationId),
  uniqueIndex("uq_returns_org_return_num").on(table.organizationId, table.returnNumber),
  index("idx_returns_org_customer").on(table.organizationId, table.customerId),
]);

// Nueva tabla: Items de devolución
export const returnItems = pgTable("return_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  returnId: integer("return_id").notNull().references(() => returns.id),
  orderItemId: integer("order_item_id").notNull().references(() => orderItems.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  condition: varchar("condition", { length: 20 }).notNull(), // new, used, damaged
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  restockable: boolean("restockable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_return_items_org_id").on(table.organizationId),
]);

// Nueva tabla: Análisis de ventas (para panel avanzado)
export const salesAnalytics = pgTable("sales_analytics", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  productId: integer("product_id").references(() => products.id),
  categoryId: varchar("category", { length: 50 }),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  zoneId: integer("zone_id").references(() => warehouseZones.id),
  quantitySold: integer("quantity_sold").default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  profit: decimal("profit", { precision: 12, scale: 2 }).default("0"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sales_analytics_org_id").on(table.organizationId),
]);

// Nueva tabla: Ventas TPV / Punto de Venta
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // cash, card, transfer
  cashReceived: decimal("cash_received", { precision: 10, scale: 2 }),
  cashChange: decimal("cash_change", { precision: 10, scale: 2 }),
  userId: varchar("user_id").references(() => users.id),
  customerName: varchar("customer_name", { length: 200 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  shippingAddressId: integer("shipping_address_id").references(() => customerAddresses.id),
  hasDropshippingItems: boolean("has_dropshipping_items").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sales_org_id").on(table.organizationId),
  index("idx_sales_org_user").on(table.organizationId, table.userId),
  index("idx_sales_org_date").on(table.organizationId, table.createdAt),
]);

// Nueva tabla: Items/líneas de venta
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  saleId: integer("sale_id").notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  productSku: text("product_sku").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  fulfillmentType: varchar("fulfillment_type", { length: 20 }).notNull().default("stock"), // 'stock' o 'dropshipping'
  supplierId: integer("supplier_id").references(() => suppliers.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sale_items_org_id").on(table.organizationId),
  index("idx_sale_items_org_sale").on(table.organizationId, table.saleId),
  index("idx_sale_items_org_product").on(table.organizationId, table.productId),
]);

// Schemas de inserción para las nuevas tablas
export const insertProductReservationSchema = createInsertSchema(productReservations).omit({
  id: true,
  organizationId: true,
  reservationDate: true,
  createdAt: true,
}).extend({
  expirationDate: z.coerce.date(),
});

export const insertShipmentTrackingSchema = createInsertSchema(shipmentTracking).omit({
  id: true,
  lastUpdate: true,
  createdAt: true,
}).extend({
  shippedDate: z.coerce.date().optional(),
  estimatedDelivery: z.coerce.date().optional(),
  actualDelivery: z.coerce.date().optional(),
});

export const insertReturnSchema = createInsertSchema(returns).omit({
  id: true,
  requestDate: true,
  createdAt: true,
}).extend({
  approvedDate: z.coerce.date().optional(),
});

export const insertReturnItemSchema = createInsertSchema(returnItems).omit({
  id: true,
  createdAt: true,
});

export const insertSalesAnalyticsSchema = createInsertSchema(salesAnalytics).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.coerce.date(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
  createdAt: true,
});

// Tipos para las nuevas tablas
export type ProductReservation = typeof productReservations.$inferSelect;
export type InsertProductReservation = z.infer<typeof insertProductReservationSchema>;

export type ShipmentTracking = typeof shipmentTracking.$inferSelect;
export type InsertShipmentTracking = z.infer<typeof insertShipmentTrackingSchema>;

export type Return = typeof returns.$inferSelect;
export type InsertReturn = z.infer<typeof insertReturnSchema>;

export type ReturnItem = typeof returnItems.$inferSelect;
export type InsertReturnItem = z.infer<typeof insertReturnItemSchema>;

export type SalesAnalytics = typeof salesAnalytics.$inferSelect;
export type InsertSalesAnalytics = z.infer<typeof insertSalesAnalyticsSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;

// ==================== SUBSCRIPTIONS (Stripe billing) ====================

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }).unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }).unique(),
  stripePriceId: varchar("stripe_price_id", { length: 100 }),
  plan: varchar("plan", { length: 20 }).notNull().default("free"), // free, starter, pro, enterprise
  status: varchar("status", { length: 20 }).notNull().default("trialing"), // trialing, active, past_due, canceled, incomplete
  trialStart: timestamp("trial_start").defaultNow(),
  trialEnd: timestamp("trial_end"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// ==================== PASSWORD RESET TOKENS ====================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_prt_token").on(table.token),
  index("idx_prt_user_id").on(table.userId),
]);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ==================== EMAIL VERIFICATION TOKENS ====================

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_evt_token").on(table.token),
  index("idx_evt_user_id").on(table.userId),
]);

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// ==================== USER INVITATIONS ====================

export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar("email", { length: 255 }).notNull(),
  roleId: integer("role_id").references(() => roles.id),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_inv_token").on(table.token),
  index("idx_inv_org_email").on(table.organizationId, table.email),
]);

export const insertUserInvitationSchema = createInsertSchema(userInvitations);
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;

// Auth and Role Types for Replit Auth integration
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// Schemas for role management
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});
