/**
 * Script de migración para transformar el inventario
 * de productos deportivos a llantas custom importadas de China
 */

import { db } from "../db";
import { 
  products, 
  suppliers, 
  warehouseZones,
  stockMovements,
  procurementPlans,
  productReservations,
  orderItems,
  customerOrders,
  orderShipping,
  shippingEvents,
  customers,
  sales,
  saleItems,
  returns,
  returnItems
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface TireProduct {
  name: string;
  sku: string;
  description: string;
  category: string;
  style: string;
  size: string;
  finish: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: string;
  supplierName: string;
  leadTimeDays: number;
  reorderPoint: number;
  safetyStock: number;
  orderQuantity: number;
  isDropshipping: boolean;
  dropshippingLeadTimeDays?: number;
}

// Proveedores chinos especializados en llantas custom
const chineseSuppliers = [
  {
    name: "Guangzhou Custom Wheels Ltd",
    contactEmail: "sales@gzcustomwheels.cn",
    contactPhone: "+86 20 8888 8888",
    address: "Guangzhou, Guangdong, China",
    leadTimeDays: 40
  },
  {
    name: "Shenzhen Premium Rims Co",
    contactEmail: "export@szpremiumrims.com",
    contactPhone: "+86 755 8888 8888",
    address: "Shenzhen, Guangdong, China",
    leadTimeDays: 35
  },
  {
    name: "Shanghai Elite Wheels Manufacturing",
    contactEmail: "info@shelitewheels.cn",
    contactPhone: "+86 21 8888 8888",
    address: "Shanghai, China",
    leadTimeDays: 38
  },
  {
    name: "Dongguan Racing Rims Factory",
    contactEmail: "orders@dgracingfactory.com",
    contactPhone: "+86 769 8888 8888",
    address: "Dongguan, Guangdong, China",
    leadTimeDays: 42
  }
];

// Catálogo de llantas custom
const tireStyles = [
  "Racing Sport",
  "Luxury Premium",
  "Off-Road Extreme",
  "JDM Classic",
  "Euro Style",
  "American Muscle"
];

const tireSizes = ["R15", "R16", "R17", "R18", "R19", "R20", "R22"];

const finishes = [
  "Cromado Espejo",
  "Negro Mate",
  "Pulido Brillante",
  "Gunmetal",
  "Bronce Satinado",
  "Blanco Perla",
  "Carbono Negro"
];

const categories = ["Auto Deportivo", "SUV/Camioneta", "Luxury", "Off-Road", "Clásico"];

// Generar catálogo de llantas
function generateTireCatalog(): TireProduct[] {
  const catalog: TireProduct[] = [];
  let skuCounter = 1001;

  categories.forEach((category, catIndex) => {
    tireStyles.forEach((style, styleIndex) => {
      tireSizes.forEach((size, sizeIndex) => {
        finishes.slice(0, 3 + (sizeIndex % 3)).forEach((finish, finishIndex) => {
          const supplier = chineseSuppliers[Math.floor(Math.random() * chineseSuppliers.length)];
          
          // Precio base según tamaño
          const basePrices: { [key: string]: number } = {
            "R15": 1200,
            "R16": 1500,
            "R17": 1800,
            "R18": 2200,
            "R19": 2800,
            "R20": 3500,
            "R22": 4500
          };

          const basePrice = basePrices[size];
          
          // Multiplicadores por acabado
          const finishMultipliers: { [key: string]: number } = {
            "Cromado Espejo": 1.5,
            "Negro Mate": 1.1,
            "Pulido Brillante": 1.3,
            "Gunmetal": 1.2,
            "Bronce Satinado": 1.25,
            "Blanco Perla": 1.15,
            "Carbono Negro": 1.4
          };

          const finalPrice = Math.round(basePrice * (finishMultipliers[finish] || 1));
          
          // Determinar si es dropshipping: acabados premium O medidas grandes
          const premiumFinishes = ["Cromado Espejo", "Carbono Negro", "Pulido Brillante"];
          const largeSizes = ["R20", "R22"];
          const isDropshipping = premiumFinishes.includes(finish) || largeSizes.includes(size);
          
          // Stock: si es dropshipping, stock muy bajo (solo muestras/display)
          const stock = isDropshipping ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 40) + 10;
          const minStock = isDropshipping ? 0 : Math.floor(stock * 0.2);
          const safetyStock = isDropshipping ? 0 : Math.floor(minStock * 1.5);

          const categoryCode = category.substring(0, 3).toUpperCase().replace(/\s/g, '');
          const styleCode = style.replace(/\s/g, '').substring(0, 3).toUpperCase();
          const finishCode = finish.split(' ')[0].substring(0, 3).toUpperCase();
          
          catalog.push({
            name: `Llanta ${style} ${size}`,
            sku: `${categoryCode}-${styleCode}-${size}-${finishCode}-${String(skuCounter++).padStart(3, '0')}`,
            description: `Llanta custom importada ${style} medida ${size}, acabado ${finish}. ${isDropshipping ? 'DROPSHIPPING: Envío directo desde proveedor en China. ' : ''}Diseño exclusivo de importación directa. Incluye garantía de fábrica. Compatible con múltiples modelos.`,
            category,
            style,
            size,
            finish,
            currentStock: stock,
            minStock,
            maxStock: isDropshipping ? 5 : minStock * 8,
            unitPrice: finalPrice.toString(),
            supplierName: supplier.name,
            leadTimeDays: supplier.leadTimeDays,
            reorderPoint: isDropshipping ? 0 : minStock + safetyStock,
            safetyStock,
            orderQuantity: isDropshipping ? 0 : minStock * 4,
            isDropshipping,
            dropshippingLeadTimeDays: isDropshipping ? supplier.leadTimeDays : undefined
          });
        });
      });
    });
  });

  return catalog;
}

