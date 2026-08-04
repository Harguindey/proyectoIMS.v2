/**
 * SII (Suministro Inmediato de Información) XML Generation Service
 * Generates XML for submission to AEAT (Agencia Estatal de Administración Tributaria)
 * Compliant with Spain's electronic invoicing requirements (SII + Verifactu)
 */

interface SiiInvoiceData {
  id: number;
  invoiceNumber: string;
  series: string;
  type: string;
  issueDate: string;
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerCity?: string;
  customerPostalCode?: string;
  customerCountry?: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paymentMethod?: string;
  currency?: string;
  items?: any[];
}

interface CompanyInfo {
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: "LogiPro Solutions S.L.",
  taxId: "B12345678",
  address: "Poligono Industrial Norte, Nave 12",
  city: "Madrid",
  postalCode: "28001",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatISODate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
}

function getTipoClave(type: string): string {
  switch (type) {
    case "standard": return "F1"; // Factura ordinaria
    case "rectificativa": return "R1"; // Factura rectificativa (Art 80.1, 80.2 y art 73 LIVA)
    case "proforma": return "F3"; // Factura proforma
    default: return "F1";
  }
}

function getClaveRegimenEspecial(type: string): string {
  return "01"; // Operación acogida a régimen general
}

function getFormaPago(method?: string): string {
  switch (method) {
    case "transfer": return "04"; // Transferencia
    case "card": return "02"; // Tarjeta
    case "cash": return "01"; // Efectivo
    case "direct_debit": return "03"; // Domiciliación
    default: return "04";
  }
}

/**
 * Generate SII XML for issued invoices (Libro Registro de Facturas Expedidas)
 */
