import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle, Send, FileText, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const alertConfig: Record<string, { label: string; color: string; bgColor: string; icon: any; desc: string }> = {
  overdue: { label: "Vencida", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: XCircle, desc: "Plazo SII superado" },
  urgent: { label: "Urgente", color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200", icon: AlertTriangle, desc: "Vence hoy o manana" },
  warning: { label: "Atencion", color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200", icon: Clock, desc: "Vence en 2-3 dias" },
  pending: { label: "Pendiente", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: Timer, desc: "Dentro de plazo" },
  draft: { label: "Borrador", color: "text-gray-500", bgColor: "bg-gray-50 border-gray-200", icon: FileText, desc: "No emitida" },
  submitted: { label: "Presentada", color: "text-green-700", bgColor: "bg-green-50 border-green-200", icon: CheckCircle, desc: "Aceptada por AEAT" },
};

export default function FiscalCompliancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/erp/fiscal-compliance"],
    queryFn: async () => {
      const r = await fetch("/api/erp/fiscal-compliance", { credentials: "include" });
      if (!r.ok) return { stats: { total: 0, submitted: 0, drafts: 0, overdue: 0, urgent: 0, warning: 0, pending: 0, complianceRate: 100 }, invoices: [] };
      return r.json();
    },
    refetchInterval: 30000,
  });

  const bulkSubmitMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const r = await fetch("/api/erp/fiscal-compliance/bulk-submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ invoiceIds: ids }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp/fiscal-compliance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/erp/invoices"] });
      setSelected([]);
      toast({ title: "Presentacion SII completada", description: data.message });
    },
  });

  const stats = data?.stats || { total: 0, submitted: 0, drafts: 0, overdue: 0, urgent: 0, warning: 0, pending: 0, complianceRate: 100 };
  const invoices = data?.invoices || [];

  const filtered = invoices.filter((inv: any) => {
    if (filter === "all") return true;
    if (filter === "action") return ["overdue", "urgent", "warning", "pending"].includes(inv.alertLevel);
    return inv.alertLevel === filter;
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAllActionable = () => {
    const actionable = filtered.filter((inv: any) => ["overdue", "urgent", "warning", "pending"].includes(inv.alertLevel)).map((inv: any) => inv.id);
    setSelected(actionable);
  };

  const alertCounts = [
    { key: "overdue", count: stats.overdue },
    { key: "urgent", count: stats.urgent },
    { key: "warning", count: stats.warning },
    { key: "pending", count: stats.pending },
  ].filter((a) => a.count > 0);

  return (
    <div className="p-6 space-y-6" data-testid="fiscal-compliance-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cumplimiento Fiscal</h1>
          <p className="text-slate-500">Control de presentacion SII ante la AEAT - Plazo: 4 dias habiles</p>
        </div>
        {selected.length > 0 && (
          <Button onClick={() => bulkSubmitMutation.mutate(selected)} disabled={bulkSubmitMutation.isPending} data-testid="bulk-submit-btn">
            <Send className="mr-2 h-4 w-4" />
            Presentar {selected.length} al SII
          </Button>
        )}
      </div>

      {/* Compliance Meter */}
      <Card className="border-2 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stats.complianceRate >= 90 ? "bg-green-100" : stats.complianceRate >= 60 ? "bg-yellow-100" : "bg-red-100"}`}>
                <Shield className={`h-7 w-7 ${stats.complianceRate >= 90 ? "text-green-600" : stats.complianceRate >= 60 ? "text-yellow-600" : "text-red-600"}`} />
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.complianceRate}%</div>
                <div className="text-sm text-slate-500">Tasa de cumplimiento SII</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">{stats.submitted} de {stats.total - stats.drafts} facturas presentadas</div>
              <div className="text-xs text-slate-400">{stats.drafts} borradores excluidos</div>
            </div>
          </div>
          <Progress value={stats.complianceRate} className="h-3" />
        </CardContent>
      </Card>

      {/* Alert Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: "overdue", icon: XCircle, label: "Vencidas", count: stats.overdue, color: "text-red-600", bg: "bg-red-50" },
          { key: "urgent", icon: AlertTriangle, label: "Urgentes", count: stats.urgent, color: "text-orange-600", bg: "bg-orange-50" },
          { key: "warning", icon: Clock, label: "Atencion", count: stats.warning, color: "text-yellow-600", bg: "bg-yellow-50" },
          { key: "pending", icon: Timer, label: "Pendientes", count: stats.pending, color: "text-blue-600", bg: "bg-blue-50" },
          { key: "submitted", icon: CheckCircle, label: "Presentadas", count: stats.submitted, color: "text-green-600", bg: "bg-green-50" },
        ].map(({ key, icon: Icon, label, count, color, bg }) => (
          <Card key={key} className={`cursor-pointer transition-all ${filter === key ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
            onClick={() => setFilter(filter === key ? "all" : key)} data-testid={`filter-card-${key}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs font-medium text-slate-500">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${color}`}>{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      {(stats.overdue > 0 || stats.urgent > 0) && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-semibold text-red-800">
                  {stats.overdue > 0 && `${stats.overdue} factura(s) con plazo SII vencido. `}
                  {stats.urgent > 0 && `${stats.urgent} factura(s) vencen hoy/manana.`}
                </div>
                <div className="text-sm text-red-600">Riesgo de sancion de la AEAT por presentacion tardia.</div>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={selectAllActionable} data-testid="select-all-urgent">
              Seleccionar todas para presentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Todas ({stats.total})</Button>
        <Button variant={filter === "action" ? "default" : "outline"} size="sm" onClick={() => setFilter("action")}>Requieren accion ({stats.overdue + stats.urgent + stats.warning + stats.pending})</Button>
      </div>

      {/* Invoice List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="compliance-table">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 w-10"><Checkbox checked={selected.length > 0 && selected.length === filtered.filter((i: any) => !i.siiSubmitted && i.alertLevel !== "draft").length} onCheckedChange={() => selected.length > 0 ? setSelected([]) : selectAllActionable()} /></th>
                <th className="text-left p-3 font-medium text-slate-600">Alerta</th>
                <th className="text-left p-3 font-medium text-slate-600">Factura</th>
                <th className="text-left p-3 font-medium text-slate-600">Cliente</th>
                <th className="text-left p-3 font-medium text-slate-600">Emision</th>
                <th className="text-left p-3 font-medium text-slate-600">Limite SII</th>
                <th className="text-center p-3 font-medium text-slate-600">Dias rest.</th>
                <th className="text-right p-3 font-medium text-slate-600">Importe</th>
                <th className="text-center p-3 font-medium text-slate-600">Estado SII</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">No hay facturas en esta categoria</td></tr>
              ) : (
                filtered.map((inv: any) => {
                  const cfg = alertConfig[inv.alertLevel] || alertConfig.pending;
                  const Icon = cfg.icon;
                  const isSelectable = !inv.siiSubmitted && inv.alertLevel !== "draft";
                  return (
                    <tr key={inv.id} className={`border-t ${cfg.bgColor} hover:opacity-90`} data-testid={`compliance-row-${inv.id}`}>
                      <td className="p-3">
                        {isSelectable && <Checkbox checked={selected.includes(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3">
                        <div>{inv.customerName}</div>
                        <div className="text-xs text-slate-400">{inv.customerTaxId || ""}</div>
                      </td>
                      <td className="p-3">{new Date(inv.issueDate).toLocaleDateString("es-ES")}</td>
                      <td className="p-3">{new Date(inv.deadline).toLocaleDateString("es-ES")}</td>
                      <td className="p-3 text-center">
                        {inv.alertLevel === "submitted" ? (
                          <Badge variant="default" className="bg-green-600">OK</Badge>
                        ) : inv.alertLevel === "draft" ? (
                          <span className="text-xs text-slate-400">N/A</span>
                        ) : (
                          <span className={`font-bold ${inv.daysRemaining < 0 ? "text-red-700" : inv.daysRemaining <= 1 ? "text-orange-700" : "text-slate-700"}`}>
                            {inv.daysRemaining < 0 ? `${Math.abs(inv.daysRemaining)}d tarde` : `${inv.daysRemaining}d`}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold">{parseFloat(inv.totalAmount || "0").toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                      <td className="p-3 text-center">
                        {inv.siiSubmitted ? (
                          <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aceptada</Badge>
                        ) : inv.alertLevel === "draft" ? (
                          <Badge variant="outline">Borrador</Badge>
                        ) : (
                          <Badge variant="outline" className={cfg.color}>Pendiente</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legal Note */}
      <div className="text-xs text-slate-400 text-center space-y-1">
        <p>Plazo de presentacion SII: 4 dias habiles desde la fecha de emision (excl. fines de semana y festivos nacionales).</p>
        <p>Plazo maximo: dia 16 del mes siguiente a la emision. Art. 69bis RIVA - Real Decreto 596/2016.</p>
      </div>
    </div>
  );
}