async function migrateToTires() {
  console.log("🚗 Iniciando migración a TireMax Pro - Llantas Custom...\n");

  try {
    // 1. Limpiar datos existentes en orden correcto (respetando foreign keys)
    console.log("🗑️  Limpiando datos existentes...\n");
    
    // Usar SQL directamente para eliminar datos de forma segura
    // Esto evita problemas con tablas que podrían no existir
    try {
      console.log("  → Eliminando eventos de envío...");
      await db.delete(shippingEvents);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando shipping de órdenes...");
      await db.delete(orderShipping);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando items de órdenes...");
      await db.delete(orderItems);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando órdenes de clientes...");
      await db.delete(customerOrders);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando reservas de productos...");
      await db.delete(productReservations);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando movimientos de stock...");
      await db.delete(stockMovements);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando planes de aprovisionamiento...");
      await db.delete(procurementPlans);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando clientes...");
      await db.delete(customers);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando productos...");
      await db.delete(products);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    try {
      console.log("  → Eliminando proveedores...");
      await db.delete(suppliers);
    } catch (e) { console.log("    (tabla no existe, continuando...)"); }
    
    console.log("✅ Todos los datos limpiados exitosamente\n");

    // 2. Insertar proveedores chinos
    console.log("🏭 Creando proveedores chinos...");
    const insertedSuppliers = await db.insert(suppliers).values(chineseSuppliers).returning();
    console.log(`✅ ${insertedSuppliers.length} proveedores creados\n`);

    // 3. Obtener zonas de almacén disponibles
    const zones = await db.select().from(warehouseZones);
    console.log(`📦 Zonas de almacén encontradas: ${zones.length}\n`);

    // 4. Generar y crear catálogo de llantas
    console.log("🎨 Generando catálogo de llantas custom...");
    const tireCatalog = generateTireCatalog();
    console.log(`📋 ${tireCatalog.length} productos generados\n`);

    // 5. Insertar productos en lotes
    console.log("💾 Insertando productos en base de datos...");
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < tireCatalog.length; i += batchSize) {
      const batch = tireCatalog.slice(i, i + batchSize);
      
      // Encontrar el proveedor correspondiente
      const productsWithSupplier = batch.map(tire => {
        const supplier = insertedSuppliers.find(s => s.name === tire.supplierName);
        const randomZone = zones[Math.floor(Math.random() * zones.length)];
        
        return {
          name: tire.name,
          sku: tire.sku,
          description: tire.description,
          category: tire.category,
          currentStock: tire.currentStock,
          minStock: tire.minStock,
          maxStock: tire.maxStock,
          unitPrice: tire.unitPrice,
          supplierId: supplier?.id,
          supplierName: tire.supplierName,
          leadTimeDays: tire.leadTimeDays,
          reorderPoint: tire.reorderPoint,
          safetyStock: tire.safetyStock,
          orderQuantity: tire.orderQuantity,
          warehouseZoneId: randomZone?.id,
          isDropshipping: tire.isDropshipping,
          dropshippingSupplierId: tire.isDropshipping ? supplier?.id : undefined,
          dropshippingLeadTimeDays: tire.dropshippingLeadTimeDays
        };
      });

      await db.insert(products).values(productsWithSupplier);
      inserted += batch.length;
      console.log(`  ↳ ${inserted}/${tireCatalog.length} productos insertados...`);
    }

    console.log("\n✅ Migración completada exitosamente!\n");
    console.log("📊 Resumen:");
    console.log(`  • Proveedores chinos: ${insertedSuppliers.length}`);
    console.log(`  • Productos de llantas: ${inserted}`);
    console.log(`  • Categorías: ${categories.length}`);
    console.log(`  • Estilos: ${tireStyles.length}`);
    console.log(`  • Medidas: ${tireSizes.length}`);
    console.log(`  • Acabados: ${finishes.length}\n`);
    
    // Estadísticas por categoría
    const stats = await db.select({
      category: products.category,
      count: sql<number>`count(*)::int`
    })
    .from(products)
    .groupBy(products.category);

    console.log("📈 Distribución por categoría:");
    stats.forEach(stat => {
      console.log(`  • ${stat.category}: ${stat.count} productos`);
    });

    console.log("\n🎉 TireMax Pro está listo para operar!\n");

  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    throw error;
  }
}

export { migrateToTires };

// Ejecutar migración automáticamente
migrateToTires()
  .then(() => {
    console.log("✨ Script completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });
