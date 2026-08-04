-- Add organizationId columns to all tables

-- First, create organizations and organization_users tables if they don't exist
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  industry VARCHAR(100),
  country VARCHAR(2),
  timezone VARCHAR(100) DEFAULT 'UTC',
  currency VARCHAR(3) DEFAULT 'USD',
  language VARCHAR(5) DEFAULT 'en',
  plan VARCHAR(50) DEFAULT 'free',
  settings JSON,
  warehouse_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  invited_by VARCHAR REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Now add organization_id columns to all business tables
ALTER TABLE warehouse_zones ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE procurement_plans ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE shipping_agencies ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE shipping_rates ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE order_shipping ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE shipping_events ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE product_reservations ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE shipment_tracking ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE return_items ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sales_analytics ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Create basic indexes (unique indexes will be added after data migration)
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_org_id ON warehouse_zones(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_procurement_plans_org_id ON procurement_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_id ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_org_id ON customer_addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_org_id ON customer_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_id ON order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_shipping_agencies_org_id ON shipping_agencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_org_id ON shipping_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_shipping_org_id ON order_shipping(organization_id);
CREATE INDEX IF NOT EXISTS idx_shipping_events_org_id ON shipping_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_reservations_org_id ON product_reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_org_id ON shipment_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_returns_org_id ON returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_return_items_org_id ON return_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_org_id ON sales_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_org_id ON sale_items(organization_id);
