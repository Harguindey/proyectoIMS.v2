import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { createTestApp, registerOrg } from "./helpers/testApp";

let app: Express;
beforeAll(async () => {
  app = await createTestApp();
});

describe("TPV · una venta descuenta stock", () => {
  it("venta válida → 201 y baja el stock del producto", async () => {
    const { agent, organizationId, id } = await registerOrg(app);

    const sku = `SKU-POS-${id}`;
    const prod = await agent.post("/api/products").send({
      name: "Camiseta",
      sku,
      category: "general",
      currentStock: 10,
      unitPrice: "10.00",
    });
    expect(prod.status).toBe(201);
    const productId = prod.body.id;

    const sale = await agent.post("/api/sales").send({
      sale: {
        organizationId,
        total: "30.00",
        paymentMethod: "cash",
        cashReceived: "50.00",
      },
      items: [
        {
          organizationId,
          productId,
          productName: "Camiseta",
          productSku: sku,
          quantity: 3,
          unitPrice: "10.00",
          subtotal: "30.00",
        },
      ],
    });
    expect(sale.status).toBe(201);

    // El stock debe haber bajado de 10 a 7
    const after = await agent.get(`/api/products/${productId}`);
    expect(after.status).toBe(200);
    expect(after.body.currentStock).toBe(7);
  });

  it("venta con stock insuficiente → 409 y no descuenta", async () => {
    const { agent, organizationId, id } = await registerOrg(app);

    const sku = `SKU-POS-LOW-${id}`;
    const prod = await agent.post("/api/products").send({
      name: "Gorra",
      sku,
      category: "general",
      currentStock: 2,
      unitPrice: "5.00",
    });
    expect(prod.status).toBe(201);
    const productId = prod.body.id;

    const sale = await agent.post("/api/sales").send({
      sale: {
        organizationId,
        total: "5.00",
        paymentMethod: "cash",
        cashReceived: "10.00",
      },
      items: [
        {
          organizationId,
          productId,
          productName: "Gorra",
          productSku: sku,
          quantity: 999,
          unitPrice: "5.00",
          subtotal: "4995.00",
        },
      ],
    });
    expect(sale.status).toBe(409);

    // El stock no debe haber cambiado (transacción revertida)
    const after = await agent.get(`/api/products/${productId}`);
    expect(after.body.currentStock).toBe(2);
  });
});
