import "dotenv/config";
import { db } from "./db";
import {
  warehouseZones,
  suppliers,
  products,
  customers,
  customerOrders,
  orderItems,
  stockMovements,
  shippingAgencies,
  orderShipping,
  shippingEvents,
  procurementPlans,
  sales,
  saleItems,
  salesAnalytics,
} from "@shared/schema";
import { eq } from "drizzle-orm";

const ORG_ID = 1;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function money(value: number): string {
  return value.toFixed(2);
}

async function cleanDemoData() {
  console.log("🧹 Limpiando datos demo anteriores...");

  await db.delete(shippingEvents).where(eq(shippingEvents.organizationId, ORG_ID));
  await db.delete(orderShipping).where(eq(orderShipping.organizationId, ORG_ID));
  await db.delete(saleItems).where(eq(saleItems.organizationId, ORG_ID));
  await db.delete(sales).where(eq(sales.organizationId, ORG_ID));
  await db.delete(stockMovements).where(eq(stockMovements.organizationId, ORG_ID));
  await db.delete(orderItems).where(eq(orderItems.organizationId, ORG_ID));
  await db.delete(customerOrders).where(eq(customerOrders.organizationId, ORG_ID));
  await db.delete(procurementPlans).where(eq(procurementPlans.organizationId, ORG_ID));
  await db.delete(salesAnalytics).where(eq(salesAnalytics.organizationId, ORG_ID));
  await db.delete(products).where(eq(products.organizationId, ORG_ID));
  await db.delete(suppliers).where(eq(suppliers.organizationId, ORG_ID));
  await db.delete(customers).where(eq(customers.organizationId, ORG_ID));
  await db.delete(shippingAgencies).where(eq(shippingAgencies.organizationId, ORG_ID));
  await db.delete(warehouseZones).where(eq(warehouseZones.organizationId, ORG_ID));

  console.log("✅ Datos demo limpiados");
}

