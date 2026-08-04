import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  warehouseLocations, pickingOrders, pickingItems,
  packingOrders, receivingOrders, receivingItems,
} from "@shared/sga-schema";

export class SgaStorage {
  // Locations
  async getLocations(orgId: number) {
    return db.select().from(warehouseLocations).where(eq(warehouseLocations.organizationId, orgId)).orderBy(warehouseLocations.code);
  }
  async createLocation(orgId: number, data: any) {
    const [r] = await db.insert(warehouseLocations).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateLocation(orgId: number, id: number, data: any) {
    const [r] = await db.update(warehouseLocations).set(data).where(and(eq(warehouseLocations.organizationId, orgId), eq(warehouseLocations.id, id))).returning();
    return r;
  }

  // Picking Orders
  async getPickingOrders(orgId: number) {
    return db.select().from(pickingOrders).where(eq(pickingOrders.organizationId, orgId)).orderBy(desc(pickingOrders.createdAt));
  }
  async getPickingOrder(orgId: number, id: number) {
    const [r] = await db.select().from(pickingOrders).where(and(eq(pickingOrders.organizationId, orgId), eq(pickingOrders.id, id)));
    return r;
  }
  async getNextPickingNumber(orgId: number) {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(pickingOrders).where(eq(pickingOrders.organizationId, orgId));
    return `PICK-${new Date().getFullYear()}-${String((r?.count || 0) + 1).padStart(5, '0')}`;
  }
  async createPickingOrder(orgId: number, data: any) {
    const pickingNumber = data.pickingNumber || await this.getNextPickingNumber(orgId);
    const [r] = await db.insert(pickingOrders).values({ ...data, organizationId: orgId, pickingNumber }).returning();
    return r;
  }
  async updatePickingOrder(orgId: number, id: number, data: any) {
    const [r] = await db.update(pickingOrders).set(data).where(and(eq(pickingOrders.organizationId, orgId), eq(pickingOrders.id, id))).returning();
    return r;
  }
  async getPickingItems(orgId: number, orderId: number) {
    return db.select().from(pickingItems).where(and(eq(pickingItems.organizationId, orgId), eq(pickingItems.pickingOrderId, orderId)));
  }
  async createPickingItem(orgId: number, data: any) {
    const [r] = await db.insert(pickingItems).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updatePickingItem(orgId: number, id: number, data: any) {
    const [r] = await db.update(pickingItems).set(data).where(and(eq(pickingItems.organizationId, orgId), eq(pickingItems.id, id))).returning();
    return r;
  }

  // Packing Orders
  async getPackingOrders(orgId: number) {
    return db.select().from(packingOrders).where(eq(packingOrders.organizationId, orgId)).orderBy(desc(packingOrders.createdAt));
  }
  async createPackingOrder(orgId: number, data: any) {
    const num = `PACK-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const [r] = await db.insert(packingOrders).values({ ...data, organizationId: orgId, packingNumber: data.packingNumber || num }).returning();
    return r;
  }
  async updatePackingOrder(orgId: number, id: number, data: any) {
    const [r] = await db.update(packingOrders).set(data).where(and(eq(packingOrders.organizationId, orgId), eq(packingOrders.id, id))).returning();
    return r;
  }

  // Receiving Orders
  async getReceivingOrders(orgId: number) {
    return db.select().from(receivingOrders).where(eq(receivingOrders.organizationId, orgId)).orderBy(desc(receivingOrders.createdAt));
  }
  async getNextReceivingNumber(orgId: number) {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(receivingOrders).where(eq(receivingOrders.organizationId, orgId));
    return `REC-${new Date().getFullYear()}-${String((r?.count || 0) + 1).padStart(5, '0')}`;
  }
  async createReceivingOrder(orgId: number, data: any) {
    const receivingNumber = data.receivingNumber || await this.getNextReceivingNumber(orgId);
    const [r] = await db.insert(receivingOrders).values({ ...data, organizationId: orgId, receivingNumber }).returning();
    return r;
  }
  async updateReceivingOrder(orgId: number, id: number, data: any) {
    const [r] = await db.update(receivingOrders).set(data).where(and(eq(receivingOrders.organizationId, orgId), eq(receivingOrders.id, id))).returning();
    return r;
  }
  async getReceivingItems(orgId: number, orderId: number) {
    return db.select().from(receivingItems).where(and(eq(receivingItems.organizationId, orgId), eq(receivingItems.receivingOrderId, orderId)));
  }
  async createReceivingItem(orgId: number, data: any) {
    const [r] = await db.insert(receivingItems).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateReceivingItem(orgId: number, id: number, data: any) {
    const [r] = await db.update(receivingItems).set(data).where(and(eq(receivingItems.organizationId, orgId), eq(receivingItems.id, id))).returning();
    return r;
  }

  // Dashboard stats
  async getSgaDashboard(orgId: number) {
    const [loc] = await db.select({ count: sql<number>`count(*)` }).from(warehouseLocations).where(eq(warehouseLocations.organizationId, orgId));
    const [pickPending] = await db.select({ count: sql<number>`count(*)` }).from(pickingOrders).where(and(eq(pickingOrders.organizationId, orgId), eq(pickingOrders.status, "pending")));
    const [pickProgress] = await db.select({ count: sql<number>`count(*)` }).from(pickingOrders).where(and(eq(pickingOrders.organizationId, orgId), eq(pickingOrders.status, "in_progress")));
    const [packPending] = await db.select({ count: sql<number>`count(*)` }).from(packingOrders).where(and(eq(packingOrders.organizationId, orgId), eq(packingOrders.status, "pending")));
    const [recPending] = await db.select({ count: sql<number>`count(*)` }).from(receivingOrders).where(and(eq(receivingOrders.organizationId, orgId), eq(receivingOrders.status, "pending")));
    return {
      locations: loc?.count || 0,
      pickingPending: pickPending?.count || 0,
      pickingInProgress: pickProgress?.count || 0,
      packingPending: packPending?.count || 0,
      receivingPending: recPending?.count || 0,
    };
  }
}

export const sgaStorage = new SgaStorage();
