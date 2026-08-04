import "dotenv/config";
import { db } from "./db";
import {
  organizations,
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

async function seed() {
  console.log("🌱 Iniciando seed de datos de prueba...");

  const orgId = 1;

  // 1. Organización base
  await db
    .insert(organizations)
    .values({
      id: orgId,
      name: "IMS Services Demo",
      slug: "ims-services-demo",
      industry: "logistics",
      country: "España",
      timezone: "Europe/Madrid",
      currency: "EUR",
      language: "es",
      plan: "professional",
      isActive: true,
      warehouseAddress: "Calle Logística 24, Madrid",
    })
    .onConflictDoNothing();

  // 2. Zonas de almacén
  const insertedZones = await db
    .insert(warehouseZones)
    .values([
      {
        organizationId: orgId,
        code: "A01",
        name: "Zona A - Picking",
        description: "Zona principal de preparación de pedidos",
        capacity: 500,
        currentOccupancy: 180,
      },
      {
        organizationId: orgId,
        code: "B01",
        name: "Zona B - Stock",
        description: "Almacenamiento de stock general",
        capacity: 800,
        currentOccupancy: 420,
      },
      {
        organizationId: orgId,
        code: "C01",
        name: "Zona C - Expedición",
        description: "Zona de salidas y expediciones",
        capacity: 300,
        currentOccupancy: 90,
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log("✅ Zonas creadas");

  // 3. Proveedores
  const insertedSuppliers = await db
    .insert(suppliers)
    .values([
      {
        organizationId: orgId,
        name: "IberSupply Logistics",
        contactEmail: "compras@ibersupply.es",
        contactPhone: "+34 910 111 222",
        address: "Madrid, España",
        leadTimeDays: 5,
        reliability: "96.50",
      },
      {
        organizationId: orgId,
        name: "EuroWarehouse Parts",
        contactEmail: "sales@eurowarehouse.eu",
        contactPhone: "+34 932 555 555",
        address: "Barcelona, España",
        leadTimeDays: 8,
        reliability: "93.00",
      },
      {
        organizationId: orgId,
        name: "FastImport Components",
        contactEmail: "orders@fastimport.com",
        contactPhone: "+34 960 333 444",
        address: "Valencia, España",
        leadTimeDays: 12,
        reliability: "89.50",
      },
    ])
    .returning();

  console.log("✅ Proveedores creados");

  const zoneA = insertedZones[0];
  const zoneB = insertedZones[1];
  const zoneC = insertedZones[2];

  const supplier1 = insertedSuppliers[0];
  const supplier2 = insertedSuppliers[1];
  const supplier3 = insertedSuppliers[2];

  // 4. Productos
  const insertedProducts = await db
    .insert(products)
    .values([
      {
        organizationId: orgId,
        name: "Caja logística reforzada 60L",
        sku: "IMS-BOX-60",
        description: "Caja industrial para almacenamiento y transporte",
        category: "Embalaje",
        currentStock: 120,
        minStock: 30,
        maxStock: 300,
        unitPrice: "18.90",
        warehouseZoneId: zoneA?.id,
        supplierId: supplier1.id,
        supplierName: supplier1.name,
        leadTimeDays: 5,
        reorderPoint: 40,
        safetyStock: 25,
        orderQuantity: 100,
      },
      {
        organizationId: orgId,
        name: "Film estirable industrial",
        sku: "IMS-FILM-01",
        description: "Bobina de film para paletizado",
        category: "Embalaje",
        currentStock: 18,
        minStock: 25,
        maxStock: 150,
        unitPrice: "9.50",
        warehouseZoneId: zoneA?.id,
        supplierId: supplier2.id,
        supplierName: supplier2.name,
        leadTimeDays: 8,
        reorderPoint: 30,
        safetyStock: 20,
        orderQuantity: 80,
      },
      {
        organizationId: orgId,
        name: "Pallet europeo EPAL",
        sku: "IMS-PALLET-EU",
        description: "Pallet homologado europeo",
        category: "Pallets",
        currentStock: 75,
        minStock: 20,
        maxStock: 200,
        unitPrice: "14.25",
        warehouseZoneId: zoneB?.id,
        supplierId: supplier1.id,
        supplierName: supplier1.name,
        leadTimeDays: 5,
        reorderPoint: 35,
        safetyStock: 20,
        orderQuantity: 60,
      },
      {
        organizationId: orgId,
        name: "Etiqueta térmica 100x150",
        sku: "IMS-LABEL-100150",
        description: "Etiquetas para expedición y trazabilidad",
        category: "Etiquetado",
        currentStock: 8,
        minStock: 50,
        maxStock: 500,
        unitPrice: "0.08",
        warehouseZoneId: zoneC?.id,
        supplierId: supplier3.id,
        supplierName: supplier3.name,
        leadTimeDays: 12,
        reorderPoint: 70,
        safetyStock: 50,
        orderQuantity: 300,
      },
      {
        organizationId: orgId,
        name: "Precinto adhesivo reforzado",
        sku: "IMS-TAPE-01",
        description: "Cinta adhesiva para cierre de cajas",
        category: "Embalaje",
        currentStock: 210,
        minStock: 40,
        maxStock: 400,
        unitPrice: "2.80",
        warehouseZoneId: zoneA?.id,
        supplierId: supplier2.id,
        supplierName: supplier2.name,
        leadTimeDays: 8,
        reorderPoint: 60,
        safetyStock: 35,
        orderQuantity: 120,
      },
    ])
    .returning();

  console.log("✅ Productos creados");

  // 5. Clientes
  const insertedCustomers = await db
    .insert(customers)
    .values([
      {
        organizationId: orgId,
        name: "Distribuciones Norte SL",
        email: "compras@distnorte.es",
        phone: "+34 944 111 222",
        address: "Bilbao, España",
      },
      {
        organizationId: orgId,
        name: "Retail Madrid Centro",
        email: "pedidos@retailmadrid.es",
        phone: "+34 911 222 333",
        address: "Madrid, España",
      },
      {
        organizationId: orgId,
        name: "Logística Levante",
        email: "operaciones@logisticalevante.es",
        phone: "+34 963 333 444",
        address: "Valencia, España",
      },
    ])
    .returning();

  console.log("✅ Clientes creados");

  const customer1 = insertedCustomers[0];
  const customer2 = insertedCustomers[1];

  const p1 = insertedProducts[0];
  const p2 = insertedProducts[1];
  const p3 = insertedProducts[2];
  const p4 = insertedProducts[3];
  const p5 = insertedProducts[4];

  // 6. Movimientos de entrada
  await db.insert(stockMovements).values([
    {
      organizationId: orgId,
      productId: p1.id,
      type: "entry",
      quantity: 120,
      toZoneId: zoneA?.id,
      reason: "Stock inicial",
      notes: "Entrada inicial de prueba",
    },
    {
      organizationId: orgId,
      productId: p2.id,
      type: "entry",
      quantity: 18,
      toZoneId: zoneA?.id,
      reason: "Stock inicial bajo",
      notes: "Producto bajo mínimo para probar alertas",
    },
    {
      organizationId: orgId,
      productId: p3.id,
      type: "entry",
      quantity: 75,
      toZoneId: zoneB?.id,
      reason: "Stock inicial",
    },
    {
      organizationId: orgId,
      productId: p4.id,
      type: "entry",
      quantity: 8,
      toZoneId: zoneC?.id,
      reason: "Stock crítico",
      notes: "Producto crítico para probar reaprovisionamiento",
    },
    {
      organizationId: orgId,
      productId: p5.id,
      type: "entry",
      quantity: 210,
      toZoneId: zoneA?.id,
      reason: "Stock inicial",
    },
  ]);

  console.log("✅ Movimientos de entrada creados");

  // 7. Pedidos
  const insertedOrders = await db
    .insert(customerOrders)
    .values([
      {
        organizationId: orgId,
        customerId: customer1.id,
        orderNumber: "PED-2026-0001",
        status: "preparing",
        totalAmount: "243.00",
        notes: "Pedido en preparación",
      },
      {
        organizationId: orgId,
        customerId: customer2.id,
        orderNumber: "PED-2026-0002",
        status: "shipped",
        totalAmount: "178.75",
        notes: "Pedido enviado con seguimiento",
        shippedDate: new Date(),
      },
    ])
    .returning();

  const order1 = insertedOrders[0];
  const order2 = insertedOrders[1];

  await db.insert(orderItems).values([
    {
      organizationId: orgId,
      orderId: order1.id,
      productId: p1.id,
      quantity: 6,
      unitPrice: "18.90",
      totalPrice: "113.40",
      reservedStock: 6,
    },
    {
      organizationId: orgId,
      orderId: order1.id,
      productId: p5.id,
      quantity: 20,
      unitPrice: "2.80",
      totalPrice: "56.00",
      reservedStock: 20,
    },
    {
      organizationId: orgId,
      orderId: order2.id,
      productId: p3.id,
      quantity: 5,
      unitPrice: "14.25",
      totalPrice: "71.25",
      reservedStock: 5,
    },
    {
      organizationId: orgId,
      orderId: order2.id,
      productId: p2.id,
      quantity: 10,
      unitPrice: "9.50",
      totalPrice: "95.00",
      reservedStock: 10,
    },
  ]);

  console.log("✅ Pedidos e items creados");

  // 8. Movimientos de salida vinculados a pedidos
  await db.insert(stockMovements).values([
    {
      organizationId: orgId,
      productId: p1.id,
      type: "exit",
      quantity: 6,
      fromZoneId: zoneA?.id,
      reason: "Pedido cliente",
      notes: "Salida vinculada a PED-2026-0001",
      orderId: order1.id,
    },
    {
      organizationId: orgId,
      productId: p5.id,
      type: "exit",
      quantity: 20,
      fromZoneId: zoneA?.id,
      reason: "Pedido cliente",
      notes: "Salida vinculada a PED-2026-0001",
      orderId: order1.id,
    },
    {
      organizationId: orgId,
      productId: p3.id,
      type: "exit",
      quantity: 5,
      fromZoneId: zoneB?.id,
      reason: "Pedido enviado",
      notes: "Salida vinculada a PED-2026-0002",
      orderId: order2.id,
    },
  ]);

  console.log("✅ Movimientos de salida creados");

  // 9. Transporte
  const insertedAgencies = await db
    .insert(shippingAgencies)
    .values([
      {
        organizationId: orgId,
        name: "SEUR",
        code: "SEUR",
        website: "https://www.seur.com",
        contactPhone: "+34 902 101 010",
        contactEmail: "soporte@seur.com",
        trackingUrlTemplate: "https://www.seur.com/seguimiento/{trackingNumber}",
        isActive: true,
        deliveryTimeMin: 1,
        deliveryTimeMax: 3,
      },
      {
        organizationId: orgId,
        name: "DHL Express",
        code: "DHL",
        website: "https://www.dhl.com",
        contactPhone: "+34 902 122 424",
        contactEmail: "support@dhl.com",
        trackingUrlTemplate: "https://www.dhl.com/track/{trackingNumber}",
        isActive: true,
        deliveryTimeMin: 1,
        deliveryTimeMax: 5,
      },
    ])
    .onConflictDoNothing()
    .returning();

  const agency = insertedAgencies[0];

  if (agency) {
    const insertedShipping = await db
      .insert(orderShipping)
      .values({
        organizationId: orgId,
        orderId: order2.id,
        shippingAgencyId: agency.id,
        trackingNumber: "SEUR202605110001",
        shippingCost: "7.90",
        estimatedWeight: "12.50",
        packageDimensions: "60x40x35 cm",
        shippingZone: "Península",
        recipientName: customer2.name,
        recipientPhone: customer2.phone,
        recipientEmail: customer2.email,
        shippingAddress: customer2.address || "Madrid, España",
        shippingCity: "Madrid",
        shippingPostalCode: "28001",
        shippingCountry: "España",
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "in_transit",
      })
      .returning();

    await db.insert(shippingEvents).values([
      {
        organizationId: orgId,
        orderShippingId: insertedShipping[0].id,
        eventType: "pickup",
        eventDescription: "Paquete recogido en almacén",
        eventLocation: "Madrid",
        eventDate: new Date(),
      },
      {
        organizationId: orgId,
        orderShippingId: insertedShipping[0].id,
        eventType: "transit",
        eventDescription: "En tránsito hacia destino",
        eventLocation: "Centro logístico SEUR",
        eventDate: new Date(),
      },
    ]);
  }

  console.log("✅ Envíos y tracking creados");

  // 10. Planes de aprovisionamiento
  await db.insert(procurementPlans).values([
    {
      organizationId: orgId,
      productId: p2.id,
      supplierId: supplier2.id,
      plannedOrderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      quantity: 80,
      status: "planned",
      notes: "Reposición por stock bajo",
    },
    {
      organizationId: orgId,
      productId: p4.id,
      supplierId: supplier3.id,
      plannedOrderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      quantity: 300,
      status: "ordered",
      notes: "Reposición urgente por stock crítico",
    },
  ]);

  console.log("✅ Aprovisionamiento creado");

  // 11. Ventas TPV
  const insertedSale = await db
    .insert(sales)
    .values({
      organizationId: orgId,
      total: "49.70",
      paymentMethod: "card",
      customerName: "Cliente Mostrador",
      customerEmail: "cliente.demo@email.com",
      customerPhone: "+34 600 111 222",
      hasDropshippingItems: false,
      notes: "Venta mostrador demo",
    })
    .returning();

  await db.insert(saleItems).values([
    {
      organizationId: orgId,
      saleId: insertedSale[0].id,
      productId: p5.id,
      productName: p5.name,
      productSku: p5.sku,
      quantity: 5,
      unitPrice: "2.80",
      subtotal: "14.00",
      fulfillmentType: "stock",
    },
    {
      organizationId: orgId,
      saleId: insertedSale[0].id,
      productId: p1.id,
      productName: p1.name,
      productSku: p1.sku,
      quantity: 2,
      unitPrice: "18.90",
      subtotal: "37.80",
      fulfillmentType: "stock",
    },
  ]);

  console.log("✅ Venta TPV creada");

  // 12. Analítica ventas
  await db.insert(salesAnalytics).values([
    {
      organizationId: orgId,
      date: new Date(),
      productId: p1.id,
      categoryId: p1.category,
      supplierId: supplier1.id,
      zoneId: zoneA?.id,
      quantitySold: 8,
      revenue: "151.20",
      profit: "48.00",
      averageOrderValue: "75.60",
    },
    {
      organizationId: orgId,
      date: new Date(),
      productId: p5.id,
      categoryId: p5.category,
      supplierId: supplier2.id,
      zoneId: zoneA?.id,
      quantitySold: 25,
      revenue: "70.00",
      profit: "30.00",
      averageOrderValue: "35.00",
    },
  ]);

  console.log("✅ Analítica creada");

  console.log("🎉 Seed completado correctamente.");
}

seed()
  .then(() => {
    console.log("✅ Datos de prueba insertados.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  });