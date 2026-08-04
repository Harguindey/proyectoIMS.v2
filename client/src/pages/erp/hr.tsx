import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Building, Briefcase, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const contractLabels: Record<string, string> = {
  indefinido: "Indefinido", temporal: "Temporal", practicas: "Practicas", formacion: "Formacion",
};
const statusLabels: Record<string, string> = {
  active: "Activo", on_leave: "Baja", terminated: "Finalizado",
};
const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700", on_leave: "bg-yellow-100 text-yellow-700", terminated: "bg-red-100 text-red-700",
};

export default function HrPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEmployee, setShowEmployee] = useState(false);
  const [showDept, setShowDept] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/erp/employees"],
    queryFn: async () => { const r = await fetch("/api/erp/employees", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; },
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["/api/erp/departments"],
    queryFn: async () => { const r = await fetch("/api/erp/departments", { credentials: "include" }); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : []; },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/erp/employees", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Error");
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/employees"] }); setShowEmployee(false); toast({ title: "Empleado creado" }); },
  });

  const createDeptMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/erp/departments", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Error");
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/departments"] }); setShowDept(false); toast({ title: "Departamento creado" }); },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/erp/employees/${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/erp/employees"] }); toast({ title: "Empleado eliminado" }); },
  });

  const activeCount = employees.filter((e: any) => e.status === "active").length;
  const totalSalary = employees.filter((e: any) => e.status === "active").reduce((s: number, e: any) => s + parseFloat(e.salary || "0"), 0);

  return (
    <div className="p-6 space-y-6" data-testid="hr-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recursos Humanos</h1>
          <p className="text-slate-500">Gestion de empleados, departamentos y contratos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showDept} onOpenChange={setShowDept}>
            <DialogTrigger asChild><Button variant="outline"><Building className="mr-2 h-4 w-4" />Departamento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo Departamento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createDeptMutation.mutate({ name: fd.get("name"), code: fd.get("code"), description: fd.get("description") }); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre *</Label><Input name="name" required /></div>
                  <div><Label>Codigo *</Label><Input name="code" required placeholder="DIR" /></div>
                </div>
                <div><Label>Descripcion</Label><Textarea name="description" rows={2} /></div>
                <Button type="submit" className="w-full">Crear Departamento</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={showEmployee} onOpenChange={setShowEmployee}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Empleado</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nuevo Empleado</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createEmployeeMutation.mutate({ employeeCode: fd.get("employeeCode"), firstName: fd.get("firstName"), lastName: fd.get("lastName"), email: fd.get("email"), phone: fd.get("phone"), taxId: fd.get("taxId"), departmentId: fd.get("departmentId") ? parseInt(fd.get("departmentId") as string) : undefined, position: fd.get("position"), contractType: fd.get("contractType"), salary: fd.get("salary"), startDate: fd.get("startDate") ? new Date(fd.get("startDate") as string).toISOString() : undefined }); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Codigo *</Label><Input name="employeeCode" required placeholder="EMP-009" /></div>
                  <div><Label>DNI/NIE</Label><Input name="taxId" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre *</Label><Input name="firstName" required /></div>
                  <div><Label>Apellidos *</Label><Input name="lastName" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input name="email" type="email" /></div>
                  <div><Label>Telefono</Label><Input name="phone" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Departamento</Label>
                    <select name="departmentId" className="w-full border rounded-md p-2 text-sm">
                      <option value="">Sin departamento</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><Label>Puesto</Label><Input name="position" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Contrato</Label>
                    <select name="contractType" className="w-full border rounded-md p-2 text-sm">
                      <option value="indefinido">Indefinido</option><option value="temporal">Temporal</option><option value="practicas">Practicas</option><option value="formacion">Formacion</option>
                    </select>
                  </div>
                  <div><Label>Salario anual</Label><Input name="salary" type="number" step="0.01" /></div>
                  <div><Label>Fecha inicio</Label><Input name="startDate" type="date" /></div>
                </div>
                <Button type="submit" className="w-full" disabled={createEmployeeMutation.isPending}>{createEmployeeMutation.isPending ? "Creando..." : "Crear Empleado"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Empleados Activos</div>
          <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
          <div className="text-xs text-slate-400">de {employees.length} totales</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Departamentos</div>
          <div className="text-2xl font-bold">{departments.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Masa Salarial Anual</div>
          <div className="text-2xl font-bold text-indigo-700">{totalSalary.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-slate-500">Salario Medio</div>
          <div className="text-2xl font-bold">{activeCount > 0 ? (totalSalary / activeCount).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "0"}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Empleados ({employees.length})</TabsTrigger>
          <TabsTrigger value="departments">Departamentos ({departments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="employees-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Codigo</th>
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Puesto</th>
                    <th className="text-left p-3 font-medium">Departamento</th>
                    <th className="text-center p-3 font-medium">Contrato</th>
                    <th className="text-right p-3 font-medium">Salario</th>
                    <th className="text-center p-3 font-medium">Estado</th>
                    <th className="text-center p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-slate-400">No hay empleados</td></tr>
                  ) : employees.map((e: any) => {
                    const dept = departments.find((d: any) => d.id === e.departmentId);
                    return (
                      <tr key={e.id} className="border-t hover:bg-slate-50" data-testid={`employee-row-${e.id}`}>
                        <td className="p-3 font-mono">{e.employeeCode}</td>
                        <td className="p-3 font-medium">{e.firstName} {e.lastName}</td>
                        <td className="p-3 text-slate-500">{e.email || "-"}</td>
                        <td className="p-3">{e.position || "-"}</td>
                        <td className="p-3">{dept?.name || "-"}</td>
                        <td className="p-3 text-center"><Badge variant="outline">{contractLabels[e.contractType] || e.contractType || "-"}</Badge></td>
                        <td className="p-3 text-right">{e.salary ? parseFloat(e.salary).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "-"}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[e.status] || ""}`}>{statusLabels[e.status] || e.status}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Button size="sm" variant="ghost" onClick={() => deleteEmployeeMutation.mutate(e.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departments.map((d: any) => {
              const deptEmployees = employees.filter((e: any) => e.departmentId === d.id);
              return (
                <Card key={d.id} data-testid={`dept-card-${d.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Building className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-semibold">{d.name}</div>
                        <div className="text-xs text-slate-500">{d.code}</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{d.description || "Sin descripcion"}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{deptEmployees.length} empleados</span>
                      <Badge variant="outline">{deptEmployees.filter((e: any) => e.status === "active").length} activos</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
