-- Make organization_id NOT NULL and add unique indexes

-- Make organization_id NOT NULL in all tables
ALTER TABLE warehouse_zones ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE procurement_plans ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE stock_movements ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE customer_addresses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE customer_orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE shipping_agencies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE shipping_rates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE order_shipping ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE shipping_events ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE product_reservations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE shipment_tracking ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE returns ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE return_items ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sales_analytics ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sales ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sale_items ALTER COLUMN organization_id SET NOT NULL;

-- Add unique indexes for per-org uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_zones_org_code ON warehouse_zones(organization_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_sku ON products(organization_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_orders_org_order_num ON customer_orders(organization_id, order_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_agencies_org_code ON shipping_agencies(organization_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_org_return_num ON returns(organization_id, return_number);

-- Add composite indexes for FK performance
CREATE INDEX IF NOT EXISTS idx_products_org_supplier ON products(organization_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_org_zone ON products(organization_id, warehouse_zone_id);
CREATE INDEX IF NOT EXISTS idx_procurement_plans_org_product ON procurement_plans(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_procurement_plans_org_status ON procurement_plans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_product ON stock_movements(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_type ON stock_movements(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_customers_org_email ON customers(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_customer_orders_org_customer ON customer_orders(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_order ON order_items(organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_product ON order_items(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_order_shipping_org_order ON order_shipping(organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_shipping_org_status ON order_shipping(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_returns_org_customer ON returns(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_user ON sales(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON sales(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_org_sale ON sale_items(organization_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_org_product ON sale_items(organization_id, product_id);

-- Add unique index for organizationUsers to prevent duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_users_user_org ON organization_users(user_id, organization_id);
