import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Phone, Mail, Calendar, Target, Trash2, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const stageColors: Record<string, string> = {
  lead: "bg-gray-100 text-gray-700", qualified: "bg-blue-100 text-blue-700",
  proposal: "bg-indigo-100 text-indigo-700", negotiation: "bg-yellow-100 text-yellow-700",
  won: "bg-green-100 text-green-700", lost: "bg-red-100 text-red-700",
};
const stageLabels: Record<string, string> = {
  lead: "Lead", qualified: "Cualificado", proposal: "Propuesta",
  negotiation: "Negociacion", won: "Ganado", lost: "Perdido",
};
const activityIcons: Record<string, any> = {
  call: Phone, email: Mail, meeting: Calendar, task: Target, note: CheckCircle,
};

export default function CrmPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeal, setShowDeal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const { data: deals = [] } = useQuery({
    queryKey: ["/api/erp/crm/deals"],
    queryFn: async () => { const r = await fetch("/api/erp/crm/deals", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; },
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["/api/erp/crm/activities"],
    queryFn: async () => { const r = await fetch("/api/erp/crm/activities", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/erp/crm/deals", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/crm/deals"] }); setShowDeal(false); toast({ title: "Oportunidad creada" }); },
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await fetch(`/api/erp/crm/deals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/crm/deals"] }); toast({ title: "Oportunidad actualizada" }); },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/erp/crm/activities", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/crm/activities"] }); setShowActivity(false); toast({ title: "Actividad creada" }); },
  });

  const pipelineValue = deals.filter((d: any) => !["won", "lost"].includes(d.stage)).reduce((s: number, d: any) => s + parseFloat(d.value || "0"), 0);
  const wonValue = deals.filter((d: any) => d.stage === "won").reduce((s: number, d: any) => s + parseFloat(d.value || "0"), 0);
  const stages = ["lead", "qualified", "proposal", "negotiation"];

  return (
    <div className="p-6 space-y-6" data-testid="crm-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="text-slate-500">Gestion de relaciones con clientes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showActivity} onOpenChange={setShowActivity}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="mr-2 h-4 w-4" />Actividad</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva Actividad</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createActivityMutation.mutate({ type: fd.get("type"), subject: fd.get("subject"), description: fd.get("description"), priority: fd.get("priority"), dueDate: fd.get("dueDate") ? new Date(fd.get("dueDate") as string).toISOString() : undefined }); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <select name="type" className="w-full border rounded-md p-2 text-sm">
                      <option value="call">Llamada</option><option value="email">Email</option><option value="meeting">Reunion</option><option value="task">Tarea</option><option value="note">Nota</option>
                    </select>
                  </div>
                  <div><Label>Prioridad</Label>
                    <select name="priority" className="w-full border rounded-md p-2 text-sm">
                      <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option>
                    </select>
                  </div>
                </div>
                <div><Label>Asunto *</Label><Input name="subject" required /></div>
                <div><Label>Fecha limite</Label><Input name="dueDate" type="date" /></div>
                <div><Label>Descripcion</Label><Textarea name="description" rows={2} /></div>
                <Button type="submit" className="w-full">Crear Actividad</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={showDeal} onOpenChange={setShowDeal}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Oportunidad</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva Oportunidad</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createDealMutation.mutate({ title: fd.get("title"), value: fd.get("value"), stage: fd.get("stage"), probability: parseInt(fd.get("probability") as string) || 0, expectedCloseDate: fd.get("closeDate") ? new Date(fd.get("closeDate") as string).toISOString() : undefined, notes: fd.get("notes") }); }} className="space-y-4">
                <div><Label>Titulo *</Label><Input name="title" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (EUR)</Label><Input name="value" type="number" step="0.01" /></div>
                  <div><Label>Probabilidad (%)</Label><Input name="probability" type="number" min="0" max="100" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Etapa</Label>
                    <select name="stage" className="w-full border rounded-md p-2 text-sm">
                      <option value="lead">Lead</option><option value="qualified">Cualificado</option><option value="proposal">Propuesta</option><option value="negotiation">Negociacion</option>
                    </select>
                  </div>
                  <div><Label>Cierre previsto</Label><Input name="closeDate" type="date" /></div>
                </div>
                <div><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
                <Button type="submit" className="w-full">Crear Oportunidad</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Pipeline Activo</div>
          <div className="text-2xl font-bold text-indigo-700">{pipelineValue.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
          <div className="text-xs text-slate-400">{deals.filter((d: any) => !["won", "lost"].includes(d.stage)).length} oportunidades</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-green-600">Ganadas</div>
          <div className="text-2xl font-bold text-green-700">{wonValue.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
          <div className="text-xs text-slate-400">{deals.filter((d: any) => d.stage === "won").length} cerradas</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Actividades Pendientes</div>
          <div className="text-2xl font-bold">{activities.filter((a: any) => a.status === "pending").length}</div>
          <div className="text-xs text-slate-400">de {activities.length} totales</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="deals">Oportunidades ({deals.length})</TabsTrigger>
          <TabsTrigger value="activities">Actividades ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stages.map((stage) => {
              const stageDeals = deals.filter((d: any) => d.stage === stage);
              const stageTotal = stageDeals.reduce((s: number, d: any) => s + parseFloat(d.value || "0"), 0);
              return (
                <Card key={stage}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors[stage]}`}>{stageLabels[stage]}</span>
                      <span className="text-xs text-slate-400">{stageDeals.length}</span>
                    </div>
                    <div className="text-sm font-semibold mb-3">{stageTotal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
                    <div className="space-y-2">
                      {stageDeals.map((d: any) => (
                        <div key={d.id} className="p-2 bg-slate-50 rounded-lg text-xs cursor-pointer hover:bg-slate-100" data-testid={`deal-card-${d.id}`}>
                          <div className="font-medium truncate">{d.title}</div>
                          <div className="text-slate-500">{parseFloat(d.value || "0").toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
                          <div className="text-slate-400">{d.probability}% probabilidad</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="deals-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Oportunidad</th>
                    <th className="text-right p-3 font-medium">Valor</th>
                    <th className="text-center p-3 font-medium">Etapa</th>
                    <th className="text-center p-3 font-medium">Prob.</th>
                    <th className="text-left p-3 font-medium">Cierre prev.</th>
                    <th className="text-center p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d: any) => (
                    <tr key={d.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-medium">{d.title}</td>
                      <td className="p-3 text-right font-semibold">{parseFloat(d.value || "0").toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors[d.stage]}`}>{stageLabels[d.stage] || d.stage}</span></td>
                      <td className="p-3 text-center">{d.probability}%</td>
                      <td className="p-3">{d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString("es-ES") : "-"}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {d.stage !== "won" && d.stage !== "lost" && (
                            <Button size="sm" variant="ghost" onClick={() => updateDealMutation.mutate({ id: d.id, data: { stage: "won", probability: 100, closedDate: new Date().toISOString() } })}>
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="activities-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Asunto</th>
                    <th className="text-center p-3 font-medium">Prioridad</th>
                    <th className="text-left p-3 font-medium">Fecha</th>
                    <th className="text-center p-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a: any) => {
                    const Icon = activityIcons[a.type] || CheckCircle;
                    return (
                      <tr key={a.id} className="border-t hover:bg-slate-50">
                        <td className="p-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-400" />{a.type}</div></td>
                        <td className="p-3">{a.subject}</td>
                        <td className="p-3 text-center">
                          <Badge variant={a.priority === "high" ? "destructive" : "outline"}>{a.priority === "high" ? "Alta" : a.priority === "medium" ? "Media" : "Baja"}</Badge>
                        </td>
                        <td className="p-3">{a.dueDate ? new Date(a.dueDate).toLocaleDateString("es-ES") : a.completedDate ? new Date(a.completedDate).toLocaleDateString("es-ES") : "-"}</td>
                        <td className="p-3 text-center">
                          <Badge variant={a.status === "completed" ? "default" : "outline"}>{a.status === "completed" ? "Completada" : "Pendiente"}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
