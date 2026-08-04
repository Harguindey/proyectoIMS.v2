import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Plus, Trash2, Check, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700", partial: "bg-yellow-100 text-yellow-700",
  received: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};
const statusLabels: Record<string, string> = {
  draft: "Borrador", sent: "Enviada", confirmed: "Confirmada",
  partial: "Parcial", received: "Recibida", cancelled: "Anulada",
};

export default function PurchasesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/erp/purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/erp/purchase-orders", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/erp/purchase-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/purchase-orders"] });
      setShowCreate(false);
      toast({ title: "Orden de compra creada" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/erp/purchase-orders/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/purchase-orders"] });
      toast({ title: "Orden actualizada" });
    },
  });

  const filtered = orders.filter((o: any) => filter === "all" || o.status === filter);

  const totals = orders.reduce((acc: any, o: any) => {
    acc.total += parseFloat(o.totalAmount || "0");
    if (o.status === "received") acc.received += parseFloat(o.totalAmount || "0");
    if (["sent", "confirmed", "partial"].includes(o.status)) acc.pending += parseFloat(o.totalAmount || "0");
    return acc;
  }, { total: 0, received: 0, pending: 0 });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const subtotal = parseFloat(fd.get("subtotal") as string);
    createMutation.mutate({
      supplierName: fd.get("supplierName"),
      supplierTaxId: fd.get("supplierTaxId"),
      paymentTerms: fd.get("paymentTerms"),
      subtotal: String(subtotal),
      taxAmount: String(subtotal * 0.21),
      totalAmount: String(subtotal * 1.21),
      notes: fd.get("notes"),
      expectedDate: fd.get("expectedDate") ? new Date(fd.get("expectedDate") as string).toISOString() : undefined,
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="purchases-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ordenes de Compra</h1>
          <p className="text-slate-500">Gestion de compras a proveedores</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="create-po-btn"><Plus className="mr-2 h-4 w-4" />Nueva OC</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Proveedor *</Label><Input name="supplierName" required /></div>
                <div><Label>NIF/CIF</Label><Input name="supplierTaxId" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Condiciones de pago</Label>
                  <select name="paymentTerms" className="w-full border rounded-md p-2 text-sm">
                    <option value="immediate">Inmediato</option><option value="30_days">30 dias</option><option value="60_days">60 dias</option><option value="90_days">90 dias</option>
                  </select>
                </div>
                <div><Label>Fecha prevista entrega</Label><Input name="expectedDate" type="date" /></div>
              </div>
              <div><Label>Base imponible (EUR) *</Label><Input name="subtotal" type="number" step="0.01" required /></div>
              <div><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creando..." : "Crear OC"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Total Compras</div>
          <div className="text-2xl font-bold">{totals.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
          <div className="text-xs text-slate-400">{orders.length} ordenes</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-green-600">Recibido</div>
          <div className="text-2xl font-bold text-green-700">{totals.received.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-blue-600">Pendiente</div>
          <div className="text-2xl font-bold text-blue-700">{totals.pending.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "sent", "confirmed", "partial", "received"].map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s === "all" ? "Todas" : statusLabels[s]}
          </Button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="po-table">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600">N. OC</th>
                <th className="text-left p-3 font-medium text-slate-600">Proveedor</th>
                <th className="text-left p-3 font-medium text-slate-600">Fecha</th>
                <th className="text-left p-3 font-medium text-slate-600">Entrega prev.</th>
                <th className="text-right p-3 font-medium text-slate-600">Total</th>
                <th className="text-center p-3 font-medium text-slate-600">Estado</th>
                <th className="text-center p-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No se encontraron ordenes</td></tr>
              ) : (
                filtered.map((o: any) => (
                  <tr key={o.id} className="border-t hover:bg-slate-50" data-testid={`po-row-${o.id}`}>
                    <td className="p-3 font-mono font-medium">{o.poNumber}</td>
                    <td className="p-3">{o.supplierName}</td>
                    <td className="p-3">{o.orderDate ? new Date(o.orderDate).toLocaleDateString("es-ES") : "-"}</td>
                    <td className="p-3">{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString("es-ES") : "-"}</td>
                    <td className="p-3 text-right font-semibold">{parseFloat(o.totalAmount || "0").toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || ""}`}>{statusLabels[o.status] || o.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {o.status === "draft" && <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: o.id, data: { status: "sent" } })}><Truck className="h-3.5 w-3.5" /></Button>}
                        {o.status === "sent" && <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: o.id, data: { status: "confirmed" } })}><Check className="h-3.5 w-3.5" /></Button>}
                        {(o.status === "confirmed" || o.status === "partial") && <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: o.id, data: { status: "received", receivedDate: new Date().toISOString() } })}><Check className="h-3.5 w-3.5 text-green-600" /></Button>}
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
