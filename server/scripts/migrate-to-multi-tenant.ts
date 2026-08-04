import { db } from "../db";
import { organizations, organizationUsers } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Migration script: Add multi-tenant support
 * 
 * This script:
 * 1. Creates a default organization "Demo Company"
 * 2. Backfills organizationId in all existing tables
 * 3. Links existing users to the default organization
 */

async function migrateToMultiTenant() {
  console.log("🚀 Starting multi-tenant migration...\n");

  try {
    // Step 1: Create default organization
    console.log("📦 Step 1: Creating default organization...");
    const [defaultOrg] = await db
      .insert(organizations)
      .values({
        name: "Demo Company",
        slug: "demo-company",
        industry: "retail",
        country: "ES",
        timezone: "Europe/Madrid",
        currency: "EUR",
        language: "es",
        plan: "professional",
        settings: {},
        warehouseAddress: "Calle Principal 123, 28001 Madrid, España",
        isActive: true,
      })
      .returning();
    
    console.log(`✅ Created organization: ${defaultOrg.name} (ID: ${defaultOrg.id})\n`);

    const orgId = defaultOrg.id;

    // Step 2: Backfill organizationId in all tables
    console.log("📝 Step 2: Backfilling organizationId in existing data...\n");

    const tables = [
      'warehouse_zones',
      'products',
      'suppliers',
      'procurement_plans',
      'stock_movements',
      'customers',
      'customer_addresses',
      'customer_orders',
      'order_items',
      'shipping_agencies',
      'shipping_rates',
      'order_shipping',
      'shipping_events',
      'product_reservations',
      'shipment_tracking',
      'returns',
      'return_items',
      'sales_analytics',
      'sales',
      'sale_items',
    ];

    for (const table of tables) {
      try {
        const result = await db.execute(
          sql.raw(`UPDATE ${table} SET organization_id = ${orgId} WHERE organization_id IS NULL`)
        );
        console.log(`  ✓ Updated ${table}`);
      } catch (error: any) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
      }
    }

    console.log("\n✅ Backfill completed\n");

    // Step 3: Link existing users to the default organization
    console.log("👥 Step 3: Linking existing users to default organization...");
    
    const users = await db.execute(sql`SELECT id FROM users`);
    
    if (users.rows && users.rows.length > 0) {
      for (const user of users.rows) {
        try {
          await db.insert(organizationUsers).values({
            userId: user.id as string,
            organizationId: orgId,
            role: "admin", // Make all existing users admins of the demo org
            isActive: true,
          });
          console.log(`  ✓ Linked user ${user.id} to organization`);
        } catch (error: any) {
          if (error.code === '23505') {
            console.log(`  ⚠️  User ${user.id} already linked`);
          } else {
            console.log(`  ⚠️  Error linking user ${user.id}: ${error.message}`);
          }
        }
      }
      console.log(`\n✅ Linked ${users.rows.length} user(s) to organization\n`);
    } else {
      console.log("  ℹ️  No users found to link\n");
    }

    console.log("🎉 Multi-tenant migration completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateToMultiTenant();
