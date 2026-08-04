import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  series: string;
  type: string;
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerCity?: string;
  customerPostalCode?: string;
  customerCountry?: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  paymentMethod?: string;
  paymentTerms?: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount?: string;
  currency?: string;
  notes?: string;
  siiSubmitted?: boolean;
  siiStatus?: string;
  items?: InvoiceItemData[];
}

interface InvoiceItemData {
  description: string;
  quantity: string;
  unitPrice: string;
  discount?: string;
  taxRate: string;
  taxAmount: string;
  subtotal: string;
  total: string;
}

interface CompanyData {
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  registryInfo?: string;
}

const DEFAULT_COMPANY: CompanyData = {
  name: "LogiPro Solutions S.L.",
  taxId: "B12345678",
  address: "Poligono Industrial Norte, Nave 12",
  city: "Madrid",
  postalCode: "28001",
  country: "España",
  phone: "+34 912 345 678",
  email: "facturacion@logipro.es",
  website: "www.logipro.es",
  registryInfo: "Reg. Mercantil de Madrid, Tomo 12345, Folio 67, Hoja M-89012",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const typeLabels: Record<string, string> = {
  standard: "FACTURA", rectificativa: "FACTURA RECTIFICATIVA", proforma: "FACTURA PROFORMA",
};

const paymentLabels: Record<string, string> = {
  transfer: "Transferencia bancaria", card: "Tarjeta de credito/debito",
  cash: "Efectivo", direct_debit: "Domiciliacion bancaria",
};

export function generateInvoicePDF(invoice: InvoiceData, company?: CompanyData): void {
  const comp = company || DEFAULT_COMPANY;
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ============== HEADER ==============
  // Company name (top left)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 64, 175); // Blue
  doc.text(comp.name, margin, y + 6);

  // Invoice type (top right)
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const invoiceTypeText = typeLabels[invoice.type] || "FACTURA";
  doc.text(invoiceTypeText, pageWidth - margin, y + 6, { align: "right" });

  y += 12;
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ============== COMPANY INFO (left) & INVOICE INFO (right) ==============
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  const leftX = margin;
  const rightX = pageWidth / 2 + 10;
  let leftY = y;
  let rightY = y;

  // Company details
  doc.text(comp.address, leftX, leftY); leftY += 4;
  doc.text(`${comp.postalCode} ${comp.city}, ${comp.country}`, leftX, leftY); leftY += 4;
  doc.text(`NIF/CIF: ${comp.taxId}`, leftX, leftY); leftY += 4;
  if (comp.phone) { doc.text(`Tel: ${comp.phone}`, leftX, leftY); leftY += 4; }
  if (comp.email) { doc.text(comp.email, leftX, leftY); leftY += 4; }

  // Invoice details (right side box)
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(rightX - 5, rightY - 4, contentWidth / 2 + 5, 28, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`N. Factura: ${invoice.invoiceNumber}`, rightX, rightY); rightY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Fecha emision: ${formatDate(invoice.issueDate)}`, rightX, rightY); rightY += 5;
  if (invoice.dueDate) {
    doc.text(`Fecha vencimiento: ${formatDate(invoice.dueDate)}`, rightX, rightY); rightY += 5;
  }
  if (invoice.paymentMethod) {
    doc.text(`Forma de pago: ${paymentLabels[invoice.paymentMethod] || invoice.paymentMethod}`, rightX, rightY); rightY += 5;
  }
  doc.text(`Serie: ${invoice.series || "A"}`, rightX, rightY);

  y = Math.max(leftY, rightY) + 10;

  // ============== CUSTOMER BOX ==============
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(200, 200, 210);
  doc.roundedRect(margin, y - 2, contentWidth, 30, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("DATOS DEL CLIENTE", margin + 4, y + 3);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.customerName, margin + 4, y + 9);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  let cy = y + 14;
  if (invoice.customerTaxId) { doc.text(`NIF/CIF: ${invoice.customerTaxId}`, margin + 4, cy); cy += 4; }
  if (invoice.customerAddress) { doc.text(invoice.customerAddress, margin + 4, cy); cy += 4; }
  if (invoice.customerCity || invoice.customerPostalCode) {
    doc.text(`${invoice.customerPostalCode || ""} ${invoice.customerCity || ""}, ${invoice.customerCountry || "España"}`, margin + 4, cy);
  }

  y += 36;

  // ============== ITEMS TABLE ==============
  const items = invoice.items || [];
  const hasItems = items.length > 0;

  if (hasItems) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Descripcion", "Cantidad", "Precio unitario", "Dto. %", "Base imponible", "IVA %", "Cuota IVA", "Total"]],
      body: items.map((item) => [
        item.description,
        formatCurrency(item.quantity),
        `${formatCurrency(item.unitPrice)} EUR`,
        `${item.discount || "0"}%`,
        `${formatCurrency(item.subtotal)} EUR`,
        `${item.taxRate}%`,
        `${formatCurrency(item.taxAmount)} EUR`,
        `${formatCurrency(item.total)} EUR`,
      ]),
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40],
        halign: "right",
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 55 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    // If no items, show the invoice as a single line
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Concepto", "Base imponible", "Tipo IVA", "Cuota IVA", "Total"]],
      body: [
        [
          "Servicios segun factura",
          `${formatCurrency(invoice.subtotal)} EUR`,
          "21%",
          `${formatCurrency(invoice.taxAmount)} EUR`,
          `${formatCurrency(invoice.totalAmount)} EUR`,
        ],
      ],
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40], halign: "right" },
      columnStyles: { 0: { halign: "left", cellWidth: 70 } },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ============== IVA BREAKDOWN TABLE ==============
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("DESGLOSE DE IVA", margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Tipo impositivo", "Base imponible", "Cuota tributaria"]],
    body: [
      ["IVA 21%", `${formatCurrency(invoice.subtotal)} EUR`, `${formatCurrency(invoice.taxAmount)} EUR`],
    ],
    headStyles: { fillColor: [245, 247, 250], textColor: [60, 60, 60], fontSize: 7, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, halign: "right" },
    columnStyles: { 0: { halign: "left" } },
    theme: "grid",
    tableWidth: contentWidth * 0.5,
  });

  // ============== TOTALS BOX (right aligned) ==============
  const totalsX = pageWidth - margin - 70;
  const totalsY = y;

  doc.setFillColor(30, 64, 175);
  doc.roundedRect(totalsX, totalsY - 2, 70, 32, 2, 2, "F");

  doc.setTextColor(200, 215, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Base imponible:", totalsX + 4, totalsY + 4);
  doc.text(`${formatCurrency(invoice.subtotal)} EUR`, totalsX + 66, totalsY + 4, { align: "right" });

  doc.text("IVA (21%):", totalsX + 4, totalsY + 10);
  doc.text(`${formatCurrency(invoice.taxAmount)} EUR`, totalsX + 66, totalsY + 10, { align: "right" });

  doc.setDrawColor(100, 140, 220);
  doc.line(totalsX + 4, totalsY + 14, totalsX + 66, totalsY + 14);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX + 4, totalsY + 22);
  doc.text(`${formatCurrency(invoice.totalAmount)} EUR`, totalsX + 66, totalsY + 22, { align: "right" });

  if (invoice.paidAmount && parseFloat(invoice.paidAmount) > 0) {
    doc.setFontSize(7);
    doc.setTextColor(180, 220, 180);
    doc.text(`Cobrado: ${formatCurrency(invoice.paidAmount)} EUR`, totalsX + 4, totalsY + 28);
  }

  y = Math.max((doc as any).lastAutoTable.finalY, totalsY + 36) + 10;

  // ============== NOTES ==============
  if (invoice.notes) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("OBSERVACIONES:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(invoice.notes, margin, y, { maxWidth: contentWidth });
    y += 8;
  }

  // ============== VERIFACTU QR CODE PLACEHOLDER ==============
  y = Math.max(y, 230);
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(252, 252, 252);
  doc.rect(margin, y, 30, 30, "FD");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("QR Verifactu", margin + 15, y + 17, { align: "center" });
  doc.setFontSize(5);
  doc.text("Codigo de verificacion", margin + 15, y + 21, { align: "center" });

  // SII status badge
  if (invoice.siiSubmitted) {
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin + 35, y + 5, 35, 8, 1, 1, "F");
    doc.setFontSize(6);
    doc.setTextColor(22, 163, 74);
    doc.text("SII: Presentada", margin + 52, y + 10, { align: "center" });
  }

  // ============== FOOTER ==============
  const footerY = 275;
  doc.setDrawColor(200, 200, 210);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(6);
  doc.setTextColor(140, 140, 140);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${comp.name} | NIF/CIF: ${comp.taxId} | ${comp.address}, ${comp.postalCode} ${comp.city}`,
    pageWidth / 2, footerY + 4, { align: "center" }
  );
  if (comp.registryInfo) {
    doc.text(comp.registryInfo, pageWidth / 2, footerY + 8, { align: "center" });
  }
  doc.text(
    "Factura generada conforme al Real Decreto 1619/2012 y normativa SII/Verifactu",
    pageWidth / 2, footerY + 12, { align: "center" }
  );

  // Save
  doc.save(`${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`);
}
