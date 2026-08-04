import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Eye, Trash2, Send, Check, AlertTriangle, Download, CreditCard, Filter, FileDown, FileCode, QrCode, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-500",
};
const statusLabels: Record<string, string> = {
  draft: "Borrador", sent: "Enviada", paid: "Cobrada", overdue: "Vencida", cancelled: "Anulada",
};
const typeLabels: Record<string, string> = {
  standard: "Ordinaria", rectificativa: "Rectificativa", proforma: "Proforma",
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/erp/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/erp/invoices", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/erp/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/invoices"] });
      setShowCreate(false);
      toast({ title: "Factura creada correctamente" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/erp/invoices/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/invoices"] });
      toast({ title: "Factura actualizada" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/erp/invoices/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/invoices"] });
      toast({ title: "Factura eliminada" });
    },
  });

  const siiSubmitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/erp/invoices/${id}/sii-submit`, { method: "POST", credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/invoices"] });
      toast({ title: "Factura presentada al SII", description: "Estado: Aceptada por AEAT" });
    },
    onError: (error: any) => {
      toast({ title: "Error SII", description: error.message, variant: "destructive" });
    },
  });

  const handleDownloadPDF = (inv: any) => {
    generateInvoicePDF(inv);
    toast({ title: "PDF generado", description: `Factura ${inv.invoiceNumber}` });
  };

  const handleDownloadSiiXml = async (inv: any) => {
    try {
      const res = await fetch(`/api/erp/invoices/${inv.id}/sii-xml`, { credentials: "include" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `SII-${inv.invoiceNumber}.xml`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "XML SII descargado" });
    } catch { toast({ title: "Error descargando XML", variant: "destructive" }); }
  };

  const handleDownloadVerifactuXml = async (inv: any) => {
    try {
      const res = await fetch(`/api/erp/invoices/${inv.id}/verifactu-xml`, { credentials: "include" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Verifactu-${inv.invoiceNumber}.xml`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "XML Verifactu descargado" });
    } catch { toast({ title: "Error descargando XML", variant: "destructive" }); }
  };

  const filtered = invoices.filter((inv: any) => {
    if (filter !== "all" && inv.status !== filter) return false;
    if (search && !inv.customerName?.toLowerCase().includes(search.toLowerCase()) && !inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = invoices.reduce((acc: any, inv: any) => {
    acc.total += parseFloat(inv.totalAmount || "0");
    if (inv.status === "paid") acc.paid += parseFloat(inv.totalAmount || "0");
    if (inv.status === "sent") acc.pending += parseFloat(inv.totalAmount || "0");
    if (inv.status === "overdue") acc.overdue += parseFloat(inv.totalAmount || "0");
    return acc;
  }, { total: 0, paid: 0, pending: 0, overdue: 0 });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      customerName: fd.get("customerName"),
      customerTaxId: fd.get("customerTaxId"),
      customerAddress: fd.get("customerAddress"),
      customerCity: fd.get("customerCity"),
      customerPostalCode: fd.get("customerPostalCode"),
      type: fd.get("type") || "standard",
      paymentMethod: fd.get("paymentMethod"),
      paymentTerms: fd.get("paymentTerms"),
      subtotal: fd.get("subtotal"),
      taxAmount: String(parseFloat(fd.get("subtotal") as string) * 0.21),
      totalAmount: String(parseFloat(fd.get("subtotal") as string) * 1.21),
      notes: fd.get("notes"),
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="invoices-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturacion</h1>
          <p className="text-slate-500">Gestion de facturas, albaranes y notas de credito</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="create-invoice-btn"><Plus className="mr-2 h-4 w-4" />Nueva Factura</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nueva Factura</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cliente *</Label><Input name="customerName" required /></div>
                <div><Label>NIF/CIF</Label><Input name="customerTaxId" placeholder="B12345678" /></div>
              </div>
              <div><Label>Direccion</Label><Input name="customerAddress" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Ciudad</Label><Input name="customerCity" /></div>
                <div><Label>CP</Label><Input name="customerPostalCode" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <select name="type" className="w-full border rounded-md p-2 text-sm">
                    <option value="standard">Ordinaria</option><option value="rectificativa">Rectificativa</option><option value="proforma">Proforma</option>
                  </select>
                </div>
                <div><Label>Metodo pago</Label>
                  <select name="paymentMethod" className="w-full border rounded-md p-2 text-sm">
                    <option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="cash">Efectivo</option><option value="direct_debit">Domiciliacion</option>
                  </select>
                </div>
              </div>
              <div><Label>Base imponible (EUR) *</Label><Input name="subtotal" type="number" step="0.01" required /></div>
              <div><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creando..." : "Crear Factura"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Total Facturado</div>
          <div className="text-2xl font-bold text-slate-900">{totals.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
          <div className="text-xs text-slate-400">{invoices.length} facturas</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-green-600">Cobrado</div>
          <div className="text-2xl font-bold text-green-700">{totals.paid.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-blue-600">Pendiente de Cobro</div>
          <div className="text-2xl font-bold text-blue-700">{totals.pending.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-red-600">Vencidas</div>
          <div className="text-2xl font-bold text-red-700">{totals.overdue.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Input placeholder="Buscar por cliente o numero..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" data-testid="invoice-search" />
        {["all", "draft", "sent", "paid", "overdue"].map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} data-testid={`filter-${s}`}>
            {s === "all" ? "Todas" : statusLabels[s]}
          </Button>
        ))}
      </div>

      {/* Invoice Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="invoices-table">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600">Numero</th>
                <th className="text-left p-3 font-medium text-slate-600">Cliente</th>
                <th className="text-left p-3 font-medium text-slate-600">NIF/CIF</th>
                <th className="text-left p-3 font-medium text-slate-600">Fecha</th>
                <th className="text-left p-3 font-medium text-slate-600">Tipo</th>
                <th className="text-right p-3 font-medium text-slate-600">Base</th>
                <th className="text-right p-3 font-medium text-slate-600">IVA</th>
                <th className="text-right p-3 font-medium text-slate-600">Total</th>
                <th className="text-center p-3 font-medium text-slate-600">Estado</th>
                <th className="text-center p-3 font-medium text-slate-600">SII</th>
                <th className="text-center p-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">No se encontraron facturas</td></tr>
              ) : (
                filtered.map((inv: any) => (
                  <tr key={inv.id} className="border-t hover:bg-slate-50" data-testid={`invoice-row-${inv.id}`}>
                    <td className="p-3 font-mono font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3 text-slate-500">{inv.customerTaxId || "-"}</td>
                    <td className="p-3">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("es-ES") : "-"}</td>
                    <td className="p-3"><Badge variant="outline">{typeLabels[inv.type] || inv.type}</Badge></td>
                    <td className="p-3 text-right">{parseFloat(inv.subtotal || "0").toLocaleString("es-ES", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{parseFloat(inv.taxAmount || "0").toLocaleString("es-ES", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-semibold">{parseFloat(inv.totalAmount || "0").toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inv.status] || ""}`}>{statusLabels[inv.status] || inv.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      {inv.siiSubmitted ? (
                        <Tooltip><TooltipTrigger><Check className="h-4 w-4 text-green-500 mx-auto" /></TooltipTrigger>
                        <TooltipContent>Presentada al SII - {inv.siiStatus || "aceptada"}</TooltipContent></Tooltip>
                      ) : <span className="text-xs text-slate-400">Pendiente</span>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-0.5 justify-center flex-wrap">
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadPDF(inv)} data-testid={`pdf-btn-${inv.id}`}>
                            <FileDown className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Descargar PDF</TooltipContent></Tooltip>

                        <Tooltip><TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadSiiXml(inv)} data-testid={`sii-xml-btn-${inv.id}`}>
                            <FileCode className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                        </TooltipTrigger><TooltipContent>XML SII (AEAT)</TooltipContent></Tooltip>

                        <Tooltip><TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadVerifactuXml(inv)} data-testid={`verifactu-btn-${inv.id}`}>
                            <QrCode className="h-3.5 w-3.5 text-purple-600" />
                          </Button>
                        </TooltipTrigger><TooltipContent>XML Verifactu</TooltipContent></Tooltip>

                        {!inv.siiSubmitted && inv.status !== "draft" && (
                          <Tooltip><TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => siiSubmitMutation.mutate(inv.id)} data-testid={`sii-submit-btn-${inv.id}`}>
                              <Shield className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          </TooltipTrigger><TooltipContent>Presentar al SII</TooltipContent></Tooltip>
                        )}

                        {inv.status === "draft" && (
                          <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: inv.id, data: { status: "sent" } })} title="Enviar">
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {inv.status === "sent" && (
                          <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: inv.id, data: { status: "paid", paidAmount: inv.totalAmount } })} title="Cobrar">
                            <CreditCard className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        {inv.status === "draft" && (
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(inv.id)} title="Eliminar">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
