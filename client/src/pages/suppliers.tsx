import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AddSupplierModal from "@/components/add-supplier-modal";
import EditSupplierModal from "@/components/edit-supplier-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Truck, Edit, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Supplier } from "@shared/schema";

export default function Suppliers() {
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
  
  // Filter suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim() || suppliers.length === 0) return suppliers;
    
    const query = searchQuery.toLowerCase().trim();
    return suppliers.filter(supplier => {
      const nameMatch = supplier.name && supplier.name.toLowerCase().includes(query);
      const emailMatch = supplier.contactEmail && supplier.contactEmail.toLowerCase().includes(query);
      const phoneMatch = supplier.contactPhone && supplier.contactPhone.toLowerCase().includes(query);
      const addressMatch = supplier.address && supplier.address.toLowerCase().includes(query);
      
      return nameMatch || emailMatch || phoneMatch || addressMatch;
    });
  }, [suppliers, searchQuery]);



  const deleteMutation = useMutation({
    mutationFn: async (supplierId: number) => {
      return await apiRequest("DELETE", `/api/suppliers/${supplierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el proveedor.",
        variant: "destructive",
      });
    },
  });

  const getReliabilityBadge = (reliability: string | null) => {
    if (!reliability) return { variant: "secondary", label: "N/A" };
    const reliabilityNum = parseFloat(reliability);
    if (reliabilityNum >= 98) return { label: "Excelente", variant: "default" };
    if (reliabilityNum >= 95) return { label: "Buena", variant: "secondary" };
    if (reliabilityNum >= 90) return { label: "Regular", variant: "outline" };
    return { label: "Baja", variant: "destructive" };
  };

  if (suppliersLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Truck className="h-5 w-5" />
          <div>
            <h1 className="text-2xl font-bold">Proveedores</h1>
            <p className="text-slate-600">
              {searchQuery.trim() 
                ? `${filteredSuppliers.length} proveedor${filteredSuppliers.length !== 1 ? 'es' : ''} encontrado${filteredSuppliers.length !== 1 ? 's' : ''}`
                : "Gestión de proveedores"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar proveedores..."
              className="w-80 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            {searchQuery && (
              <span className="absolute right-3 top-3 text-xs text-slate-500">
                {filteredSuppliers.length}
              </span>
            )}
          </div>
          <Button onClick={() => setShowAddSupplier(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Proveedor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.length > 0 
                ? Math.round(suppliers.reduce((acc, s) => acc + s.leadTimeDays, 0) / suppliers.length)
                : 0} días
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Fiabilidad</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter(s => s.reliability ? parseFloat(s.reliability) >= 98 : false).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrega Rápida</CardTitle>
            <div className="h-4 w-4 rounded-full bg-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter(s => s.leadTimeDays <= 5).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Proveedores</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar proveedores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay proveedores</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? "No se encontraron proveedores con ese criterio." : "Comienza añadiendo tu primer proveedor."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Tiempo Entrega</TableHead>
                    <TableHead>Fiabilidad</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.contactEmail && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="h-3 w-3 mr-1" />
                              {supplier.contactEmail}
                            </div>
                          )}
                          {supplier.contactPhone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-3 w-3 mr-1" />
                              {supplier.contactPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.address && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            {supplier.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{supplier.leadTimeDays} días</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{supplier.reliability || "N/A"}%</div>
                          <Badge variant={getReliabilityBadge(supplier.reliability).variant as any}>
                            {getReliabilityBadge(supplier.reliability).label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingSupplier(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El proveedor "{supplier.name}" será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(supplier.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddSupplierModal 
        open={showAddSupplier} 
        onOpenChange={setShowAddSupplier} 
      />
      
      {editingSupplier && (
        <EditSupplierModal
          supplier={editingSupplier}
          open={!!editingSupplier}
          onOpenChange={(open) => !open && setEditingSupplier(null)}
        />
      )}
    </div>
  );
}