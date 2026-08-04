import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calculator, Plus, BookOpen, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const accountTypeLabels: Record<string, string> = {
  asset: "Activo", liability: "Pasivo", equity: "Patrimonio", income: "Ingreso", expense: "Gasto",
};
const accountTypeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700", liability: "bg-red-100 text-red-700",
  equity: "bg-purple-100 text-purple-700", income: "bg-green-100 text-green-700",
  expense: "bg-orange-100 text-orange-700",
};

export default function AccountingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/erp/accounts"],
    queryFn: async () => { const r = await fetch("/api/erp/accounts", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; },
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["/api/erp/journal-entries"],
    queryFn: async () => { const r = await fetch("/api/erp/journal-entries", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; },
  });
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ["/api/erp/fiscal-years"],
    queryFn: async () => { const r = await fetch("/api/erp/fiscal-years", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/erp/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/accounts"] }); setShowAddAccount(false); toast({ title: "Cuenta creada" }); },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/erp/journal-entries", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/journal-entries"] }); setShowAddEntry(false); toast({ title: "Asiento creado" }); },
  });

  const totalsByType = accounts.reduce((acc: any, a: any) => {
    const type = a.type || "other";
    acc[type] = (acc[type] || 0) + parseFloat(a.balance || "0");
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6" data-testid="accounting-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contabilidad</h1>
          <p className="text-slate-500">Plan contable, asientos y ejercicios fiscales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /><span className="text-sm text-slate-500">Activos</span></div>
          <div className="text-2xl font-bold text-blue-700">{(totalsByType.asset || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /><span className="text-sm text-slate-500">Pasivos</span></div>
          <div className="text-2xl font-bold text-red-700">{(totalsByType.liability || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" /><span className="text-sm text-slate-500">Ingresos</span></div>
          <div className="text-2xl font-bold text-green-700">{(totalsByType.income || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-orange-500" /><span className="text-sm text-slate-500">Gastos</span></div>
          <div className="text-2xl font-bold text-orange-700">{(totalsByType.expense || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Plan Contable ({accounts.length})</TabsTrigger>
          <TabsTrigger value="entries">Asientos ({entries.length})</TabsTrigger>
          <TabsTrigger value="fiscal">Ejercicios Fiscales</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Nueva Cuenta</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva Cuenta Contable</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createAccountMutation.mutate({ code: fd.get("code"), name: fd.get("name"), type: fd.get("type") }); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Codigo *</Label><Input name="code" required placeholder="430" /></div>
                    <div><Label>Tipo *</Label>
                      <select name="type" className="w-full border rounded-md p-2 text-sm" required>
                        <option value="asset">Activo</option><option value="liability">Pasivo</option><option value="equity">Patrimonio</option><option value="income">Ingreso</option><option value="expense">Gasto</option>
                      </select>
                    </div>
                  </div>
                  <div><Label>Nombre *</Label><Input name="name" required /></div>
                  <Button type="submit" className="w-full">Crear Cuenta</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="accounts-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-600">Codigo</th>
                    <th className="text-left p-3 font-medium text-slate-600">Nombre</th>
                    <th className="text-center p-3 font-medium text-slate-600">Tipo</th>
                    <th className="text-right p-3 font-medium text-slate-600">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a: any) => (
                    <tr key={a.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-mono font-medium">{a.code}</td>
                      <td className="p-3">{a.name}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${accountTypeColors[a.type] || ""}`}>{accountTypeLabels[a.type] || a.type}</span></td>
                      <td className="p-3 text-right font-semibold">{parseFloat(a.balance || "0").toLocaleString("es-ES", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Nuevo Asiento</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Asiento Contable</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createEntryMutation.mutate({ description: fd.get("description"), type: fd.get("type"), date: new Date().toISOString(), totalDebit: fd.get("amount"), totalCredit: fd.get("amount"), status: "posted" }); }} className="space-y-4">
                  <div><Label>Descripcion *</Label><Input name="description" required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Tipo</Label>
                      <select name="type" className="w-full border rounded-md p-2 text-sm">
                        <option value="invoice">Factura</option><option value="payment">Cobro/Pago</option><option value="purchase">Compra</option><option value="adjustment">Ajuste</option>
                      </select>
                    </div>
                    <div><Label>Importe *</Label><Input name="amount" type="number" step="0.01" required /></div>
                  </div>
                  <Button type="submit" className="w-full">Crear Asiento</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="entries-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-600">N. Asiento</th>
                    <th className="text-left p-3 font-medium text-slate-600">Fecha</th>
                    <th className="text-left p-3 font-medium text-slate-600">Descripcion</th>
                    <th className="text-center p-3 font-medium text-slate-600">Tipo</th>
                    <th className="text-right p-3 font-medium text-slate-600">Debe</th>
                    <th className="text-right p-3 font-medium text-slate-600">Haber</th>
                    <th className="text-center p-3 font-medium text-slate-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No hay asientos contables</td></tr>
                  ) : entries.map((e: any) => (
                    <tr key={e.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-mono">{e.entryNumber}</td>
                      <td className="p-3">{e.date ? new Date(e.date).toLocaleDateString("es-ES") : "-"}</td>
                      <td className="p-3">{e.description}</td>
                      <td className="p-3 text-center"><Badge variant="outline">{e.type}</Badge></td>
                      <td className="p-3 text-right">{parseFloat(e.totalDebit || "0").toLocaleString("es-ES", { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right">{parseFloat(e.totalCredit || "0").toLocaleString("es-ES", { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center"><Badge variant={e.status === "posted" ? "default" : "outline"}>{e.status === "posted" ? "Contabilizado" : "Borrador"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Ejercicio</th>
                    <th className="text-left p-3 font-medium">Inicio</th>
                    <th className="text-left p-3 font-medium">Fin</th>
                    <th className="text-center p-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {fiscalYears.map((fy: any) => (
                    <tr key={fy.id} className="border-t">
                      <td className="p-3 font-medium">{fy.name}</td>
                      <td className="p-3">{new Date(fy.startDate).toLocaleDateString("es-ES")}</td>
                      <td className="p-3">{new Date(fy.endDate).toLocaleDateString("es-ES")}</td>
                      <td className="p-3 text-center">
                        <Badge variant={fy.isClosed ? "secondary" : "default"}>{fy.isClosed ? "Cerrado" : "Abierto"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
