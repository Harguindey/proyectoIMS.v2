import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProcurementPlanSchema } from "@shared/schema";
import { TableSkeleton } from "@/components/loading/table-skeleton";
import { CardSkeleton } from "@/components/loading/card-skeleton";
import { Spinner } from "@/components/loading/spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Calculator,
  Plus,
  Search,
  Package,
  Truck
} from "lucide-react";
import { useState } from "react";
import type { Product, Supplier, ProcurementPlan, InsertProcurementPlan } from "@shared/schema";
import BulkProcurementModal from "@/components/bulk-procurement-modal";
import { z } from "zod";

const formSchema = z.object({
  productId: z.string().min(1, "Debes seleccionar un producto"),
  supplierId: z.string().optional(),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  plannedOrderDate: z.string().min(1, "La fecha de pedido es obligatoria"),
  expectedDeliveryDate: z.string().min(1, "La fecha de entrega es obligatoria"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProcurementCalculation {
  product: Product;
  supplier: Supplier | null;
  leadTimeDays: number;
  reliability: number;
  safetyStock: number;
  reorderPoint: number;
  needsReorder: boolean;
  suggestedOrderDate: string | null;
  expectedDeliveryDate: string | null;
  suggestedQuantity: number;
  currentStock: number;
  daysUntilStockout: number;
}

export default function Procurement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showBulkPlanning, setShowBulkPlanning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: procurementPlans = [] } = useQuery<ProcurementPlan[]>({
    queryKey: ["/api/procurement-plans"],
  });

  const { data: upcomingPlans = [] } = useQuery<ProcurementPlan[]>({
    queryKey: ["/api/procurement-plans/upcoming"],
  });

  const { data: needingReorder = [], error: needingReorderError } = useQuery<Product[]>({
    queryKey: ["/api/products/needing-reorder"],
    retry: false,
  });
  
  if (needingReorderError) {
    console.error('Error fetching products needing reorder:', needingReorderError);
  }

  const { data: calculation, refetch: refetchCalculation } = useQuery<ProcurementCalculation>({
    queryKey: [`/api/procurement/calculate/${selectedProductId}`],
    enabled: selectedProductId !== null,
  });

  // Function to handle calculation button clicks
  const handleCalculateForProduct = (productId: number) => {
    setSelectedProductId(productId);
    // Force refetch calculation data
    if (productId !== selectedProductId) {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/procurement/calculate/${productId}`] 
      });
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      supplierId: "",
      quantity: 1,
      notes: "",
      plannedOrderDate: "",
      expectedDeliveryDate: "",
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: InsertProcurementPlan) => {
      console.log('Sending data to API:', data);
      const response = await apiRequest("POST", "/api/procurement-plans", data);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        throw new Error(errorData);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement-plans/upcoming"] });
      toast({
        title: "Plan creado",
        description: "El plan de aprovisionamiento se ha creado correctamente.",
      });
      setShowCreatePlan(false);
      form.reset();
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el plan de aprovisionamiento: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Form data:', data);
    
    try {
      const planData: InsertProcurementPlan = {
        productId: Number(data.productId),
        supplierId: data.supplierId && data.supplierId !== "" && data.supplierId !== "none" ? Number(data.supplierId) : null,
        plannedOrderDate: new Date(data.plannedOrderDate + 'T12:00:00.000Z'),
        expectedDeliveryDate: new Date(data.expectedDeliveryDate + 'T12:00:00.000Z'),
        quantity: Number(data.quantity),
        status: "planned",
        notes: data.notes || null,
      };
      console.log('Plan data to submit:', planData);
      createPlanMutation.mutate(planData);
    } catch (error) {
      console.error('Error preparing plan data:', error);
      toast({
        title: "Error",
        description: "Error al preparar los datos del plan",
        variant: "destructive",
      });
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Producto desconocido";
  };

  const getSupplierName = (supplierId: number | null) => {
    if (!supplierId) return "Sin asignar";
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : "Proveedor desconocido";
  };

  const calculateLeadTime = (product: Product) => {
    const supplier = product.supplierId ? suppliers.find(s => s.id === product.supplierId) : null;
    return supplier?.leadTimeDays || product.leadTimeDays || 7;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (productsLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Aprovisionamiento</h2>
            <p className="text-slate-600">Planificación y cálculo de plazos de reabastecimiento</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar productos..."
                className="w-80 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            </div>
            <Button 
              variant="outline"
              onClick={() => setShowBulkPlanning(true)}
            >
              <TrendingUp size={16} className="mr-2" />
              Planificación Masiva
            </Button>
            <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Nuevo Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Plan de Aprovisionamiento</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Producto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar producto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proveedor (Opcional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar proveedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sin proveedor</SelectItem>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas (Opcional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Notas adicionales..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="plannedOrderDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Pedido</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expectedDeliveryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Entrega Estimada</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => setShowCreatePlan(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createPlanMutation.isPending}>
                        {createPlanMutation.isPending ? "Creando..." : "Crear Plan"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Necesitan Reorden</p>
                  <p className="text-2xl font-bold">{needingReorder.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Planes Próximos</p>
                  <p className="text-2xl font-bold">{upcomingPlans.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Proveedores</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-slate-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Tiempo Promedio</p>
                  <p className="text-2xl font-bold">
                    {suppliers.length > 0 
                      ? Math.round(suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length)
                      : 0
                    } días
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Needing Reorder */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-warning mr-2" />
                  Productos que Necesitan Reorden
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Punto de Reorden</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Tiempo</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needingReorder.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          {needingReorderError ? "Error al cargar productos" : "No hay productos que necesiten reorden"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      needingReorder.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{product.name || "Sin nombre"}</div>
                              <div className="text-xs text-slate-500">{product.sku || "Sin SKU"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-warning font-semibold">
                              {product.currentStock ?? 0}
                            </span>
                          </TableCell>
                          <TableCell>{product.reorderPoint || product.minStock || 0}</TableCell>
                          <TableCell>{getSupplierName(product.supplierId)}</TableCell>
                          <TableCell>{calculateLeadTime(product)} días</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleCalculateForProduct(product.id)}
                              variant={selectedProductId === product.id ? "default" : "outline"}
                            >
                              <Calculator size={14} className="mr-1" />
                              {selectedProductId === product.id ? "Calculando..." : "Calcular"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Procurement Calculator */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 text-primary mr-2" />
                  Calculadora de Aprovisionamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select onValueChange={(value) => handleCalculateForProduct(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto para calcular" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} - Stock: {product.currentStock}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedProductId && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900">
                          Cálculo para: {filteredProducts.find(p => p.id === selectedProductId)?.name}
                        </h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => refetchCalculation()}
                        >
                          Recalcular
                        </Button>
                      </div>
                      
                      {calculation && Object.keys(calculation).length > 0 ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Stock actual:</span>
                            <span className="font-medium">{calculation.currentStock || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Punto de reorden:</span>
                            <span className="font-medium">{calculation.reorderPoint || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Tiempo de entrega:</span>
                            <span className="font-medium">{calculation.leadTimeDays || 7} días</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Stock de seguridad:</span>
                            <span className="font-medium">{calculation.safetyStock || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Cantidad sugerida:</span>
                            <span className="font-medium text-primary">{calculation.suggestedQuantity || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Confiabilidad proveedor:</span>
                            <span className="font-medium">{calculation.reliability || 95}%</span>
                          </div>
                          
                          {calculation.needsReorder && (
                            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mt-4">
                              <div className="flex items-center text-warning mb-2">
                                <AlertTriangle size={16} className="mr-2" />
                                <span className="font-medium">Reorden Necesario</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div>Fecha sugerida: {calculation.suggestedOrderDate ? new Date(calculation.suggestedOrderDate).toLocaleDateString() : 'Hoy'}</div>
                                <div>Entrega estimada: {calculation.expectedDeliveryDate ? new Date(calculation.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</div>
                                <div>Días hasta agotamiento: {calculation.daysUntilStockout || 0} días</div>
                              </div>
                              <Button 
                                size="sm" 
                                className="mt-3 w-full"
                                onClick={() => {
                                  const product = filteredProducts.find(p => p.id === selectedProductId);
                                  if (product && calculation.suggestedOrderDate && calculation.expectedDeliveryDate) {
                                    form.setValue("productId", product.id.toString());
                                    form.setValue("quantity", calculation.suggestedQuantity);
                                    form.setValue("plannedOrderDate", calculation.suggestedOrderDate.split('T')[0]);
                                    form.setValue("expectedDeliveryDate", calculation.expectedDeliveryDate.split('T')[0]);
                                    setShowCreatePlan(true);
                                  }
                                }}
                              >
                                Crear Plan Automáticamente
                              </Button>
                            </div>
                          )}
                          
                          {!calculation.needsReorder && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                              <div className="flex items-center text-green-700 mb-2">
                                <Package size={16} className="mr-2" />
                                <span className="font-medium">Stock Suficiente</span>
                              </div>
                              <div className="text-sm text-green-600">
                                El producto tiene stock suficiente según los parámetros configurados.
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <Calculator className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500">Calculando...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Plans */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Próximos Planes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingPlans.slice(0, 5).map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{getProductName(plan.productId)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(plan.plannedOrderDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        variant={plan.status === "planned" ? "outline" : 
                                plan.status === "ordered" ? "default" : "secondary"}
                      >
                        {plan.status === "planned" ? "Planificado" :
                         plan.status === "ordered" ? "Pedido" :
                         plan.status === "delivered" ? "Entregado" : "Cancelado"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Bulk Procurement Modal */}
      <BulkProcurementModal 
        open={showBulkPlanning}
        onOpenChange={setShowBulkPlanning}
      />
    </>
  );
}
