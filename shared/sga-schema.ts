import { pgTable, text, serial, integer, timestamp, decimal, varchar, boolean, json, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations, products, warehouseZones } from "./schema";
import { employees } from "./erp-schema";

// ==================== SGA - WAREHOUSE MANAGEMENT SYSTEM ====================

// Warehouse locations (bin/shelf/level positions within zones)
export const warehouseLocations = pgTable("warehouse_locations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  zoneId: integer("zone_id").references(() => warehouseZones.id),
  code: varchar("code", { length: 30 }).notNull(), // e.g. A-01-03 (zone-shelf-level)
  name: varchar("name", { length: 100 }),
  type: varchar("type", { length: 20 }).notNull().default("shelf"), // shelf, floor, dock, staging, cold
  aisle: varchar("aisle", { length: 10 }),
  rack: varchar("rack", { length: 10 }),
  level: varchar("level", { length: 10 }),
  maxWeight: decimal("max_weight", { precision: 8, scale: 2 }), // kg
  maxVolume: decimal("max_volume", { precision: 8, scale: 2 }), // m3
  isActive: boolean("is_active").default(true),
  isReserved: boolean("is_reserved").default(false),
  currentProductId: integer("current_product_id"),
  currentQuantity: integer("current_quantity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wh_locations_org_id").on(table.organizationId),
  uniqueIndex("uq_wh_locations_org_code").on(table.organizationId, table.code),
]);

// Picking orders (orders to pick products from warehouse)
export const pickingOrders = pgTable("picking_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  pickingNumber: varchar("picking_number", { length: 50 }).notNull(),
  relatedOrderId: integer("related_order_id"),
  assignedTo: integer("assigned_to"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, assigned, in_progress, completed, cancelled
  priority: varchar("priority", { length: 10 }).notNull().default("normal"), // low, normal, high, urgent
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalItems: integer("total_items").default(0),
  pickedItems: integer("picked_items").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_picking_orders_org_id").on(table.organizationId),
  uniqueIndex("uq_picking_orders_org_num").on(table.organizationId, table.pickingNumber),
  index("idx_picking_orders_status").on(table.organizationId, table.status),
]);

// Picking order items
export const pickingItems = pgTable("picking_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  pickingOrderId: integer("picking_order_id").notNull().references(() => pickingOrders.id, { onDelete: 'cascade' }),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productSku: text("product_sku"),
  locationCode: varchar("location_code", { length: 30 }),
  requestedQuantity: integer("requested_quantity").notNull(),
  pickedQuantity: integer("picked_quantity").default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, picked, short, skipped
  pickedAt: timestamp("picked_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_picking_items_org_id").on(table.organizationId),
  index("idx_picking_items_order").on(table.pickingOrderId),
]);

// Packing orders
export const packingOrders = pgTable("packing_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  packingNumber: varchar("packing_number", { length: 50 }).notNull(),
  pickingOrderId: integer("picking_order_id").references(() => pickingOrders.id),
  assignedTo: integer("assigned_to"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, shipped
  packageType: varchar("package_type", { length: 20 }), // box, pallet, envelope, custom
  weight: decimal("weight", { precision: 8, scale: 2 }),
  dimensions: varchar("dimensions", { length: 50 }), // LxWxH cm
  trackingNumber: varchar("tracking_number", { length: 100 }),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_packing_orders_org_id").on(table.organizationId),
]);

// Receiving orders (goods receipt)
export const receivingOrders = pgTable("receiving_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  receivingNumber: varchar("receiving_number", { length: 50 }).notNull(),
  purchaseOrderId: integer("purchase_order_id"),
  supplierName: text("supplier_name"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, partial
  expectedDate: timestamp("expected_date"),
  receivedDate: timestamp("received_date"),
  assignedTo: integer("assigned_to"),
  dockNumber: varchar("dock_number", { length: 10 }),
  totalExpected: integer("total_expected").default(0),
  totalReceived: integer("total_received").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_receiving_orders_org_id").on(table.organizationId),
  index("idx_receiving_orders_status").on(table.organizationId, table.status),
]);

// Receiving order items
export const receivingItems = pgTable("receiving_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  receivingOrderId: integer("receiving_order_id").notNull().references(() => receivingOrders.id, { onDelete: 'cascade' }),
  productId: integer("product_id"),
  productName: text("product_name").notNull(),
  productSku: text("product_sku"),
  expectedQuantity: integer("expected_quantity").notNull(),
  receivedQuantity: integer("received_quantity").default(0),
  damagedQuantity: integer("damaged_quantity").default(0),
  locationCode: varchar("location_code", { length: 30 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, received, partial, rejected
  notes: text("notes"),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_receiving_items_org_id").on(table.organizationId),
]);

// ==================== INSERT SCHEMAS ====================
export const insertWarehouseLocationSchema = createInsertSchema(warehouseLocations).omit({ id: true, createdAt: true });
export const insertPickingOrderSchema = createInsertSchema(pickingOrders).omit({ id: true, createdAt: true });
export const insertPickingItemSchema = createInsertSchema(pickingItems).omit({ id: true, createdAt: true });
export const insertPackingOrderSchema = createInsertSchema(packingOrders).omit({ id: true, createdAt: true });
export const insertReceivingOrderSchema = createInsertSchema(receivingOrders).omit({ id: true, createdAt: true });
export const insertReceivingItemSchema = createInsertSchema(receivingItems).omit({ id: true, createdAt: true });

// ==================== TYPES ====================
export type WarehouseLocation = typeof warehouseLocations.$inferSelect;
export type PickingOrder = typeof pickingOrders.$inferSelect;
export type PickingItem = typeof pickingItems.$inferSelect;
export type PackingOrder = typeof packingOrders.$inferSelect;
export type ReceivingOrder = typeof receivingOrders.$inferSelect;
export type ReceivingItem = typeof receivingItems.$inferSelect;
