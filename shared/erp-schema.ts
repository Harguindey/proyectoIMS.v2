import { pgTable, text, serial, integer, timestamp, decimal, varchar, boolean, json, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { organizations } from "./schema";

// ==================== FACTURACIÓN (INVOICING) ====================

export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("iva"), // iva, irpf, re (recargo equivalencia)
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tax_rates_org_id").on(table.organizationId),
]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  series: varchar("series", { length: 10 }).notNull().default("A"),
  type: varchar("type", { length: 20 }).notNull().default("standard"), // standard, rectificativa, proforma
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  customerTaxId: varchar("customer_tax_id", { length: 20 }), // NIF/CIF
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  customerPostalCode: varchar("customer_postal_code", { length: 10 }),
  customerCountry: varchar("customer_country", { length: 50 }).default("España"),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, paid, overdue, cancelled
  paymentMethod: varchar("payment_method", { length: 30 }), // transfer, card, cash, direct_debit
  paymentTerms: varchar("payment_terms", { length: 50 }), // 30_days, 60_days, immediate
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  // Spanish SII compliance fields
  siiSubmitted: boolean("sii_submitted").default(false),
  siiStatus: varchar("sii_status", { length: 20 }), // pending, accepted, rejected
  siiErrorMessage: text("sii_error_message"),
  siiInvoiceId: varchar("sii_invoice_id", { length: 100 }),
  relatedOrderId: integer("related_order_id"),
  relatedDeliveryNoteId: integer("related_delivery_note_id"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoices_org_id").on(table.organizationId),
  uniqueIndex("uq_invoices_org_number").on(table.organizationId, table.invoiceNumber, table.series),
  index("idx_invoices_org_status").on(table.organizationId, table.status),
  index("idx_invoices_org_customer").on(table.organizationId, table.customerId),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId: integer("product_id"),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 5, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("21"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invoice_items_org_id").on(table.organizationId),
  index("idx_invoice_items_invoice").on(table.invoiceId),
]);

export const creditNotes = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  creditNoteNumber: varchar("credit_note_number", { length: 50 }).notNull(),
  originalInvoiceId: integer("original_invoice_id").references(() => invoices.id),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  reason: text("reason").notNull(),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_credit_notes_org_id").on(table.organizationId),
]);

export const deliveryNotes = pgTable("delivery_notes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  deliveryNoteNumber: varchar("delivery_note_number", { length: 50 }).notNull(),
  orderId: integer("order_id"),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  deliveryAddress: text("delivery_address"),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  deliveryDate: timestamp("delivery_date"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_transit, delivered
  items: json("items"), // Array of {productId, description, quantity}
  notes: text("notes"),
  invoiced: boolean("invoiced").default(false),
  invoiceId: integer("invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_delivery_notes_org_id").on(table.organizationId),
]);

// ==================== COMPRAS (PURCHASING) ====================

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  poNumber: varchar("po_number", { length: 50 }).notNull(),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name").notNull(),
  supplierTaxId: varchar("supplier_tax_id", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, confirmed, partial, received, cancelled
  orderDate: timestamp("order_date").notNull().defaultNow(),
  expectedDate: timestamp("expected_date"),
  receivedDate: timestamp("received_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentTerms: varchar("payment_terms", { length: 50 }),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_purchase_orders_org_id").on(table.organizationId),
  uniqueIndex("uq_purchase_orders_org_number").on(table.organizationId, table.poNumber),
  index("idx_purchase_orders_org_status").on(table.organizationId, table.status),
]);

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  purchaseOrderId: integer("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: integer("product_id"),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: decimal("received_quantity", { precision: 10, scale: 2 }).default("0"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("21"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_po_items_org_id").on(table.organizationId),
  index("idx_po_items_po").on(table.purchaseOrderId),
]);

// ==================== CONTABILIDAD (ACCOUNTING) ====================

