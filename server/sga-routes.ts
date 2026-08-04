import type { Express } from "express";
import { sgaStorage } from "./sga-storage";
import { isAuthenticated } from "./replitAuth";

function getOrganizationId(req: any, res: any): number | null {
  const orgId = req.user?.organizationId;
  if (!orgId) { res.status(400).json({ message: "Organization ID not found" }); return null; }
  return orgId;
}

export function registerSgaRoutes(app: Express) {

  // Dashboard
  app.get("/api/sga/dashboard", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; res.json(await sgaStorage.getSgaDashboard(orgId)); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // Locations
  app.get("/api/sga/locations", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; res.json(await sgaStorage.getLocations(orgId)); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/sga/locations", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; res.status(201).json(await sgaStorage.createLocation(orgId, req.body)); }
    catch (e) { console.error(e); res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/sga/locations/:id", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; const r = await sgaStorage.updateLocation(orgId, parseInt(req.params.id), req.body); res.json(r); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // Picking Orders
  app.get("/api/sga/picking", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; res.json(await sgaStorage.getPickingOrders(orgId)); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.get("/api/sga/picking/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res); if (!orgId) return;
      const order = await sgaStorage.getPickingOrder(orgId, parseInt(req.params.id));
      if (!order) return res.status(404).json({ message: "Not found" });
      const items = await sgaStorage.getPickingItems(orgId, order.id);
      res.json({ ...order, items });
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/sga/picking", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res); if (!orgId) return;
      const { items, ...data } = req.body;
      const order = await sgaStorage.createPickingOrder(orgId, { ...data, totalItems: items?.length || 0 });
      if (items && Array.isArray(items)) {
        for (const item of items) await sgaStorage.createPickingItem(orgId, { ...item, pickingOrderId: order.id });
      }
      res.status(201).json(order);
    } catch (e) { console.error(e); res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/sga/picking/:id", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; const r = await sgaStorage.updatePickingOrder(orgId, parseInt(req.params.id), req.body); res.json(r); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/sga/picking-items/:id", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; const r = await sgaStorage.updatePickingItem(orgId, parseInt(req.params.id), req.body); res.json(r); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // Packing Orders
  app.get("/api/sga/packing", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; res.json(await sgaStorage.getPackingOrders(orgId)); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/sga/packing", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; res.status(201).json(await sgaStorage.createPackingOrder(orgId, req.body)); }
    catch (e) { console.error(e); res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/sga/packing/:id", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; const r = await sgaStorage.updatePackingOrder(orgId, parseInt(req.params.id), req.body); res.json(r); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // Receiving Orders
  app.get("/api/sga/receiving", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; res.json(await sgaStorage.getReceivingOrders(orgId)); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/sga/receiving", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res); if (!orgId) return;
      const { items, ...data } = req.body;
      const order = await sgaStorage.createReceivingOrder(orgId, { ...data, totalExpected: items?.length || data.totalExpected || 0 });
      if (items && Array.isArray(items)) {
        for (const item of items) await sgaStorage.createReceivingItem(orgId, { ...item, receivingOrderId: order.id });
      }
      res.status(201).json(order);
    } catch (e) { console.error(e); res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/sga/receiving/:id", isAuthenticated, async (req, res) => {
    try { const orgId = getOrganizationId(req, res); if (!orgId) return; const r = await sgaStorage.updateReceivingOrder(orgId, parseInt(req.params.id), req.body); res.json(r); }
    catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // Seed SGA data
  app.post("/api/sga/seed", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res); if (!orgId) return;
      const existing = await sgaStorage.getLocations(orgId);
      if (existing.length > 0) return res.json({ success: true, message: "SGA data already seeded" });

      // Create locations
      const zones = ["A", "B", "C", "D"];
      const types = ["shelf", "shelf", "shelf", "floor", "dock"];
      for (const zone of zones) {
        for (let rack = 1; rack <= 4; rack++) {
          for (let level = 1; level <= 3; level++) {
            await sgaStorage.createLocation(orgId, {
              code: `${zone}-${String(rack).padStart(2, "0")}-${String(level).padStart(2, "0")}`,
              name: `Zona ${zone} Estanteria ${rack} Nivel ${level}`,
              type: types[Math.floor(Math.random() * types.length)],
              aisle: zone, rack: String(rack), level: String(level),
              maxWeight: String(500 + Math.random() * 1500),
              isActive: true,
            });
          }
        }
      }
      // Dock locations
      for (let d = 1; d <= 4; d++) {
        await sgaStorage.createLocation(orgId, {
          code: `DOCK-${String(d).padStart(2, "0")}`,
          name: `Muelle de carga ${d}`,
          type: "dock", aisle: "DOCK", isActive: true,
        });
      }
      // Staging areas
      for (let s = 1; s <= 2; s++) {
        await sgaStorage.createLocation(orgId, {
          code: `STAGING-${String(s).padStart(2, "0")}`,
          name: `Area de preparacion ${s}`,
          type: "staging", aisle: "STAGING", isActive: true,
        });
      }

      // Sample picking orders
      const picks = [
        { priority: "urgent", status: "in_progress", totalItems: 5, pickedItems: 3, startedAt: new Date(), notes: "Pedido urgente - cliente prioritario" },
        { priority: "high", status: "pending", totalItems: 8, pickedItems: 0, notes: "Preparar antes de las 14:00" },
        { priority: "normal", status: "pending", totalItems: 3, pickedItems: 0 },
        { priority: "normal", status: "completed", totalItems: 6, pickedItems: 6, startedAt: new Date(Date.now() - 3600000), completedAt: new Date() },
        { priority: "low", status: "assigned", totalItems: 2, pickedItems: 0 },
      ];
      for (const p of picks) await sgaStorage.createPickingOrder(orgId, p);

      // Sample packing orders
      const packs = [
        { status: "pending", packageType: "box", notes: "Embalar con burbuja" },
        { status: "in_progress", packageType: "pallet", weight: "45.5", dimensions: "120x80x150" },
        { status: "completed", packageType: "box", weight: "12.3", dimensions: "40x30x25", trackingNumber: "SEUR-2026-123456", completedAt: new Date() },
      ];
      for (const p of packs) await sgaStorage.createPackingOrder(orgId, p);

      // Sample receiving orders
      const recs = [
        { supplierName: "Materiales Industriales S.A.", status: "pending", expectedDate: new Date(Date.now() + 86400000), totalExpected: 12, dockNumber: "DOCK-01" },
        { supplierName: "Embalajes y Packaging S.L.", status: "in_progress", expectedDate: new Date(), totalExpected: 8, totalReceived: 5, dockNumber: "DOCK-02" },
        { supplierName: "Suministros Generales S.L.", status: "completed", receivedDate: new Date(Date.now() - 86400000), totalExpected: 20, totalReceived: 20, dockNumber: "DOCK-03" },
      ];
      for (const r of recs) await sgaStorage.createReceivingOrder(orgId, r);

      res.json({ success: true, message: "SGA demo data seeded" });
    } catch (error) {
      console.error("SGA seed error:", error);
      res.status(500).json({ message: "Error seeding SGA data" });
    }
  });

  console.log("SGA routes registered successfully");
}
