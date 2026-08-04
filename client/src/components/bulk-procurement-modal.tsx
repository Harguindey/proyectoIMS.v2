import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Package, 
  DollarSign, 
  CalendarDays,
  CheckCircle,
  XCircle,
  Truck,
  BarChart3
} from "lucide-react";
import type { Product, Supplier, InsertProcurementPlan } from "@shared/schema";

interface BulkAnalysis {
  product: Product;
  supplier: Supplier | null;
  avgDailyUsage: number;
  daysUntilStockout: number;
  leadTimeDays: number;
  reliability: number;
  safetyStock: number;
  reorderPoint: number;
  needsReorder: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedQuantity: number;
  suggestedOrderDate: string | null;
  expectedDeliveryDate: string | null;
  estimatedCost: number;
  category: string;
}

interface BulkProcurementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkProcurementModal({ open, onOpenChange }: BulkProcurementModalProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: analyses = [], isLoading } = useQuery<BulkAnalysis[]>({
    queryKey: ['/api/procurement/analyze-bulk'],
    enabled: open,
  });

  const createPlansMutation = useMutation({
    mutationFn: async (plans: InsertProcurementPlan[]) => {
      const results = await Promise.all(
        plans.map(plan => 
          fetch('/api/procurement-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plan)
          }).then(res => res.json())
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement-plans/upcoming'] });
      toast({
        title: "Planes creados exitosamente",
        description: `Se crearon ${selectedProducts.size} planes de aprovisionamiento`,
      });
      setSelectedProducts(new Set());
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron crear los planes de aprovisionamiento",
        variant: "destructive",
      });
    }
  });

  const handleSelectProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredAnalyses.map(a => a.product.id);
      setSelectedProducts(new Set(allIds));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleCreatePlans = () => {
    const plansToCreate = filteredAnalyses
      .filter(analysis => selectedProducts.has(analysis.product.id))
      .map(analysis => ({
        productId: analysis.product.id,
        supplierId: analysis.supplier?.id || null,
        quantity: analysis.suggestedQuantity,
        plannedOrderDate: new Date(analysis.suggestedOrderDate || Date.now()),
        expectedDeliveryDate: new Date(analysis.expectedDeliveryDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: `Plan automático generado - Prioridad: ${analysis.priority}. Uso diario promedio: ${analysis.avgDailyUsage} unidades.`
      }));

    createPlansMutation.mutate(plansToCreate);
  };

  const categories = [...new Set(analyses.map(a => a.category))];
  const priorities = ['critical', 'high', 'medium', 'low'];

  const filteredAnalyses = analyses.filter((analysis: BulkAnalysis) => {
    const priorityMatch = filterPriority === 'all' || analysis.priority === filterPriority;
    const categoryMatch = filterCategory === 'all' || analysis.category === filterCategory;
    return priorityMatch && categoryMatch;
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const totalEstimatedCost = filteredAnalyses
    .filter(a => selectedProducts.has(a.product.id))
    .reduce((sum, a) => sum + a.estimatedCost, 0);

  const summaryStats = {
    critical: filteredAnalyses.filter(a => a.priority === 'critical').length,
    high: filteredAnalyses.filter(a => a.priority === 'high').length,
    medium: filteredAnalyses.filter(a => a.priority === 'medium').length,
    low: filteredAnalyses.filter(a => a.priority === 'low').length,
    totalProducts: filteredAnalyses.length,
    needsReorder: filteredAnalyses.filter(a => a.needsReorder).length
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analizando inventario...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Planificación Masiva de Aprovisionamiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Crítico</p>
                    <p className="text-2xl font-bold text-red-600">{summaryStats.critical}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Prioridad Alta</p>
                    <p className="text-2xl font-bold text-orange-600">{summaryStats.high}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Necesita Reorden</p>
                    <p className="text-2xl font-bold text-blue-600">{summaryStats.needsReorder}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Productos</p>
                    <p className="text-2xl font-bold">{summaryStats.totalProducts}</p>
                  </div>
                  <Package className="h-8 w-8 text-slate-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Prioridad:</label>
              <select 
                value={filterPriority} 
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-1 border rounded"
              >
                <option value="all">Todas</option>
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority === 'critical' ? 'Crítica' : 
                     priority === 'high' ? 'Alta' : 
                     priority === 'medium' ? 'Media' : 'Baja'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Categoría:</label>
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 border rounded"
              >
                <option value="all">Todas</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-4">
              <Checkbox 
                checked={selectedProducts.size === filteredAnalyses.length && filteredAnalyses.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                Seleccionar todos ({selectedProducts.size} de {filteredAnalyses.length})
              </span>
            </div>
            <div className="flex items-center gap-4">
              {selectedProducts.size > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">
                    Costo total: ${totalEstimatedCost.toFixed(2)}
                  </span>
                </div>
              )}
              <Button 
                onClick={handleCreatePlans}
                disabled={selectedProducts.size === 0 || createPlansMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createPlansMutation.isPending ? (
                  "Creando planes..."
                ) : (
                  `Crear ${selectedProducts.size} planes`
                )}
              </Button>
            </div>
          </div>

          {/* Products List */}
          <div className="space-y-4">
            {filteredAnalyses.map((analysis: BulkAnalysis) => (
              <Card key={analysis.product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={selectedProducts.has(analysis.product.id)}
                      onCheckedChange={(checked) => handleSelectProduct(analysis.product.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* Product Info */}
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{analysis.product.name}</h3>
                          <Badge className={getPriorityColor(analysis.priority)}>
                            {analysis.priority === 'critical' ? 'Crítica' : 
                             analysis.priority === 'high' ? 'Alta' : 
                             analysis.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          SKU: {analysis.product.sku} | {analysis.category}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Stock actual: {analysis.product.currentStock} unidades
                        </p>
                      </div>

                      {/* Analysis Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">
                            Uso diario: {analysis.avgDailyUsage} und/día
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">
                            Días hasta agotarse: {analysis.daysUntilStockout === 999 ? 'N/A' : analysis.daysUntilStockout}
                          </span>
                        </div>
                      </div>

                      {/* Supplier Info */}
                      <div>
                        {analysis.supplier ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">{analysis.supplier.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Tiempo de entrega: {analysis.leadTimeDays} días
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Confiabilidad: {analysis.reliability}%
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">Sin proveedor</span>
                          </div>
                        )}
                      </div>

                      {/* Recommendation */}
                      <div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            Cantidad sugerida: {analysis.suggestedQuantity}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Punto de reorden: {analysis.reorderPoint}
                          </p>
                          <p className="text-sm font-medium text-green-600">
                            Costo: ${analysis.estimatedCost.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div>
                        {analysis.suggestedOrderDate && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-blue-500" />
                              <span className="text-xs">
                                Pedir: {new Date(analysis.suggestedOrderDate).toLocaleDateString()}
                              </span>
                            </div>
                            {analysis.expectedDeliveryDate && (
                              <p className="text-xs text-muted-foreground">
                                Entrega: {new Date(analysis.expectedDeliveryDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAnalyses.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600">No hay productos que coincidan con los filtros seleccionados</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}