async function seedDemo() {
  console.log("🌱 Creando demo logística completa...");

  await cleanDemoData();

  const createdZones = await db.insert(warehouseZones).values([
    { organizationId: ORG_ID, code: "A01", name: "Zona A - Picking", description: "Preparación de pedidos", capacity: 1200, currentOccupancy: 0 },
    { organizationId: ORG_ID, code: "B01", name: "Zona B - Stock General", description: "Stock de alta rotación", capacity: 2000, currentOccupancy: 0 },
    { organizationId: ORG_ID, code: "C01", name: "Zona C - Expedición", description: "Salidas y consolidación", capacity: 800, currentOccupancy: 0 },
    { organizationId: ORG_ID, code: "D01", name: "Zona D - Reserva", description: "Stock de seguridad", capacity: 2500, currentOccupancy: 0 },
    { organizationId: ORG_ID, code: "E01", name: "Zona E - Devoluciones", description: "Revisión de devoluciones", capacity: 500, currentOccupancy: 0 },
  ]).returning();

  const createdSuppliers = await db.insert(suppliers).values([
    { organizationId: ORG_ID, name: "IberSupply Logistics", contactEmail: "compras@ibersupply.es", contactPhone: "+34 910 111 222", address: "Madrid", leadTimeDays: 5, reliability: "96.50" },
    { organizationId: ORG_ID, name: "EuroWarehouse Parts", contactEmail: "sales@eurowarehouse.eu", contactPhone: "+34 932 555 555", address: "Barcelona", leadTimeDays: 8, reliability: "93.00" },
    { organizationId: ORG_ID, name: "FastImport Components", contactEmail: "orders@fastimport.com", contactPhone: "+34 960 333 444", address: "Valencia", leadTimeDays: 12, reliability: "89.50" },
    { organizationId: ORG_ID, name: "Packline Iberia", contactEmail: "ventas@packline.es", contactPhone: "+34 914 555 100", address: "Getafe", leadTimeDays: 4, reliability: "97.20" },
    { organizationId: ORG_ID, name: "TraceTech Solutions", contactEmail: "supply@tracetech.eu", contactPhone: "+34 935 555 888", address: "Zaragoza", leadTimeDays: 10, reliability: "91.40" },
    { organizationId: ORG_ID, name: "LogiMaterial Europe", contactEmail: "orders@logimaterial.eu", contactPhone: "+34 955 555 777", address: "Sevilla", leadTimeDays: 7, reliability: "94.10" },
  ]).returning();

  const categories = [
    "Embalaje",
    "Etiquetado",
    "Pallets",
    "Picking",
    "Seguridad",
    "Tecnología",
    "Almacenaje",
    "Expedición",
    "Consumibles",
    "Mantenimiento",
  ];

  const productNames = [
    "Caja logística reforzada",
    "Film estirable industrial",
    "Pallet europeo EPAL",
    "Etiqueta térmica",
    "Precinto adhesivo reforzado",
    "Bolsa de expedición",
    "Cantonera protectora",
    "Separador de cartón",
    "Bobina de fleje",
    "Scanner código de barras",
    "Terminal PDA almacén",
    "Rollo papel térmico",
    "Guante anticorte",
    "Chaleco reflectante",
    "Contenedor apilable",
    "Bandeja picking",
    "Cinta señalización suelo",
    "Rack modular",
    "Caja isotérmica",
    "Sobre portadocumentos",
  ];

  const productRows = Array.from({ length: 220 }).map((_, index) => {
    const n = index + 1;
    const category = pick(categories);
    const supplier = pick(createdSuppliers);
    const zone = pick(createdZones);

    const minStock = Math.floor(Math.random() * 40) + 10;
    const maxStock = minStock + Math.floor(Math.random() * 300) + 100;

    let currentStock: number;

    if (n % 17 === 0) {
      currentStock = 0;
    } else if (n % 9 === 0) {
      currentStock = Math.floor(minStock / 2);
    } else {
      currentStock = Math.floor(Math.random() * (maxStock - minStock)) + minStock;
    }

    const unitPrice = Math.random() * 95 + 1.5;

    return {
      organizationId: ORG_ID,
      name: `${pick(productNames)} ${n}`,
      sku: `IMS-${String(n).padStart(4, "0")}`,
      description: `Producto demo de categoría ${category} para pruebas de inventario, movimientos y pedidos.`,
      category,
      currentStock,
      minStock,
      maxStock,
      unitPrice: money(unitPrice),
      warehouseZoneId: zone.id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      leadTimeDays: supplier.leadTimeDays,
      reorderPoint: minStock + 10,
      safetyStock: minStock,
      orderQuantity: Math.floor(Math.random() * 120) + 30,
      isDropshipping: false,
    };
  });

  const createdProducts = await db.insert(products).values(productRows).returning();

  console.log(`✅ ${createdProducts.length} productos creados`);

  const customerRows = Array.from({ length: 30 }).map((_, index) => ({
    organizationId: ORG_ID,
    name: `Cliente Logístico Demo ${index + 1}`,
    email: `cliente${index + 1}@demo-logistica.es`,
    phone: `+34 600 ${String(100000 + index).slice(0, 6)}`,
    address: pick(["Madrid", "Barcelona", "Valencia", "Bilbao", "Sevilla", "Zaragoza", "Málaga"]),
  }));

  const createdCustomers = await db.insert(customers).values(customerRows).returning();

  const agencies = await db.insert(shippingAgencies).values([
    { organizationId: ORG_ID, name: "SEUR", code: "SEUR", website: "https://www.seur.com", contactPhone: "+34 902 101 010", contactEmail: "soporte@seur.com", trackingUrlTemplate: "https://www.seur.com/seguimiento/{trackingNumber}", isActive: true, deliveryTimeMin: 1, deliveryTimeMax: 3 },
    { organizationId: ORG_ID, name: "DHL Express", code: "DHL", website: "https://www.dhl.com", contactPhone: "+34 902 122 424", contactEmail: "support@dhl.com", trackingUrlTemplate: "https://www.dhl.com/track/{trackingNumber}", isActive: true, deliveryTimeMin: 1, deliveryTimeMax: 5 },
    { organizationId: ORG_ID, name: "Correos Express", code: "CORREOS", website: "https://www.correosexpress.com", contactPhone: "+34 913 277 020", contactEmail: "info@correosexpress.com", trackingUrlTemplate: "https://www.correosexpress.com/seguimiento/{trackingNumber}", isActive: true, deliveryTimeMin: 2, deliveryTimeMax: 5 },
  ]).returning();

  const movementRows = createdProducts.flatMap((product) => [
    {
      organizationId: ORG_ID,
      productId: product.id,
      type: "entry",
      quantity: product.currentStock,
      toZoneId: product.warehouseZoneId,
      reason: "Stock inicial demo",
      notes: "Carga inicial generada por seed demo",
    },
  ]);

  await db.insert(stockMovements).values(movementRows);

  const ordersToCreate = Array.from({ length: 45 }).map((_, index) => {
    const customer = pick(createdCustomers);
    const status = pick(["pending", "preparing", "shipped", "delivered"] as const);

    return {
      organizationId: ORG_ID,
      customerId: customer.id,
      orderNumber: `PED-2026-${String(index + 1).padStart(4, "0")}`,
      status,
      totalAmount: "0.00",
      notes: `Pedido demo ${status}`,
      shippedDate: status === "shipped" || status === "delivered" ? new Date() : undefined,
      deliveredDate: status === "delivered" ? new Date() : undefined,
    };
  });

  const createdOrders = await db.insert(customerOrders).values(ordersToCreate).returning();

  for (const order of createdOrders) {
    const lines = Math.floor(Math.random() * 4) + 1;
    let total = 0;

    for (let i = 0; i < lines; i++) {
      const product = pick(createdProducts);
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unit = Number(product.unitPrice || 0);
      const lineTotal = unit * quantity;
      total += lineTotal;

      await db.insert(orderItems).values({
        organizationId: ORG_ID,
        orderId: order.id,
        productId: product.id,
        quantity,
        unitPrice: money(unit),
        totalPrice: money(lineTotal),
        reservedStock: quantity,
      });

      await db.insert(stockMovements).values({
        organizationId: ORG_ID,
        productId: product.id,
        type: "exit",
        quantity,
        fromZoneId: product.warehouseZoneId,
        reason: "Pedido cliente",
        notes: `Salida vinculada a ${order.orderNumber}`,
        orderId: order.id,
      });
    }

    await db.update(customerOrders)
      .set({ totalAmount: money(total) })
      .where(eq(customerOrders.id, order.id));

    if (order.status === "shipped" || order.status === "delivered") {
      const agency = pick(agencies);
      const [shipping] = await db.insert(orderShipping).values({
        organizationId: ORG_ID,
        orderId: order.id,
        shippingAgencyId: agency.id,
        trackingNumber: `${agency.code}${Date.now()}${order.id}`,
        shippingCost: money(Math.random() * 12 + 4),
        estimatedWeight: money(Math.random() * 25 + 1),
        packageDimensions: "60x40x35 cm",
        shippingZone: "Península",
        recipientName: `Destinatario ${order.id}`,
        recipientPhone: "+34 600 999 999",
        recipientEmail: `destino${order.id}@demo.es`,
        shippingAddress: "Dirección demo",
        shippingCity: pick(["Madrid", "Barcelona", "Valencia", "Bilbao", "Sevilla"]),
        shippingPostalCode: "28001",
        shippingCountry: "España",
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        actualDeliveryDate: order.status === "delivered" ? new Date() : undefined,
        status: order.status === "delivered" ? "delivered" : "in_transit",
      }).returning();

      await db.insert(shippingEvents).values([
        {
          organizationId: ORG_ID,
          orderShippingId: shipping.id,
          eventType: "pickup",
          eventDescription: "Paquete recogido en almacén",
          eventLocation: "Madrid",
          eventDate: new Date(),
        },
        {
          organizationId: ORG_ID,
          orderShippingId: shipping.id,
          eventType: order.status === "delivered" ? "delivered" : "transit",
          eventDescription: order.status === "delivered" ? "Entregado al destinatario" : "En tránsito hacia destino",
          eventLocation: "Centro logístico",
          eventDate: new Date(),
        },
      ]);
    }
  }

  const lowStockProducts = createdProducts.filter((p) => p.currentStock <= p.minStock).slice(0, 30);

  await db.insert(procurementPlans).values(
    lowStockProducts.map((product, index) => ({
      organizationId: ORG_ID,
      productId: product.id,
      supplierId: product.supplierId,
      plannedOrderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + ((index % 12) + 3) * 24 * 60 * 60 * 1000),
      quantity: product.orderQuantity || 100,
      status: index % 3 === 0 ? "ordered" : "planned",
      notes: "Reposición generada automáticamente por stock bajo",
    }))
  );

  for (let i = 0; i < 25; i++) {
    const customer = pick(createdCustomers);
    const saleProducts = [pick(createdProducts), pick(createdProducts)];
    let total = 0;

    const [sale] = await db.insert(sales).values({
      organizationId: ORG_ID,
      total: "0.00",
      paymentMethod: pick(["cash", "card", "transfer"]),
      cashReceived: null,
      cashChange: null,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      hasDropshippingItems: false,
      notes: "Venta TPV demo",
    }).returning();

    for (const product of saleProducts) {
      const quantity = Math.floor(Math.random() * 3) + 1;
      const subtotal = Number(product.unitPrice || 0) * quantity;
      total += subtotal;

      await db.insert(saleItems).values({
        organizationId: ORG_ID,
        saleId: sale.id,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity,
        unitPrice: product.unitPrice || "0.00",
        subtotal: money(subtotal),
        fulfillmentType: "stock",
        supplierId: product.supplierId,
      });
    }

    await db.update(sales).set({ total: money(total) }).where(eq(sales.id, sale.id));
  }

  const analyticsRows = Array.from({ length: 90 }).map((_, index) => {
    const product = pick(createdProducts);
    const quantitySold = Math.floor(Math.random() * 25) + 1;
    const revenue = quantitySold * Number(product.unitPrice || 0);

    const date = new Date();
    date.setDate(date.getDate() - (index % 30));

    return {
      organizationId: ORG_ID,
      date,
      productId: product.id,
      categoryId: product.category,
      supplierId: product.supplierId,
      zoneId: product.warehouseZoneId,
      quantitySold,
      revenue: money(revenue),
      profit: money(revenue * 0.28),
      averageOrderValue: money(revenue / Math.max(1, Math.floor(Math.random() * 5) + 1)),
    };
  });

  await db.insert(salesAnalytics).values(analyticsRows);

  console.log("✅ Demo creada correctamente");
  console.log(`📦 Productos: ${createdProducts.length}`);
  console.log(`👥 Clientes: ${createdCustomers.length}`);
  console.log(`🧾 Pedidos: ${createdOrders.length}`);
  console.log(`🚚 Agencias: ${agencies.length}`);
  console.log(`📊 Analíticas: ${analyticsRows.length}`);
}

seedDemo()
  .then(() => {
    console.log("🎉 Seed demo logistics completado.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error ejecutando seed demo:", error);
    process.exit(1);
  });