import type { Express } from "express";
import { erpStorage } from "./erp-storage";
import { isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { generateSiiXml, generateVerifactuXml, generateVerifactuQrUrl } from "./services/sii-service";

function getOrganizationId(req: any, res: any): number | null {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    res.status(400).json({ message: "Organization ID not found in session" });
    return null;
  }
  return organizationId;
}

export function registerErpRoutes(app: Express) {

  // ==================== FISCAL COMPLIANCE DASHBOARD ====================
  app.get("/api/erp/fiscal-compliance", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      const invoices = await erpStorage.getInvoices(orgId);
      const now = new Date();
      const SII_DEADLINE_DAYS = 4;

      const compliance = invoices.map((inv: any) => {
        const issueDate = new Date(inv.issueDate);
        const deadlineDate = new Date(issueDate);
        // Add 4 calendar days (skip weekends)
        let added = 0;
        while (added < SII_DEADLINE_DAYS) {
          deadlineDate.setDate(deadlineDate.getDate() + 1);
          const day = deadlineDate.getDay();
          if (day !== 0 && day !== 6) added++;
        }
        // Max deadline: 16th of following month
        const maxDeadline = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 16);
        const effectiveDeadline = deadlineDate < maxDeadline ? deadlineDate : maxDeadline;

        const daysRemaining = Math.ceil((effectiveDeadline.getTime() - now.getTime()) / 86400000);
        const isOverdue = !inv.siiSubmitted && daysRemaining < 0;
        const isUrgent = !inv.siiSubmitted && daysRemaining >= 0 && daysRemaining <= 1;
        const isWarning = !inv.siiSubmitted && daysRemaining > 1 && daysRemaining <= 3;

        let alertLevel: string = "ok";
        if (inv.siiSubmitted) alertLevel = "submitted";
        else if (inv.status === "draft") alertLevel = "draft";
        else if (isOverdue) alertLevel = "overdue";
        else if (isUrgent) alertLevel = "urgent";
        else if (isWarning) alertLevel = "warning";
        else alertLevel = "pending";

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          series: inv.series,
          type: inv.type,
          customerName: inv.customerName,
          customerTaxId: inv.customerTaxId,
          issueDate: inv.issueDate,
          totalAmount: inv.totalAmount,
          status: inv.status,
          siiSubmitted: inv.siiSubmitted || false,
          siiStatus: inv.siiStatus,
          siiInvoiceId: inv.siiInvoiceId,
          deadline: effectiveDeadline.toISOString(),
          daysRemaining,
          alertLevel,
        };
      });

      // Stats
      const total = compliance.length;
      const submitted = compliance.filter((c: any) => c.alertLevel === "submitted").length;
      const drafts = compliance.filter((c: any) => c.alertLevel === "draft").length;
      const overdue = compliance.filter((c: any) => c.alertLevel === "overdue").length;
      const urgent = compliance.filter((c: any) => c.alertLevel === "urgent").length;
      const warning = compliance.filter((c: any) => c.alertLevel === "warning").length;
      const pending = compliance.filter((c: any) => c.alertLevel === "pending").length;
      const nonDraft = total - drafts;
      const complianceRate = nonDraft > 0 ? Math.round((submitted / nonDraft) * 100) : 100;

      res.json({
        stats: { total, submitted, drafts, overdue, urgent, warning, pending, complianceRate },
        invoices: compliance.sort((a: any, b: any) => {
          const order: Record<string, number> = { overdue: 0, urgent: 1, warning: 2, pending: 3, draft: 4, submitted: 5 };
          return (order[a.alertLevel] ?? 9) - (order[b.alertLevel] ?? 9);
        }),
      });
    } catch (error) {
      console.error("Fiscal compliance error:", error);
      res.status(500).json({ message: "Error fetching fiscal compliance data" });
    }
  });

  // Bulk SII submission
  app.post("/api/erp/fiscal-compliance/bulk-submit", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const { invoiceIds } = req.body;
      if (!invoiceIds || !Array.isArray(invoiceIds)) return res.status(400).json({ message: "invoiceIds required" });

      let submitted = 0;
      let errors = 0;
      for (const id of invoiceIds) {
        const inv = await erpStorage.getInvoice(orgId, id);
        if (inv && inv.status !== "draft" && !inv.siiSubmitted) {
          await erpStorage.updateInvoice(orgId, id, {
            siiSubmitted: true,
            siiStatus: "accepted",
            siiInvoiceId: `SII-${Date.now()}-${inv.invoiceNumber}`,
          });
          submitted++;
        } else {
          errors++;
        }
      }
      res.json({ submitted, errors, message: `${submitted} facturas presentadas al SII` });
    } catch (error) {
      res.status(500).json({ message: "Error in bulk submission" });
    }
  });

  // ==================== ERP DASHBOARD ====================
  app.get("/api/erp/dashboard", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const stats = await erpStorage.getErpDashboardStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("ERP Dashboard error:", error);
      res.status(500).json({ message: "Error fetching ERP dashboard" });
    }
  });

  // ==================== TAX RATES ====================
  app.get("/api/erp/tax-rates", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getTaxRates(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/tax-rates", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createTaxRate(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // ==================== INVOICES ====================
  app.get("/api/erp/invoices", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const invs = await erpStorage.getInvoices(orgId);
      res.json(invs);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });

  app.get("/api/erp/invoices/next-number", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const series = (req.query.series as string) || "A";
      const number = await erpStorage.getNextInvoiceNumber(orgId, series);
      res.json({ invoiceNumber: number });
    } catch (error) {
      res.status(500).json({ message: "Error" });
    }
  });

  app.get("/api/erp/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const inv = await erpStorage.getInvoice(orgId, parseInt(req.params.id));
      if (!inv) return res.status(404).json({ message: "Invoice not found" });
      const items = await erpStorage.getInvoiceItems(orgId, inv.id);
      res.json({ ...inv, items });
    } catch (error) {
      res.status(500).json({ message: "Error" });
    }
  });

  app.post("/api/erp/invoices", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const { items, ...invoiceData } = req.body;
      const invoice = await erpStorage.createInvoice(orgId, invoiceData);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await erpStorage.createInvoiceItem(orgId, { ...item, invoiceId: invoice.id });
        }
      }
      const createdItems = await erpStorage.getInvoiceItems(orgId, invoice.id);
      res.status(201).json({ ...invoice, items: createdItems });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Error creating invoice" });
    }
  });

  app.patch("/api/erp/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const { items, ...data } = req.body;
      const updated = await erpStorage.updateInvoice(orgId, parseInt(req.params.id), data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      if (items && Array.isArray(items)) {
        await erpStorage.deleteInvoiceItems(orgId, updated.id);
        for (const item of items) {
          await erpStorage.createInvoiceItem(orgId, { ...item, invoiceId: updated.id });
        }
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error" });
    }
  });

  app.delete("/api/erp/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      await erpStorage.deleteInvoiceItems(orgId, parseInt(req.params.id));
      const ok = await erpStorage.deleteInvoice(orgId, parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error" });
    }
  });

  // ==================== SII / VERIFACTU ELECTRONIC INVOICING ====================

  // Generate SII XML for AEAT submission
  app.get("/api/erp/invoices/:id/sii-xml", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const inv = await erpStorage.getInvoice(orgId, parseInt(req.params.id));
      if (!inv) return res.status(404).json({ message: "Invoice not found" });
      const xml = generateSiiXml(inv as any);
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Content-Disposition", `attachment; filename="SII-${inv.invoiceNumber}.xml"`);
      res.send(xml);
    } catch (error) {
      console.error("SII XML error:", error);
      res.status(500).json({ message: "Error generating SII XML" });
    }
  });

  // Generate Verifactu XML record
  app.get("/api/erp/invoices/:id/verifactu-xml", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const inv = await erpStorage.getInvoice(orgId, parseInt(req.params.id));
      if (!inv) return res.status(404).json({ message: "Invoice not found" });
      const xml = generateVerifactuXml(inv as any);
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Content-Disposition", `attachment; filename="Verifactu-${inv.invoiceNumber}.xml"`);
      res.send(xml);
    } catch (error) {
      console.error("Verifactu XML error:", error);
      res.status(500).json({ message: "Error generating Verifactu XML" });
    }
  });

  // Get Verifactu QR code URL
  app.get("/api/erp/invoices/:id/verifactu-qr", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const inv = await erpStorage.getInvoice(orgId, parseInt(req.params.id));
      if (!inv) return res.status(404).json({ message: "Invoice not found" });
      const qrUrl = generateVerifactuQrUrl(inv as any);
      res.json({ qrUrl, invoiceNumber: inv.invoiceNumber });
    } catch (error) {
      res.status(500).json({ message: "Error" });
    }
  });

  // Mark invoice as SII submitted
  app.post("/api/erp/invoices/:id/sii-submit", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const id = parseInt(req.params.id);
      const inv = await erpStorage.getInvoice(orgId, id);
      if (!inv) return res.status(404).json({ message: "Invoice not found" });
      if (inv.status === "draft") return res.status(400).json({ message: "No se puede presentar una factura en borrador. Enviela primero." });

      const updated = await erpStorage.updateInvoice(orgId, id, {
        siiSubmitted: true,
        siiStatus: "accepted",
        siiInvoiceId: `SII-${Date.now()}-${inv.invoiceNumber}`,
      });
      res.json({ ...updated, message: "Factura presentada al SII correctamente" });
    } catch (error) {
      console.error("SII submit error:", error);
      res.status(500).json({ message: "Error submitting to SII" });
    }
  });

  // ==================== CREDIT NOTES ====================
  app.get("/api/erp/credit-notes", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getCreditNotes(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/credit-notes", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createCreditNote(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // ==================== DELIVERY NOTES ====================
  app.get("/api/erp/delivery-notes", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getDeliveryNotes(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/delivery-notes", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createDeliveryNote(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/erp/delivery-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const r = await erpStorage.updateDeliveryNote(orgId, parseInt(req.params.id), req.body);
      if (!r) return res.status(404).json({ message: "Not found" });
      res.json(r);
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // ==================== PURCHASE ORDERS ====================
  app.get("/api/erp/purchase-orders", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getPurchaseOrders(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.get("/api/erp/purchase-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const po = await erpStorage.getPurchaseOrder(orgId, parseInt(req.params.id));
      if (!po) return res.status(404).json({ message: "Not found" });
      const items = await erpStorage.getPurchaseOrderItems(orgId, po.id);
      res.json({ ...po, items });
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/purchase-orders", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const { items, ...poData } = req.body;
      const po = await erpStorage.createPurchaseOrder(orgId, poData);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await erpStorage.createPurchaseOrderItem(orgId, { ...item, purchaseOrderId: po.id });
        }
      }
      res.status(201).json(po);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Error" });
    }
  });
  app.patch("/api/erp/purchase-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const { items, ...data } = req.body;
      const r = await erpStorage.updatePurchaseOrder(orgId, parseInt(req.params.id), data);
      if (!r) return res.status(404).json({ message: "Not found" });
      if (items && Array.isArray(items)) {
        await erpStorage.deletePurchaseOrderItems(orgId, r.id);
        for (const item of items) {
          await erpStorage.createPurchaseOrderItem(orgId, { ...item, purchaseOrderId: r.id });
        }
      }
      res.json(r);
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.delete("/api/erp/purchase-orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const id = parseInt(req.params.id);
      await erpStorage.deletePurchaseOrderItems(orgId, id);
      const ok = await erpStorage.deletePurchaseOrder(orgId, id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // ==================== ACCOUNTING ====================
  app.get("/api/erp/accounts", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getChartOfAccounts(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/accounts", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createAccount(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.get("/api/erp/journal-entries", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getJournalEntries(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/journal-entries", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const { lines, ...entryData } = req.body;
      const entry = await erpStorage.createJournalEntry(orgId, entryData);
      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          await erpStorage.createJournalEntryLine(orgId, { ...line, journalEntryId: entry.id });
        }
      }
      res.status(201).json(entry);
    } catch (e) {
      console.error("Error:", e);
      res.status(500).json({ message: "Error" });
    }
  });
  app.get("/api/erp/fiscal-years", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getFiscalYears(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/fiscal-years", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createFiscalYear(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // ==================== CRM ====================
  app.get("/api/erp/crm/activities", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getCrmActivities(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/crm/activities", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createCrmActivity(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/erp/crm/activities/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const r = await erpStorage.updateCrmActivity(orgId, parseInt(req.params.id), req.body);
      if (!r) return res.status(404).json({ message: "Not found" });
      res.json(r);
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.delete("/api/erp/crm/activities/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const ok = await erpStorage.deleteCrmActivity(orgId, parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  app.get("/api/erp/crm/deals", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getCrmDeals(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/crm/deals", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createCrmDeal(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/erp/crm/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const r = await erpStorage.updateCrmDeal(orgId, parseInt(req.params.id), req.body);
      if (!r) return res.status(404).json({ message: "Not found" });
      res.json(r);
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.delete("/api/erp/crm/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const ok = await erpStorage.deleteCrmDeal(orgId, parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // ==================== HR ====================
  app.get("/api/erp/departments", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getDepartments(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/departments", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createDepartment(orgId, req.body));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.patch("/api/erp/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const r = await erpStorage.updateDepartment(orgId, parseInt(req.params.id), req.body);
      if (!r) return res.status(404).json({ message: "Not found" });
      res.json(r);
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.delete("/api/erp/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const ok = await erpStorage.deleteDepartment(orgId, parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  app.get("/api/erp/employees", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.json(await erpStorage.getEmployees(orgId));
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.get("/api/erp/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const emp = await erpStorage.getEmployee(orgId, parseInt(req.params.id));
      if (!emp) return res.status(404).json({ message: "Not found" });
      res.json(emp);
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.post("/api/erp/employees", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      res.status(201).json(await erpStorage.createEmployee(orgId, req.body));
    } catch (e) {
      console.error("Error:", e);
      res.status(500).json({ message: "Error" });
    }
  });
  app.patch("/api/erp/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const r = await erpStorage.updateEmployee(orgId, parseInt(req.params.id), req.body);
      if (!r) return res.status(404).json({ message: "Not found" });
      res.json(r);
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });
  app.delete("/api/erp/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;
      const ok = await erpStorage.deleteEmployee(orgId, parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.status(204).send();
    } catch (e) { res.status(500).json({ message: "Error" }); }
  });

  // ==================== SEED DATA ====================
  app.post("/api/erp/seed", isAuthenticated, async (req, res) => {
    try {
      const orgId = getOrganizationId(req, res);
      if (!orgId) return;

      // Check if already seeded
      const existingAccounts = await erpStorage.getChartOfAccounts(orgId);
      if (existingAccounts.length > 0) {
        return res.json({ success: true, message: "ERP data already seeded", alreadySeeded: true });
      }

      // Tax rates (Spanish)
      const taxes = [
        { name: "IVA General", code: "IVA21", rate: "21.00", type: "iva", isDefault: true },
        { name: "IVA Reducido", code: "IVA10", rate: "10.00", type: "iva" },
        { name: "IVA Superreducido", code: "IVA4", rate: "4.00", type: "iva" },
        { name: "Exento de IVA", code: "IVA0", rate: "0.00", type: "iva" },
        { name: "Recargo Equivalencia 5.2%", code: "RE52", rate: "5.20", type: "re" },
        { name: "IRPF 15%", code: "IRPF15", rate: "15.00", type: "irpf" },
      ];
      for (const t of taxes) await erpStorage.createTaxRate(orgId, t);

      // Chart of accounts (PGC Spain simplified)
      const accounts = [
        { code: "100", name: "Capital social", type: "equity" },
        { code: "129", name: "Resultado del ejercicio", type: "equity" },
        { code: "170", name: "Deudas a L/P con entidades de credito", type: "liability" },
        { code: "400", name: "Proveedores", type: "liability" },
        { code: "410", name: "Acreedores por prestaciones de servicios", type: "liability" },
        { code: "430", name: "Clientes", type: "asset" },
        { code: "440", name: "Deudores varios", type: "asset" },
        { code: "472", name: "H.P. IVA soportado", type: "asset" },
        { code: "475", name: "H.P. acreedora por IVA", type: "liability" },
        { code: "476", name: "Organismos SS acreedores", type: "liability" },
        { code: "520", name: "Deudas a C/P con entidades de credito", type: "liability" },
        { code: "570", name: "Caja", type: "asset" },
        { code: "572", name: "Bancos e instituciones de credito", type: "asset" },
        { code: "600", name: "Compras de mercaderias", type: "expense" },
        { code: "621", name: "Arrendamientos y canones", type: "expense" },
        { code: "622", name: "Reparaciones y conservacion", type: "expense" },
        { code: "623", name: "Servicios de profesionales independientes", type: "expense" },
        { code: "625", name: "Primas de seguros", type: "expense" },
        { code: "626", name: "Servicios bancarios y similares", type: "expense" },
        { code: "628", name: "Suministros", type: "expense" },
        { code: "629", name: "Otros servicios", type: "expense" },
        { code: "640", name: "Sueldos y salarios", type: "expense" },
        { code: "642", name: "Seguridad Social a cargo empresa", type: "expense" },
        { code: "680", name: "Amortizacion del inmovilizado", type: "expense" },
        { code: "700", name: "Ventas de mercaderias", type: "income" },
        { code: "705", name: "Prestaciones de servicios", type: "income" },
        { code: "759", name: "Ingresos por servicios diversos", type: "income" },
        { code: "769", name: "Otros ingresos financieros", type: "income" },
      ];
      for (const a of accounts) await erpStorage.createAccount(orgId, a);

      // Fiscal year
      await erpStorage.createFiscalYear(orgId, {
        name: "Ejercicio 2025",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        isActive: true,
      });
      await erpStorage.createFiscalYear(orgId, {
        name: "Ejercicio 2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        isActive: true,
      });

      // Departments
      const depts = [
        { name: "Direccion General", code: "DIR", description: "Equipo directivo" },
        { name: "Almacen y Logistica", code: "ALM", description: "Gestion de almacen y envios" },
        { name: "Comercial", code: "COM", description: "Ventas y atencion al cliente" },
        { name: "Administracion", code: "ADM", description: "Contabilidad y finanzas" },
        { name: "RRHH", code: "RRHH", description: "Recursos humanos" },
        { name: "IT y Sistemas", code: "IT", description: "Tecnologia de la informacion" },
      ];
      const createdDepts: any[] = [];
      for (const d of depts) {
        createdDepts.push(await erpStorage.createDepartment(orgId, d));
      }

      // Employees
      const emps = [
        { employeeCode: "EMP-001", firstName: "Carlos", lastName: "Garcia Lopez", email: "carlos.garcia@logistica.es", phone: "+34 612 345 678", taxId: "12345678A", departmentId: createdDepts[0].id, position: "Director General", contractType: "indefinido", startDate: new Date("2020-01-15"), salary: "55000", status: "active" },
        { employeeCode: "EMP-002", firstName: "Maria", lastName: "Rodriguez Fernandez", email: "maria.rodriguez@logistica.es", phone: "+34 623 456 789", taxId: "23456789B", departmentId: createdDepts[1].id, position: "Jefe de Almacen", contractType: "indefinido", startDate: new Date("2020-03-01"), salary: "38000", status: "active" },
        { employeeCode: "EMP-003", firstName: "Antonio", lastName: "Martinez Ruiz", email: "antonio.martinez@logistica.es", phone: "+34 634 567 890", taxId: "34567890C", departmentId: createdDepts[2].id, position: "Comercial Senior", contractType: "indefinido", startDate: new Date("2021-06-15"), salary: "35000", status: "active" },
        { employeeCode: "EMP-004", firstName: "Laura", lastName: "Sanchez Moreno", email: "laura.sanchez@logistica.es", phone: "+34 645 678 901", taxId: "45678901D", departmentId: createdDepts[3].id, position: "Contable", contractType: "indefinido", startDate: new Date("2021-09-01"), salary: "32000", status: "active" },
        { employeeCode: "EMP-005", firstName: "Pedro", lastName: "Lopez Torres", email: "pedro.lopez@logistica.es", phone: "+34 656 789 012", taxId: "56789012E", departmentId: createdDepts[1].id, position: "Operario de Almacen", contractType: "temporal", startDate: new Date("2024-01-10"), salary: "24000", status: "active" },
        { employeeCode: "EMP-006", firstName: "Ana", lastName: "Gonzalez Diaz", email: "ana.gonzalez@logistica.es", phone: "+34 667 890 123", taxId: "67890123F", departmentId: createdDepts[2].id, position: "Comercial Junior", contractType: "practicas", startDate: new Date("2025-02-01"), salary: "18000", status: "active" },
        { employeeCode: "EMP-007", firstName: "Javier", lastName: "Hernandez Vega", email: "javier.hernandez@logistica.es", phone: "+34 678 901 234", taxId: "78901234G", departmentId: createdDepts[5].id, position: "Administrador de Sistemas", contractType: "indefinido", startDate: new Date("2022-04-01"), salary: "40000", status: "active" },
        { employeeCode: "EMP-008", firstName: "Elena", lastName: "Navarro Blanco", email: "elena.navarro@logistica.es", phone: "+34 689 012 345", taxId: "89012345H", departmentId: createdDepts[4].id, position: "Tecnica de RRHH", contractType: "indefinido", startDate: new Date("2023-01-15"), salary: "30000", status: "active" },
      ];
      for (const e of emps) await erpStorage.createEmployee(orgId, e);

      // Sample invoices
      const sampleInvoices = [
        { customerName: "Transportes Iberia S.L.", customerTaxId: "B12345678", customerAddress: "C/ Gran Via 45, Madrid", customerCity: "Madrid", customerPostalCode: "28013", series: "A", type: "standard", status: "paid", paymentMethod: "transfer", subtotal: "4500.00", taxAmount: "945.00", totalAmount: "5445.00", paidAmount: "5445.00", issueDate: new Date("2025-12-15"), dueDate: new Date("2026-01-15") },
        { customerName: "Logistica Norte S.A.", customerTaxId: "A87654321", customerAddress: "Poligono Industrial 12, Bilbao", customerCity: "Bilbao", customerPostalCode: "48001", series: "A", type: "standard", status: "sent", paymentMethod: "transfer", subtotal: "8200.00", taxAmount: "1722.00", totalAmount: "9922.00", paidAmount: "0", issueDate: new Date("2026-01-05"), dueDate: new Date("2026-02-05") },
        { customerName: "Almacenes del Sur S.L.", customerTaxId: "B11223344", customerAddress: "Avda Andalucia 78, Sevilla", customerCity: "Sevilla", customerPostalCode: "41001", series: "A", type: "standard", status: "overdue", paymentMethod: "transfer", subtotal: "3100.00", taxAmount: "651.00", totalAmount: "3751.00", paidAmount: "0", issueDate: new Date("2025-11-01"), dueDate: new Date("2025-12-01") },
        { customerName: "Distribuciones Levante S.A.", customerTaxId: "A55667788", customerAddress: "C/ Valencia 33, Valencia", customerCity: "Valencia", customerPostalCode: "46001", series: "A", type: "standard", status: "paid", paymentMethod: "card", subtotal: "12500.00", taxAmount: "2625.00", totalAmount: "15125.00", paidAmount: "15125.00", issueDate: new Date("2025-12-20"), dueDate: new Date("2026-01-20") },
        { customerName: "Cargo Express S.L.", customerTaxId: "B99887766", customerAddress: "Poligono Logistico 5, Zaragoza", customerCity: "Zaragoza", customerPostalCode: "50001", series: "A", type: "proforma", status: "draft", subtotal: "6800.00", taxAmount: "1428.00", totalAmount: "8228.00", paidAmount: "0", issueDate: new Date("2026-01-10") },
      ];
      for (const inv of sampleInvoices) await erpStorage.createInvoice(orgId, inv);

      // Sample purchase orders
      const samplePOs = [
        { supplierName: "Materiales Industriales S.A.", supplierTaxId: "A11112222", status: "received", subtotal: "15000.00", taxAmount: "3150.00", totalAmount: "18150.00", orderDate: new Date("2025-12-01"), expectedDate: new Date("2025-12-15"), receivedDate: new Date("2025-12-14"), paymentTerms: "30_days" },
        { supplierName: "Embalajes y Packaging S.L.", supplierTaxId: "B33334444", status: "confirmed", subtotal: "4200.00", taxAmount: "882.00", totalAmount: "5082.00", orderDate: new Date("2026-01-02"), expectedDate: new Date("2026-01-20"), paymentTerms: "60_days" },
        { supplierName: "Tecnologia y Sistemas S.A.", supplierTaxId: "A55556666", status: "sent", subtotal: "22000.00", taxAmount: "4620.00", totalAmount: "26620.00", orderDate: new Date("2026-01-08"), expectedDate: new Date("2026-02-08"), paymentTerms: "30_days" },
        { supplierName: "Suministros Generales S.L.", supplierTaxId: "B77778888", status: "draft", subtotal: "3500.00", taxAmount: "735.00", totalAmount: "4235.00", orderDate: new Date("2026-01-12"), paymentTerms: "immediate" },
      ];
      for (const po of samplePOs) await erpStorage.createPurchaseOrder(orgId, po);

      // CRM Deals
      const deals = [
        { title: "Contrato almacenaje Transportes Iberia", value: "45000", stage: "negotiation", probability: 70, customerName: "Transportes Iberia S.L.", expectedCloseDate: new Date("2026-02-15") },
        { title: "Servicio logistico integral Levante", value: "120000", stage: "proposal", probability: 50, customerName: "Distribuciones Levante S.A.", expectedCloseDate: new Date("2026-03-01") },
        { title: "Gestion de inventario Cargo Express", value: "28000", stage: "qualified", probability: 30, customerName: "Cargo Express S.L.", expectedCloseDate: new Date("2026-04-01") },
        { title: "Ampliacion servicios Almacenes del Sur", value: "65000", stage: "won", probability: 100, customerName: "Almacenes del Sur S.L.", closedDate: new Date("2025-12-20") },
        { title: "Proyecto cross-docking Barcelona", value: "85000", stage: "lead", probability: 10, customerName: "Barcelona Logistics S.A.", expectedCloseDate: new Date("2026-06-01") },
      ];
      for (const d of deals) await erpStorage.createCrmDeal(orgId, d);

      // CRM Activities
      const activities = [
        { type: "call", subject: "Seguimiento propuesta Levante", status: "completed", priority: "high", completedDate: new Date("2026-01-10") },
        { type: "meeting", subject: "Reunion negociacion Transportes Iberia", status: "pending", priority: "high", dueDate: new Date("2026-01-20") },
        { type: "email", subject: "Envio presupuesto Cargo Express", status: "completed", priority: "medium", completedDate: new Date("2026-01-08") },
        { type: "task", subject: "Preparar presentacion cross-docking", status: "pending", priority: "medium", dueDate: new Date("2026-01-25") },
        { type: "note", subject: "Almacenes del Sur quiere ampliar contrato", status: "completed", priority: "low", completedDate: new Date("2025-12-18") },
      ];
      for (const a of activities) await erpStorage.createCrmActivity(orgId, a);

      res.json({ success: true, message: "ERP demo data seeded successfully" });
    } catch (error) {
      console.error("Error seeding ERP data:", error);
      res.status(500).json({ message: "Error seeding data", error: String(error) });
    }
  });

  console.log("ERP routes registered successfully");
}
