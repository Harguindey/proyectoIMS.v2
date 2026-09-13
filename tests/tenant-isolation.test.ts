import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { createTestApp, registerOrg } from "./helpers/testApp";

let app: Express;
beforeAll(async () => {
  app = await createTestApp();
});

describe("Aislamiento multi-tenant", () => {
  it("una organización no ve ni accede a los productos de otra", async () => {
    const orgA = await registerOrg(app);
    const orgB = await registerOrg(app);

    // A crea un producto
    const created = await orgA.agent.post("/api/products").send({
      name: "Producto de A",
      sku: `SKU-A-${orgA.id}`,
      category: "general",
      currentStock: 5,
      unitPrice: "9.99",
    });
    expect(created.status).toBe(201);
    const productId = created.body.id;

    // B lista sus productos: NO debe aparecer el de A
    const listB = await orgB.agent.get("/api/products");
    expect(listB.status).toBe(200);
    expect(Array.isArray(listB.body)).toBe(true);
    expect(listB.body.some((p: any) => p.id === productId)).toBe(false);

    // B intenta acceder directamente por id al producto de A → no 200
    const directB = await orgB.agent.get(`/api/products/${productId}`);
    expect(directB.status).not.toBe(200);

    // B intenta modificar el producto de A → no 200
    const patchB = await orgB.agent
      .patch(`/api/products/${productId}`)
      .send({ name: "hackeado" });
    expect(patchB.status).not.toBe(200);

    // A sí ve su propio producto
    const listA = await orgA.agent.get("/api/products");
    expect(listA.body.some((p: any) => p.id === productId)).toBe(true);
  });
});
