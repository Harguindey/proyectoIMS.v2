import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import {
  invoices, invoiceItems, creditNotes, deliveryNotes,
  purchaseOrders, purchaseOrderItems,
  chartOfAccounts, journalEntries, journalEntryLines, fiscalYears, taxRates,
  crmActivities, crmDeals,
  departments, employees,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type CreditNote, type InsertCreditNote,
  type DeliveryNote, type InsertDeliveryNote,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type ChartOfAccount, type InsertChartOfAccount,
  type JournalEntry, type InsertJournalEntry,
  type JournalEntryLine, type InsertJournalEntryLine,
  type FiscalYear, type InsertFiscalYear,
  type TaxRate, type InsertTaxRate,
  type CrmActivity, type InsertCrmActivity,
  type CrmDeal, type InsertCrmDeal,
  type Department, type InsertDepartment,
  type Employee, type InsertEmployee,
} from "@shared/erp-schema";

export class ErpStorage {

  // ==================== TAX RATES ====================
  async getTaxRates(orgId: number): Promise<TaxRate[]> {
    return db.select().from(taxRates).where(eq(taxRates.organizationId, orgId));
  }
  async createTaxRate(orgId: number, data: any): Promise<TaxRate> {
    const [r] = await db.insert(taxRates).values({ ...data, organizationId: orgId }).returning();
    return r;
  }