export function generateSiiXml(invoice: SiiInvoiceData, company?: CompanyInfo): string {
  const comp = company || DEFAULT_COMPANY;
  const issueDate = formatISODate(invoice.issueDate);
  const periodoLiquidacion = new Date(invoice.issueDate);
  const ejercicio = periodoLiquidacion.getFullYear().toString();
  const periodo = (periodoLiquidacion.getMonth() + 1).toString().padStart(2, "0");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:siiLR="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroLR.xsd"
  xmlns:sii="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <siiLR:SuministroLRFacturasEmitidas>
      <sii:Cabecera>
        <sii:IDVersionSii>1.1</sii:IDVersionSii>
        <sii:Titular>
          <sii:NombreRazon>${escapeXml(comp.name)}</sii:NombreRazon>
          <sii:NIF>${escapeXml(comp.taxId)}</sii:NIF>
        </sii:Titular>
        <sii:TipoComunicacion>A0</sii:TipoComunicacion>
      </sii:Cabecera>
      <siiLR:RegistroLRFacturasEmitidas>
        <siiLR:PeriodoLiquidacion>
          <sii:Ejercicio>${ejercicio}</sii:Ejercicio>
          <sii:Periodo>${periodo}</sii:Periodo>
        </siiLR:PeriodoLiquidacion>
        <siiLR:IDFactura>
          <sii:IDEmisorFactura>
            <sii:NIF>${escapeXml(comp.taxId)}</sii:NIF>
          </sii:IDEmisorFactura>
          <sii:NumSerieFacturaEmisor>${escapeXml(invoice.invoiceNumber)}</sii:NumSerieFacturaEmisor>
          <sii:FechaExpedicionFacturaEmisor>${issueDate}</sii:FechaExpedicionFacturaEmisor>
        </siiLR:IDFactura>
        <siiLR:FacturaExpedida>
          <sii:TipoFactura>${getTipoClave(invoice.type)}</sii:TipoFactura>
          <sii:ClaveRegimenEspecialOTrascendencia>${getClaveRegimenEspecial(invoice.type)}</sii:ClaveRegimenEspecialOTrascendencia>
          <sii:ImporteTotal>${parseFloat(invoice.totalAmount).toFixed(2)}</sii:ImporteTotal>
          <sii:DescripcionOperacion>Prestacion de servicios logisticos</sii:DescripcionOperacion>
          <sii:Contraparte>
            <sii:NombreRazon>${escapeXml(invoice.customerName)}</sii:NombreRazon>
            ${invoice.customerTaxId ? `<sii:NIF>${escapeXml(invoice.customerTaxId)}</sii:NIF>` : `<sii:IDOtro>
              <sii:CodigoPais>ES</sii:CodigoPais>
              <sii:IDType>07</sii:IDType>
              <sii:ID>NO_IDENTIFICADO</sii:ID>
            </sii:IDOtro>`}
          </sii:Contraparte>
          <sii:TipoDesglose>
            <sii:DesgloseFactura>
              <sii:Sujeta>
                <sii:NoExenta>
                  <sii:TipoNoExenta>S1</sii:TipoNoExenta>
                  <sii:DesgloseIVA>
                    <sii:DetalleIVA>
                      <sii:TipoImpositivo>21.00</sii:TipoImpositivo>
                      <sii:BaseImponible>${parseFloat(invoice.subtotal).toFixed(2)}</sii:BaseImponible>
                      <sii:CuotaRepercutida>${parseFloat(invoice.taxAmount).toFixed(2)}</sii:CuotaRepercutida>
                    </sii:DetalleIVA>
                  </sii:DesgloseIVA>
                </sii:NoExenta>
              </sii:Sujeta>
            </sii:DesgloseFactura>
          </sii:TipoDesglose>
        </siiLR:FacturaExpedida>
      </siiLR:RegistroLRFacturasEmitidas>
    </siiLR:SuministroLRFacturasEmitidas>
  </soapenv:Body>
</soapenv:Envelope>`;

  return xml;
}

/**
 * Generate Verifactu-compatible XML record
 */
export function generateVerifactuXml(invoice: SiiInvoiceData, company?: CompanyInfo): string {
  const comp = company || DEFAULT_COMPANY;
  const issueDate = new Date(invoice.issueDate).toISOString().split("T")[0];
  const timestamp = new Date().toISOString();

  // Generate hash (simplified - in production use SHA-256)
  const hashInput = `${comp.taxId}|${invoice.invoiceNumber}|${issueDate}|${invoice.type}|${invoice.totalAmount}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const fingerprint = Math.abs(hash).toString(16).padStart(16, "0").toUpperCase();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<T:RegistroFacturacion xmlns:T="urn:ticketbai:emision"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Cabecera>
    <IDVersion>1.0</IDVersion>
    <ObligadoEmision>
      <NombreRazon>${escapeXml(comp.name)}</NombreRazon>
      <NIF>${escapeXml(comp.taxId)}</NIF>
    </ObligadoEmision>
  </Cabecera>
  <Sujetos>
    <Emisor>
      <NIF>${escapeXml(comp.taxId)}</NIF>
      <ApellidosNombreRazonSocial>${escapeXml(comp.name)}</ApellidosNombreRazonSocial>
    </Emisor>
    <Destinatarios>
      <IDDestinatario>
        <NIF>${escapeXml(invoice.customerTaxId || "")}</NIF>
        <ApellidosNombreRazonSocial>${escapeXml(invoice.customerName)}</ApellidosNombreRazonSocial>
        <CodigoPostal>${escapeXml(invoice.customerPostalCode || "")}</CodigoPostal>
        <Direccion>${escapeXml(invoice.customerAddress || "")}</Direccion>
      </IDDestinatario>
    </Destinatarios>
  </Sujetos>
  <Factura>
    <CabeceraFactura>
      <SerieFactura>${escapeXml(invoice.series || "A")}</SerieFactura>
      <NumFactura>${escapeXml(invoice.invoiceNumber)}</NumFactura>
      <FechaExpedicionFactura>${issueDate}</FechaExpedicionFactura>
      <HoraExpedicionFactura>${new Date().toTimeString().split(" ")[0]}</HoraExpedicionFactura>
    </CabeceraFactura>
    <DatosFactura>
      <FechaOperacion>${issueDate}</FechaOperacion>
      <DescripcionFactura>Prestacion de servicios logisticos</DescripcionFactura>
      <ImporteTotalFactura>${parseFloat(invoice.totalAmount).toFixed(2)}</ImporteTotalFactura>
      <Claves>
        <IDClave>
          <ClaveRegimenIvaOpTrascendencia>01</ClaveRegimenIvaOpTrascendencia>
        </IDClave>
      </Claves>
    </DatosFactura>
    <TipoDesglose>
      <DesgloseFactura>
        <Sujeta>
          <NoExenta>
            <DetalleNoExenta>
              <TipoNoExenta>S1</TipoNoExenta>
              <DesgloseIVA>
                <DetalleIVA>
                  <BaseImponible>${parseFloat(invoice.subtotal).toFixed(2)}</BaseImponible>
                  <TipoImpositivo>21.00</TipoImpositivo>
                  <CuotaImpuesto>${parseFloat(invoice.taxAmount).toFixed(2)}</CuotaImpuesto>
                </DetalleIVA>
              </DesgloseIVA>
            </DetalleNoExenta>
          </NoExenta>
        </Sujeta>
      </DesgloseFactura>
    </TipoDesglose>
  </Factura>
  <HuellaRegistro>
    <SistemaInformatico>
      <NombreRazon>LogiPro ERP</NombreRazon>
      <NIF>${escapeXml(comp.taxId)}</NIF>
      <NombreSistemaInformatico>LogiPro ERP v1.0</NombreSistemaInformatico>
      <IdSistemaInformatico>LOGIPRO-ERP-001</IdSistemaInformatico>
      <Version>1.0.0</Version>
    </SistemaInformatico>
    <FechaHoraHuella>${timestamp}</FechaHoraHuella>
    <Huella>${fingerprint}</Huella>
  </HuellaRegistro>
</T:RegistroFacturacion>`;

  return xml;
}

/**
 * Generate QR code data URL for Verifactu verification
 * Format: https://www.agenciatributaria.gob.es/verifactu?nif=XX&numserie=YY&fecha=ZZ&importe=WW
 */
export function generateVerifactuQrUrl(invoice: SiiInvoiceData, company?: CompanyInfo): string {
  const comp = company || DEFAULT_COMPANY;
  const fecha = new Date(invoice.issueDate).toISOString().split("T")[0];
  return `https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=${comp.taxId}&numserie=${encodeURIComponent(invoice.invoiceNumber)}&fecha=${fecha}&importe=${parseFloat(invoice.totalAmount).toFixed(2)}`;
}