export const fiscalYears = pgTable("fiscal_years", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isClosed: boolean("is_closed").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fiscal_years_org_id").on(table.organizationId),
]);

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // asset, liability, equity, income, expense
  parentId: integer("parent_id"),
  isActive: boolean("is_active").default(true),
  balance: decimal("balance", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chart_accounts_org_id").on(table.organizationId),
  uniqueIndex("uq_chart_accounts_org_code").on(table.organizationId, table.code),
]);

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  entryNumber: varchar("entry_number", { length: 50 }).notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 100 }),
  type: varchar("type", { length: 20 }).notNull(), // invoice, payment, purchase, adjustment, opening
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, posted, reversed
  totalDebit: decimal("total_debit", { precision: 14, scale: 2 }).notNull().default("0"),
  totalCredit: decimal("total_credit", { precision: 14, scale: 2 }).notNull().default("0"),
  relatedInvoiceId: integer("related_invoice_id"),
  relatedPurchaseOrderId: integer("related_purchase_order_id"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_journal_entries_org_id").on(table.organizationId),
  index("idx_journal_entries_org_date").on(table.organizationId, table.date),
]);

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  journalEntryId: integer("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id),
  description: text("description"),
  debit: decimal("debit", { precision: 14, scale: 2 }).default("0"),
  credit: decimal("credit", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_journal_lines_org_id").on(table.organizationId),
  index("idx_journal_lines_entry").on(table.journalEntryId),
]);

// ==================== CRM ====================

export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: integer("customer_id"),
  type: varchar("type", { length: 20 }).notNull(), // call, email, meeting, note, task
  subject: text("subject").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, cancelled
  priority: varchar("priority", { length: 10 }).default("medium"), // low, medium, high
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  assignedTo: varchar("assigned_to"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_activities_org_id").on(table.organizationId),
  index("idx_crm_activities_customer").on(table.organizationId, table.customerId),
]);

export const crmDeals = pgTable("crm_deals", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: integer("customer_id"),
  title: text("title").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }),
  stage: varchar("stage", { length: 30 }).notNull().default("lead"), // lead, qualified, proposal, negotiation, won, lost
  probability: integer("probability").default(0),
  expectedCloseDate: timestamp("expected_close_date"),
  closedDate: timestamp("closed_date"),
  assignedTo: varchar("assigned_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_deals_org_id").on(table.organizationId),
  index("idx_crm_deals_stage").on(table.organizationId, table.stage),
]);

// ==================== RRHH (HR) ====================

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  managerId: integer("manager_id"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_departments_org_id").on(table.organizationId),
]);

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 20 }),
  taxId: varchar("tax_id", { length: 20 }), // DNI/NIE
  departmentId: integer("department_id").references(() => departments.id),
  position: varchar("position", { length: 100 }),
  contractType: varchar("contract_type", { length: 30 }), // indefinido, temporal, practicas, formacion
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, on_leave, terminated
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_employees_org_id").on(table.organizationId),
  uniqueIndex("uq_employees_org_code").on(table.organizationId, table.employeeCode),
]);

// ==================== INSERT SCHEMAS ====================

export const insertTaxRateSchema = createInsertSchema(taxRates).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, createdAt: true });
export const insertCreditNoteSchema = createInsertSchema(creditNotes).omit({ id: true, createdAt: true });
export const insertDeliveryNoteSchema = createInsertSchema(deliveryNotes).omit({ id: true, createdAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true, createdAt: true });
export const insertFiscalYearSchema = createInsertSchema(fiscalYears).omit({ id: true, createdAt: true });
export const insertChartOfAccountSchema = createInsertSchema(chartOfAccounts).omit({ id: true, createdAt: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true });
export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({ id: true, createdAt: true });
export const insertCrmActivitySchema = createInsertSchema(crmActivities).omit({ id: true, createdAt: true });
export const insertCrmDealSchema = createInsertSchema(crmDeals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });

// ==================== TYPES ====================

export type TaxRate = typeof taxRates.$inferSelect;
export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type CreditNote = typeof creditNotes.$inferSelect;
export type InsertCreditNote = z.infer<typeof insertCreditNoteSchema>;
export type DeliveryNote = typeof deliveryNotes.$inferSelect;
export type InsertDeliveryNote = z.infer<typeof insertDeliveryNoteSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type FiscalYear = typeof fiscalYears.$inferSelect;
export type InsertFiscalYear = z.infer<typeof insertFiscalYearSchema>;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = z.infer<typeof insertJournalEntryLineSchema>;
export type CrmActivity = typeof crmActivities.$inferSelect;
export type InsertCrmActivity = z.infer<typeof insertCrmActivitySchema>;
export type CrmDeal = typeof crmDeals.$inferSelect;
export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
