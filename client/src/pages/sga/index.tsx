import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, MapPin, ClipboardList, Truck, Plus, Play, CheckCircle, Clock, AlertTriangle, Box, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const pickStatusColors: Record<string, string> = { pending: "bg-gray-100 text-gray-700", assigned: "bg-blue-100 text-blue-700", in_progress: "bg-yellow-100 text-yellow-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
const pickStatusLabels: Record<string, string> = { pending: "Pendiente", assigned: "Asignado", in_progress: "En curso", completed: "Completado", cancelled: "Cancelado" };
const priorityColors: Record<string, string> = { urgent: "bg-red-600", high: "bg-orange-500", normal: "bg-blue-500", low: "bg-gray-400" };
const priorityLabels: Record<string, string> = { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baja" };
const packStatusLabels: Record<string, string> = { pending: "Pendiente", in_progress: "Embalando", completed: "Completado", shipped: "Enviado" };
const recStatusLabels: Record<string, string> = { pending: "Esperando", in_progress: "Recibiendo", completed: "Recibido", partial: "Parcial" };

function safeFetch(url: string) {
  return async () => { const r = await fetch(url, { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; };
}

export default function SgaPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showPick, setShowPick] = useState(false);
  const [showRec, setShowRec] = useState(false);

  const { data: dashboard } = useQuery({ queryKey: ["/api/sga/dashboard"], queryFn: async () => { const r = await fetch("/api/sga/dashboard", { credentials: "include" }); return r.ok ? r.json() : {}; } });
  const { data: picking = [] } = useQuery({ queryKey: ["/api/sga/picking"], queryFn: safeFetch("/api/sga/picking") });
  const { data: packing = [] } = useQuery({ queryKey: ["/api/sga/packing"], queryFn: safeFetch("/api/sga/packing") });
  const { data: receiving = [] } = useQuery({ queryKey: ["/api/sga/receiving"], queryFn: safeFetch("/api/sga/receiving") });
  const { data: locations = [] } = useQuery({ queryKey: ["/api/sga/locations"], queryFn: safeFetch("/api/sga/locations") });

  const updatePick = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await fetch(`/api/sga/picking/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sga/picking"] }); qc.invalidateQueries({ queryKey: ["/api/sga/dashboard"] }); toast({ title: "Picking actualizado" }); },
  });

  const updatePack = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await fetch(`/api/sga/packing/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sga/packing"] }); toast({ title: "Packing actualizado" }); },
  });

  const updateRec = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await fetch(`/api/sga/receiving/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sga/receiving"] }); toast({ title: "Recepcion actualizada" }); },
  });

  const createPick = useMutation({
    mutationFn: async (data: any) => { const r = await fetch("/api/sga/picking", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sga/picking"] }); setShowPick(false); toast({ title: "Orden de picking creada" }); },
  });

  const createRec = useMutation({
    mutationFn: async (data: any) => { const r = await fetch("/api/sga/receiving", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sga/receiving"] }); setShowRec(false); toast({ title: "Orden de recepcion creada" }); },
  });

  const d = dashboard || {};

  return (
    <div className="p-6 space-y-6" data-testid="sga-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SGA - Gestion de Almacen</h1>
          <p className="text-slate-500">Picking, packing, recepcion y ubicaciones</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-500" /><span className="text-xs text-slate-500">Ubicaciones</span></div>
          <div className="text-2xl font-bold">{d.locations || 0}</div>
        </CardContent></Card>
        <Card className={d.pickingPending > 0 ? "border-yellow-300" : ""}><CardContent className="pt-4">
          <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-yellow-500" /><span className="text-xs text-slate-500">Picking pendiente</span></div>
          <div className="text-2xl font-bold text-yellow-700">{d.pickingPending || 0}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Play className="h-4 w-4 text-orange-500" /><span className="text-xs text-slate-500">Picking en curso</span></div>
          <div className="text-2xl font-bold text-orange-700">{d.pickingInProgress || 0}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2"><Box className="h-4 w-4 text-indigo-500" /><span className="text-xs text-slate-500">Packing pendiente</span></div>
          <div className="text-2xl font-bold text-indigo-700">{d.packingPending || 0}</div>
        </CardContent></Card>
        <Card className={d.receivingPending > 0 ? "border-green-300" : ""}><CardContent className="pt-4">
          <div className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-green-500" /><span className="text-xs text-slate-500">Recepciones pend.</span></div>
          <div className="text-2xl font-bold text-green-700">{d.receivingPending || 0}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="picking">
        <TabsList>
          <TabsTrigger value="picking">Picking ({picking.length})</TabsTrigger>
          <TabsTrigger value="packing">Packing ({packing.length})</TabsTrigger>
          <TabsTrigger value="receiving">Recepcion ({receiving.length})</TabsTrigger>
          <TabsTrigger value="locations">Ubicaciones ({locations.length})</TabsTrigger>
        </TabsList>

        {/* PICKING TAB */}
        <TabsContent value="picking" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showPick} onOpenChange={setShowPick}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Nueva orden</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva Orden de Picking</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createPick.mutate({ priority: fd.get("priority"), totalItems: parseInt(fd.get("totalItems") as string) || 0, notes: fd.get("notes") }); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Prioridad</Label><select name="priority" className="w-full border rounded-md p-2 text-sm"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baja</option></select></div>
                    <div><Label>N. items</Label><Input name="totalItems" type="number" defaultValue={1} /></div>
                  </div>
                  <div><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
                  <Button type="submit" className="w-full">Crear</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {picking.length === 0 ? <Card><CardContent className="pt-6 text-center text-slate-400">No hay ordenes de picking</CardContent></Card> :
            picking.map((p: any) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow" data-testid={`picking-card-${p.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-12 rounded-full ${priorityColors[p.priority] || "bg-gray-300"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">{p.pickingNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pickStatusColors[p.status]}`}>{pickStatusLabels[p.status]}</span>
                          <Badge variant="outline" className="text-xs">{priorityLabels[p.priority]}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{p.notes || "Sin notas"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">{p.pickedItems || 0}/{p.totalItems || 0}</div>
                        <div className="text-xs text-slate-500">items</div>
                        <Progress value={p.totalItems > 0 ? ((p.pickedItems || 0) / p.totalItems) * 100 : 0} className="h-1.5 w-20 mt-1" />
                      </div>
                      <div className="flex gap-1">
                        {p.status === "pending" && <Button size="sm" onClick={() => updatePick.mutate({ id: p.id, data: { status: "in_progress", startedAt: new Date().toISOString() } })}><Play className="h-3.5 w-3.5 mr-1" />Iniciar</Button>}
                        {p.status === "in_progress" && <Button size="sm" variant="default" onClick={() => updatePick.mutate({ id: p.id, data: { status: "completed", pickedItems: p.totalItems, completedAt: new Date().toISOString() } })}><CheckCircle className="h-3.5 w-3.5 mr-1" />Completar</Button>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PACKING TAB */}
        <TabsContent value="packing" className="space-y-4">
          <div className="space-y-3">
            {packing.length === 0 ? <Card><CardContent className="pt-6 text-center text-slate-400">No hay ordenes de packing</CardContent></Card> :
            packing.map((p: any) => (
              <Card key={p.id} data-testid={`packing-card-${p.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{p.packingNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pickStatusColors[p.status]}`}>{packStatusLabels[p.status]}</span>
                        {p.packageType && <Badge variant="outline">{p.packageType}</Badge>}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {p.weight && `${p.weight} kg`} {p.dimensions && `| ${p.dimensions} cm`}
                        {p.trackingNumber && ` | Tracking: ${p.trackingNumber}`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {p.status === "pending" && <Button size="sm" onClick={() => updatePack.mutate({ id: p.id, data: { status: "in_progress" } })}><Play className="h-3.5 w-3.5 mr-1" />Embalar</Button>}
                      {p.status === "in_progress" && <Button size="sm" onClick={() => updatePack.mutate({ id: p.id, data: { status: "completed", completedAt: new Date().toISOString() } })}><CheckCircle className="h-3.5 w-3.5 mr-1" />Listo</Button>}
                      {p.status === "completed" && <Button size="sm" variant="outline" onClick={() => updatePack.mutate({ id: p.id, data: { status: "shipped" } })}><Truck className="h-3.5 w-3.5 mr-1" />Enviar</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* RECEIVING TAB */}
        <TabsContent value="receiving" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showRec} onOpenChange={setShowRec}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Nueva recepcion</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva Recepcion</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createRec.mutate({ supplierName: fd.get("supplierName"), expectedDate: fd.get("expectedDate") ? new Date(fd.get("expectedDate") as string).toISOString() : undefined, dockNumber: fd.get("dockNumber"), totalExpected: parseInt(fd.get("totalExpected") as string) || 0, notes: fd.get("notes") }); }} className="space-y-4">
                  <div><Label>Proveedor *</Label><Input name="supplierName" required /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Fecha prevista</Label><Input name="expectedDate" type="date" /></div>
                    <div><Label>Muelle</Label><Input name="dockNumber" placeholder="DOCK-01" /></div>
                    <div><Label>Items esperados</Label><Input name="totalExpected" type="number" defaultValue={1} /></div>
                  </div>
                  <div><Label>Notas</Label><Textarea name="notes" rows={2} /></div>
                  <Button type="submit" className="w-full">Crear</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {receiving.length === 0 ? <Card><CardContent className="pt-6 text-center text-slate-400">No hay recepciones</CardContent></Card> :
            receiving.map((r: any) => (
              <Card key={r.id} data-testid={`receiving-card-${r.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{r.receivingNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pickStatusColors[r.status]}`}>{recStatusLabels[r.status]}</span>
                      </div>
                      <div className="text-sm mt-1">{r.supplierName}</div>
                      <div className="text-xs text-slate-500">
                        {r.dockNumber && `Muelle: ${r.dockNumber} | `}
                        Recibido: {r.totalReceived || 0}/{r.totalExpected || 0} items
                        {r.expectedDate && ` | Previsto: ${new Date(r.expectedDate).toLocaleDateString("es-ES")}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={r.totalExpected > 0 ? ((r.totalReceived || 0) / r.totalExpected) * 100 : 0} className="h-2 w-24" />
                      <div className="flex gap-1">
                        {r.status === "pending" && <Button size="sm" onClick={() => updateRec.mutate({ id: r.id, data: { status: "in_progress" } })}><Play className="h-3.5 w-3.5 mr-1" />Recibir</Button>}
                        {r.status === "in_progress" && <Button size="sm" onClick={() => updateRec.mutate({ id: r.id, data: { status: "completed", totalReceived: r.totalExpected, receivedDate: new Date().toISOString() } })}><CheckCircle className="h-3.5 w-3.5 mr-1" />Completar</Button>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* LOCATIONS TAB */}
        <TabsContent value="locations">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="locations-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Codigo</th>
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-center p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Pasillo</th>
                    <th className="text-left p-3 font-medium">Estanteria</th>
                    <th className="text-left p-3 font-medium">Nivel</th>
                    <th className="text-center p-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.slice(0, 30).map((l: any) => (
                    <tr key={l.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-mono font-medium text-xs">{l.code}</td>
                      <td className="p-3 text-sm">{l.name || "-"}</td>
                      <td className="p-3 text-center"><Badge variant="outline">{l.type}</Badge></td>
                      <td className="p-3">{l.aisle || "-"}</td>
                      <td className="p-3">{l.rack || "-"}</td>
                      <td className="p-3">{l.level || "-"}</td>
                      <td className="p-3 text-center">{l.isActive ? <Badge className="bg-green-100 text-green-700">Activa</Badge> : <Badge variant="outline">Inactiva</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {locations.length > 30 && <div className="p-3 text-center text-xs text-slate-400">Mostrando 30 de {locations.length} ubicaciones</div>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