  // ==================== INVOICES ====================
  async getInvoices(orgId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.organizationId, orgId)).orderBy(desc(invoices.createdAt));
  }
  async getInvoice(orgId: number, id: number): Promise<Invoice | undefined> {
    const [r] = await db.select().from(invoices).where(and(eq(invoices.organizationId, orgId), eq(invoices.id, id)));
    return r;
  }
  async getNextInvoiceNumber(orgId: number, series: string = "A"): Promise<string> {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(invoices)
      .where(and(eq(invoices.organizationId, orgId), eq(invoices.series, series)));
    const num = (r?.count || 0) + 1;
    const year = new Date().getFullYear();
    return `${series}-${year}-${String(num).padStart(5, '0')}`;
  }
  async createInvoice(orgId: number, data: any): Promise<Invoice> {
    const invoiceNumber = data.invoiceNumber || await this.getNextInvoiceNumber(orgId, data.series || "A");
    const [r] = await db.insert(invoices).values({ ...data, organizationId: orgId, invoiceNumber }).returning();
    return r;
  }
  async updateInvoice(orgId: number, id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [r] = await db.update(invoices).set({ ...data, updatedAt: new Date() })
      .where(and(eq(invoices.organizationId, orgId), eq(invoices.id, id))).returning();
    return r;
  }
  async deleteInvoice(orgId: number, id: number): Promise<boolean> {
    const r = await db.delete(invoices).where(and(eq(invoices.organizationId, orgId), eq(invoices.id, id)));
    return (r.rowCount ?? 0) > 0;
  }

  // ==================== INVOICE ITEMS ====================
  async getInvoiceItems(orgId: number, invoiceId: number): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(and(eq(invoiceItems.organizationId, orgId), eq(invoiceItems.invoiceId, invoiceId)));
  }
  async createInvoiceItem(orgId: number, data: any): Promise<InvoiceItem> {
    const [r] = await db.insert(invoiceItems).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async deleteInvoiceItems(orgId: number, invoiceId: number): Promise<void> {
    await db.delete(invoiceItems).where(and(eq(invoiceItems.organizationId, orgId), eq(invoiceItems.invoiceId, invoiceId)));
  }

  // ==================== CREDIT NOTES ====================
  async getCreditNotes(orgId: number): Promise<CreditNote[]> {
    return db.select().from(creditNotes).where(eq(creditNotes.organizationId, orgId)).orderBy(desc(creditNotes.createdAt));
  }
  async createCreditNote(orgId: number, data: any): Promise<CreditNote> {
    const [r] = await db.insert(creditNotes).values({ ...data, organizationId: orgId }).returning();
    return r;
  }

  // ==================== DELIVERY NOTES ====================
  async getDeliveryNotes(orgId: number): Promise<DeliveryNote[]> {
    return db.select().from(deliveryNotes).where(eq(deliveryNotes.organizationId, orgId)).orderBy(desc(deliveryNotes.createdAt));
  }
  async createDeliveryNote(orgId: number, data: any): Promise<DeliveryNote> {
    const [r] = await db.insert(deliveryNotes).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateDeliveryNote(orgId: number, id: number, data: any): Promise<DeliveryNote | undefined> {
    const [r] = await db.update(deliveryNotes).set(data)
      .where(and(eq(deliveryNotes.organizationId, orgId), eq(deliveryNotes.id, id))).returning();
    return r;
  }

  // ==================== PURCHASE ORDERS ====================
  async getPurchaseOrders(orgId: number): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders).where(eq(purchaseOrders.organizationId, orgId)).orderBy(desc(purchaseOrders.createdAt));
  }
  async getPurchaseOrder(orgId: number, id: number): Promise<PurchaseOrder | undefined> {
    const [r] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.organizationId, orgId), eq(purchaseOrders.id, id)));
    return r;
  }
  async getNextPONumber(orgId: number): Promise<string> {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders)
      .where(eq(purchaseOrders.organizationId, orgId));
    const num = (r?.count || 0) + 1;
    return `OC-${new Date().getFullYear()}-${String(num).padStart(5, '0')}`;
  }
  async createPurchaseOrder(orgId: number, data: any): Promise<PurchaseOrder> {
    const poNumber = data.poNumber || await this.getNextPONumber(orgId);
    const [r] = await db.insert(purchaseOrders).values({ ...data, organizationId: orgId, poNumber }).returning();
    return r;
  }
  async updatePurchaseOrder(orgId: number, id: number, data: any): Promise<PurchaseOrder | undefined> {
    const [r] = await db.update(purchaseOrders).set({ ...data, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.organizationId, orgId), eq(purchaseOrders.id, id))).returning();
    return r;
  }
  async deletePurchaseOrder(orgId: number, id: number): Promise<boolean> {
    const r = await db.delete(purchaseOrders).where(and(eq(purchaseOrders.organizationId, orgId), eq(purchaseOrders.id, id)));
    return (r.rowCount ?? 0) > 0;
  }

  // ==================== PURCHASE ORDER ITEMS ====================
  async getPurchaseOrderItems(orgId: number, poId: number): Promise<PurchaseOrderItem[]> {
    return db.select().from(purchaseOrderItems).where(and(eq(purchaseOrderItems.organizationId, orgId), eq(purchaseOrderItems.purchaseOrderId, poId)));
  }
  async createPurchaseOrderItem(orgId: number, data: any): Promise<PurchaseOrderItem> {
    const [r] = await db.insert(purchaseOrderItems).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async deletePurchaseOrderItems(orgId: number, poId: number): Promise<void> {
    await db.delete(purchaseOrderItems).where(and(eq(purchaseOrderItems.organizationId, orgId), eq(purchaseOrderItems.purchaseOrderId, poId)));
  }

  // ==================== CHART OF ACCOUNTS ====================
  async getChartOfAccounts(orgId: number): Promise<ChartOfAccount[]> {
    return db.select().from(chartOfAccounts).where(eq(chartOfAccounts.organizationId, orgId)).orderBy(chartOfAccounts.code);
  }
  async createAccount(orgId: number, data: any): Promise<ChartOfAccount> {
    const [r] = await db.insert(chartOfAccounts).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateAccount(orgId: number, id: number, data: any): Promise<ChartOfAccount | undefined> {
    const [r] = await db.update(chartOfAccounts).set(data)
      .where(and(eq(chartOfAccounts.organizationId, orgId), eq(chartOfAccounts.id, id))).returning();
    return r;
  }

  // ==================== JOURNAL ENTRIES ====================
  async getJournalEntries(orgId: number): Promise<JournalEntry[]> {
    return db.select().from(journalEntries).where(eq(journalEntries.organizationId, orgId)).orderBy(desc(journalEntries.date));
  }
  async getNextEntryNumber(orgId: number): Promise<string> {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(journalEntries)
      .where(eq(journalEntries.organizationId, orgId));
    const num = (r?.count || 0) + 1;
    return `AS-${new Date().getFullYear()}-${String(num).padStart(5, '0')}`;
  }
  async createJournalEntry(orgId: number, data: any): Promise<JournalEntry> {
    const entryNumber = data.entryNumber || await this.getNextEntryNumber(orgId);
    const [r] = await db.insert(journalEntries).values({ ...data, organizationId: orgId, entryNumber }).returning();
    return r;
  }
  async getJournalEntryLines(orgId: number, entryId: number): Promise<JournalEntryLine[]> {
    return db.select().from(journalEntryLines).where(and(eq(journalEntryLines.organizationId, orgId), eq(journalEntryLines.journalEntryId, entryId)));
  }
  async createJournalEntryLine(orgId: number, data: any): Promise<JournalEntryLine> {
    const [r] = await db.insert(journalEntryLines).values({ ...data, organizationId: orgId }).returning();
    return r;
  }

  // ==================== FISCAL YEARS ====================
  async getFiscalYears(orgId: number): Promise<FiscalYear[]> {
    return db.select().from(fiscalYears).where(eq(fiscalYears.organizationId, orgId));
  }
  async createFiscalYear(orgId: number, data: any): Promise<FiscalYear> {
    const [r] = await db.insert(fiscalYears).values({ ...data, organizationId: orgId }).returning();
    return r;
  }

  // ==================== CRM ACTIVITIES ====================
  async getCrmActivities(orgId: number): Promise<CrmActivity[]> {
    return db.select().from(crmActivities).where(eq(crmActivities.organizationId, orgId)).orderBy(desc(crmActivities.createdAt));
  }
  async createCrmActivity(orgId: number, data: any): Promise<CrmActivity> {
    const [r] = await db.insert(crmActivities).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateCrmActivity(orgId: number, id: number, data: any): Promise<CrmActivity | undefined> {
    const [r] = await db.update(crmActivities).set(data)
      .where(and(eq(crmActivities.organizationId, orgId), eq(crmActivities.id, id))).returning();
    return r;
  }
  async deleteCrmActivity(orgId: number, id: number): Promise<boolean> {
    const r = await db.delete(crmActivities).where(and(eq(crmActivities.organizationId, orgId), eq(crmActivities.id, id)));
    return (r.rowCount ?? 0) > 0;
  }

  // ==================== CRM DEALS ====================
  async getCrmDeals(orgId: number): Promise<CrmDeal[]> {
    return db.select().from(crmDeals).where(eq(crmDeals.organizationId, orgId)).orderBy(desc(crmDeals.createdAt));
  }
  async createCrmDeal(orgId: number, data: any): Promise<CrmDeal> {
    const [r] = await db.insert(crmDeals).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateCrmDeal(orgId: number, id: number, data: any): Promise<CrmDeal | undefined> {
    const [r] = await db.update(crmDeals).set({ ...data, updatedAt: new Date() })
      .where(and(eq(crmDeals.organizationId, orgId), eq(crmDeals.id, id))).returning();
    return r;
  }
  async deleteCrmDeal(orgId: number, id: number): Promise<boolean> {
    const r = await db.delete(crmDeals).where(and(eq(crmDeals.organizationId, orgId), eq(crmDeals.id, id)));
    return (r.rowCount ?? 0) > 0;
  }

  // ==================== DEPARTMENTS ====================
  async getDepartments(orgId: number): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.organizationId, orgId));
  }
  async createDepartment(orgId: number, data: any): Promise<Department> {
    const [r] = await db.insert(departments).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateDepartment(orgId: number, id: number, data: any): Promise<Department | undefined> {
    const [r] = await db.update(departments).set(data)
      .where(and(eq(departments.organizationId, orgId), eq(departments.id, id))).returning();
    return r;
  }
  async deleteDepartment(orgId: number, id: number): Promise<boolean> {
    const r = await db.delete(departments).where(and(eq(departments.organizationId, orgId), eq(departments.id, id)));
    return (r.rowCount ?? 0) > 0;
  }

  // ==================== EMPLOYEES ====================
  async getEmployees(orgId: number): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.organizationId, orgId)).orderBy(employees.lastName);
  }
  async getEmployee(orgId: number, id: number): Promise<Employee | undefined> {
    const [r] = await db.select().from(employees).where(and(eq(employees.organizationId, orgId), eq(employees.id, id)));
    return r;
  }
  async createEmployee(orgId: number, data: any): Promise<Employee> {
    const [r] = await db.insert(employees).values({ ...data, organizationId: orgId }).returning();
    return r;
  }
  async updateEmployee(orgId: number, id: number, data: any): Promise<Employee | undefined> {
    const [r] = await db.update(employees).set({ ...data, updatedAt: new Date() })
      .where(and(eq(employees.organizationId, orgId), eq(employees.id, id))).returning();
    return r;
  }
  async deleteEmployee(orgId: number, id: number): Promise<boolean> {
    const r = await db.delete(employees).where(and(eq(employees.organizationId, orgId), eq(employees.id, id)));
    return (r.rowCount ?? 0) > 0;
  }

  // ==================== ERP DASHBOARD STATS ====================
  async getErpDashboardStats(orgId: number) {
    const [invCount] = await db.select({ count: sql<number>`count(*)`, total: sql<string>`coalesce(sum(total_amount::numeric), 0)` })
      .from(invoices).where(eq(invoices.organizationId, orgId));
    const [invPending] = await db.select({ count: sql<number>`count(*)`, total: sql<string>`coalesce(sum(total_amount::numeric), 0)` })
      .from(invoices).where(and(eq(invoices.organizationId, orgId), eq(invoices.status, "sent")));
    const [invOverdue] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices).where(and(eq(invoices.organizationId, orgId), eq(invoices.status, "overdue")));
    const [poCount] = await db.select({ count: sql<number>`count(*)`, total: sql<string>`coalesce(sum(total_amount::numeric), 0)` })
      .from(purchaseOrders).where(eq(purchaseOrders.organizationId, orgId));
    const [dealCount] = await db.select({ count: sql<number>`count(*)`, total: sql<string>`coalesce(sum(value::numeric), 0)` })
      .from(crmDeals).where(eq(crmDeals.organizationId, orgId));
    const [empCount] = await db.select({ count: sql<number>`count(*)` })
      .from(employees).where(and(eq(employees.organizationId, orgId), eq(employees.status, "active")));
    return {
      invoices: { total: invCount?.count || 0, amount: invCount?.total || "0" },
      pending: { total: invPending?.count || 0, amount: invPending?.total || "0" },
      overdue: { total: invOverdue?.count || 0 },
      purchaseOrders: { total: poCount?.count || 0, amount: poCount?.total || "0" },
      deals: { total: dealCount?.count || 0, pipeline: dealCount?.total || "0" },
      employees: { total: empCount?.count || 0 },
    };
  }
}

export const erpStorage = new ErpStorage();
