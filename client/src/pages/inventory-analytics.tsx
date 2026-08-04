import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Package,
  RefreshCw,
  ExternalLink,
  Zap
} from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface SalesVelocityResult {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  velocity30Days: number;
  velocity60Days: number;
  velocity90Days: number;
  daysUntilStockout30: number | null;
  daysUntilStockout60: number | null;
  daysUntilStockout90: number | null;
  trend: 'increasing' | 'stable' | 'decreasing';
  status: 'critical' | 'warning' | 'healthy';
}

interface ABCClassificationResult {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  unitPrice: number;
  totalValue: number;
  valuePercentage: number;
  cumulativePercentage: number;
  classification: 'A' | 'B' | 'C';
  recommendation: string;
}

interface DynamicReorderPointResult {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  avgDailySales: number;
  leadTimeDays: number;
  safetyStock: number;
  dynamicReorderPoint: number;
  staticReorderPoint: number;
  difference: number;
  daysOfStockRemaining: number;
  shouldReorder: boolean;
  urgency: 'urgent' | 'soon' | 'normal' | 'not_needed';
  suggestedOrderQuantity: number;
  supplierName: string | null;
}

export default function InventoryAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("velocity");

  const velocityQuery = useQuery<SalesVelocityResult[]>({
    queryKey: ['/api/analytics/sales-velocity'],
    staleTime: 5 * 60 * 1000,
  });

  const abcQuery = useQuery<ABCClassificationResult[]>({
    queryKey: ['/api/analytics/abc-classification'],
    staleTime: 5 * 60 * 1000,
  });

  const reorderQuery = useQuery<DynamicReorderPointResult[]>({
    queryKey: ['/api/analytics/reorder-points'],
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/sales-velocity'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/abc-classification'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/reorder-points'] });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      critical: { variant: "destructive" as const, label: "Crítico", className: "" },
      warning: { variant: "secondary" as const, label: "Alerta", className: "bg-amber-100 text-amber-800" },
      healthy: { variant: "default" as const, label: "Normal", className: "" },
    };
    const config = variants[status as keyof typeof variants];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'A': return 'bg-red-100 text-red-800 border-red-300';
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'C': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants = {
      urgent: { variant: "destructive" as const, label: "🔴 Urgente", icon: AlertTriangle, className: "" },
      soon: { variant: "secondary" as const, label: "🟡 Pronto", icon: AlertTriangle, className: "bg-amber-100 text-amber-800" },
      normal: { variant: "default" as const, label: "🔵 Normal", icon: CheckCircle2, className: "" },
      not_needed: { variant: "outline" as const, label: "✅ No necesario", icon: CheckCircle2, className: "" },
    };
    const config = variants[urgency as keyof typeof variants];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3" data-testid="page-title">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Análisis de Inventario
            </h1>
            <p className="text-gray-600 mt-1">
              Herramientas logísticas para optimizar tu inventario
            </p>
          </div>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto" data-testid="tabs-list">
            <TabsTrigger value="velocity" data-testid="tab-velocity">
              <Zap className="w-4 h-4 mr-2" />
              Velocidad de Ventas
            </TabsTrigger>
            <TabsTrigger value="abc" data-testid="tab-abc">
              <Target className="w-4 h-4 mr-2" />
              Clasificación ABC
            </TabsTrigger>
            <TabsTrigger value="reorder" data-testid="tab-reorder">
              <Package className="w-4 h-4 mr-2" />
              Puntos de Reorden
            </TabsTrigger>
          </TabsList>

          {/* Sales Velocity Tab */}
          <TabsContent value="velocity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Velocidad de Ventas</CardTitle>
                <CardDescription>
                  Promedio de unidades vendidas por día en diferentes períodos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {velocityQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                    ))}
                  </div>
                ) : velocityQuery.error ? (
                  <div className="text-center py-8 text-red-600">
                    Error al cargar datos. Por favor, intenta de nuevo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Stock Actual</TableHead>
                          <TableHead className="text-right">Vel. 30d</TableHead>
                          <TableHead className="text-right">Vel. 60d</TableHead>
                          <TableHead className="text-right">Vel. 90d</TableHead>
                          <TableHead className="text-right">Días restantes</TableHead>
                          <TableHead>Tendencia</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {velocityQuery.data?.map((item) => (
                          <TableRow key={item.productId} data-testid={`row-velocity-${item.productId}`}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-sm text-gray-600">{item.sku}</TableCell>
                            <TableCell className="text-right">{item.currentStock}</TableCell>
                            <TableCell className="text-right font-mono">{item.velocity30Days.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-mono">{item.velocity60Days.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-mono">{item.velocity90Days.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-bold">
                              {item.daysUntilStockout30 !== null ? `${item.daysUntilStockout30}d` : '∞'}
                            </TableCell>
                            <TableCell>{getTrendIcon(item.trend)}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.location.href = `/product/${item.productId}`}
                                data-testid={`button-view-${item.productId}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABC Classification Tab */}
          <TabsContent value="abc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clasificación ABC</CardTitle>
                <CardDescription>
                  Productos clasificados por su valor económico (regla 80/20)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {abcQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                    ))}
                  </div>
                ) : abcQuery.error ? (
                  <div className="text-center py-8 text-red-600">
                    Error al cargar datos. Por favor, intenta de nuevo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Clase</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead className="text-right">% Valor</TableHead>
                          <TableHead className="text-right">% Acumulado</TableHead>
                          <TableHead>Recomendación</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abcQuery.data?.map((item) => (
                          <TableRow key={item.productId} data-testid={`row-abc-${item.productId}`}>
                            <TableCell>
                              <Badge className={`font-bold ${getClassificationColor(item.classification)}`}>
                                {item.classification}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-sm text-gray-600">{item.sku}</TableCell>
                            <TableCell className="text-right">{item.currentStock}</TableCell>
                            <TableCell className="text-right">€{item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold">€{item.totalValue.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.valuePercentage.toFixed(1)}%</TableCell>
                            <TableCell className="text-right font-mono">{item.cumulativePercentage.toFixed(1)}%</TableCell>
                            <TableCell className="text-xs max-w-xs">{item.recommendation}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.location.href = `/product/${item.productId}`}
                                data-testid={`button-view-abc-${item.productId}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <Badge className="bg-red-100 text-red-800 border-red-300 mt-1">A</Badge>
                    <div>
                      <p className="font-semibold">Clase A (~20% productos)</p>
                      <p className="text-sm text-gray-600">Representan ~80% del valor. Máxima prioridad.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 mt-1">B</Badge>
                    <div>
                      <p className="font-semibold">Clase B (~30% productos)</p>
                      <p className="text-sm text-gray-600">Representan ~15% del valor. Prioridad media.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="bg-green-100 text-green-800 border-green-300 mt-1">C</Badge>
                    <div>
                      <p className="font-semibold">Clase C (~50% productos)</p>
                      <p className="text-sm text-gray-600">Representan ~5% del valor. Baja prioridad.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reorder Points Tab */}
          <TabsContent value="reorder" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Puntos de Reorden Dinámicos</CardTitle>
                <CardDescription>
                  Cálculo automático de cuándo pedir basado en velocidad de ventas real
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reorderQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                    ))}
                  </div>
                ) : reorderQuery.error ? (
                  <div className="text-center py-8 text-red-600">
                    Error al cargar datos. Por favor, intenta de nuevo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Ventas/día</TableHead>
                          <TableHead className="text-right">Lead Time</TableHead>
                          <TableHead className="text-right">Punto Dinámico</TableHead>
                          <TableHead className="text-right">Punto Estático</TableHead>
                          <TableHead className="text-right">Días restantes</TableHead>
                          <TableHead>Urgencia</TableHead>
                          <TableHead className="text-right">Cant. Sugerida</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reorderQuery.data?.map((item) => (
                          <TableRow key={item.productId} data-testid={`row-reorder-${item.productId}`}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-sm text-gray-600">{item.sku}</TableCell>
                            <TableCell className="text-right">
                              {item.shouldReorder ? (
                                <span className="font-bold text-red-600">{item.currentStock}</span>
                              ) : (
                                item.currentStock
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">{item.avgDailySales.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{item.leadTimeDays}d</TableCell>
                            <TableCell className="text-right font-bold text-blue-600">{item.dynamicReorderPoint}</TableCell>
                            <TableCell className="text-right text-gray-500">{item.staticReorderPoint}</TableCell>
                            <TableCell className="text-right font-bold">
                              {item.daysOfStockRemaining < 999 ? `${item.daysOfStockRemaining}d` : '∞'}
                            </TableCell>
                            <TableCell>{getUrgencyBadge(item.urgency)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {item.suggestedOrderQuantity}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.location.href = `/product/${item.productId}`}
                                data-testid={`button-view-reorder-${item.productId}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Cómo funciona el Punto de Reorden Dinámico</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Fórmula: <span className="font-mono bg-white px-2 py-1 rounded">(Ventas/día × Lead Time) + Stock de Seguridad</span>
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      Este cálculo se ajusta automáticamente según tus ventas reales, a diferencia del punto estático que es un valor fijo.
                      Cuando el stock actual cae por debajo del punto dinámico, debes hacer un pedido.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
