import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, TrendingUp, TrendingDown, Package, AlertTriangle, X, CheckCircle, Clock, Filter, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import type { Product, WarehouseZone, StockMovement } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  
  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'excel',
    module: 'inventory',
    template: 'standard',
    includeCharts: false,
    dateRange: {
      start: '',
      end: ''
    },
    filters: {
      categories: [] as string[],
      zones: [] as number[],
      suppliers: [] as number[],
      status: [] as string[]
    },
    columns: [] as string[]
  });
  
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
  });

  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  // Export functions
  const handleExportPreview = async () => {
    try {
      const response = await fetch('/api/export/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module: exportOptions.module,
          dateRange: exportOptions.dateRange.start && exportOptions.dateRange.end ? {
            start: new Date(exportOptions.dateRange.start),
            end: new Date(exportOptions.dateRange.end)
          } : undefined,
          filters: exportOptions.filters
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const preview = await response.json();
      
      toast({
        title: "Preview generado",
        description: `${preview.recordCount} registros encontrados (${preview.estimatedFileSize})`
      });
      
      return preview;
    } catch (error) {
      console.error('Error getting export preview:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el preview",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: exportOptions.format,
          module: exportOptions.module,
          template: exportOptions.template,
          includeCharts: exportOptions.includeCharts,
          dateRange: exportOptions.dateRange.start && exportOptions.dateRange.end ? {
            start: new Date(exportOptions.dateRange.start),
            end: new Date(exportOptions.dateRange.end)
          } : undefined,
          filters: exportOptions.filters,
          columns: exportOptions.columns.length > 0 ? exportOptions.columns : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Error en la exportación');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `export_${exportOptions.module}_${exportOptions.format}.${exportOptions.format === 'excel' ? 'xlsx' : exportOptions.format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "¡Exportación exitosa!",
        description: `Archivo ${fileName} descargado correctamente`,
      });
      
      setExportModalOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error en exportación",
        description: "No se pudo generar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate inventory value
  const totalInventoryValue = products.reduce((sum, product) => {
    const price = parseFloat(product.unitPrice || "0");
    return sum + (product.currentStock * price);
  }, 0);

  // Get low stock products
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);

  // Calculate zone utilization
  const zoneUtilization = zones.map(zone => {
    const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
    const utilization = (zone.currentOccupancy / zone.capacity) * 100;
    return {
      ...zone,
      productCount: zoneProducts.length,
      utilization: Math.round(utilization),
      totalStock: zoneProducts.reduce((sum, p) => sum + p.currentStock, 0),
    };
  });

  // Recent movements by type
  const recentMovements = movements.slice(0, 10);
  const entriesCount = movements.filter(m => m.type === "entry").length;
  const exitsCount = movements.filter(m => m.type === "exit").length;

  // Products by category
  const categoryStats = products.reduce((acc, product) => {
    const category = product.category;
    if (!acc[category]) {
      acc[category] = { count: 0, totalStock: 0, value: 0 };
    }
    acc[category].count++;
    acc[category].totalStock += product.currentStock;
    acc[category].value += product.currentStock * parseFloat(product.unitPrice || "0");
    return acc;
  }, {} as Record<string, { count: number; totalStock: number; value: number }>);

  const getZoneName = (zoneId: number | null) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : "Sin asignar";
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : "Producto desconocido";
  };



  if (productsLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
            <h2 className="text-2xl font-bold text-slate-900">Reportes</h2>
            <p className="text-slate-600">Análisis y estadísticas del inventario</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => setExportModalOpen(true)} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Download size={16} className="mr-2" />
              Exportar Datos
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Valor Total Inventario</p>
                  <p className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Entradas Totales</p>
                  <p className="text-2xl font-bold">{entriesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingDown className="h-8 w-8 text-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Salidas Totales</p>
                  <p className="text-2xl font-bold">{exitsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Alertas Activas</p>
                  <p className="text-2xl font-bold">{lowStockProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Zone Utilization Report */}
          <Card>
            <CardHeader>
              <CardTitle>Utilización por Zona</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zona</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Stock Total</TableHead>
                    <TableHead>Utilización</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zoneUtilization.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">
                        {zone.name}
                        <div className="text-xs text-slate-500">{zone.code}</div>
                      </TableCell>
                      <TableCell>{zone.productCount}</TableCell>
                      <TableCell>{zone.totalStock}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                zone.utilization > 80 ? 'bg-warning' : 
                                zone.utilization > 50 ? 'bg-yellow-400' : 'bg-accent'
                              }`}
                              style={{ width: `${Math.min(zone.utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{zone.utilization}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Category Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Stock Total</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(categoryStats).map(([category, stats]) => (
                    <TableRow key={category}>
                      <TableCell>
                        <Badge variant="outline">{category}</Badge>
                      </TableCell>
                      <TableCell>{stats.count}</TableCell>
                      <TableCell>{stats.totalStock}</TableCell>
                      <TableCell>${stats.value.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                Productos con Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Stock Mínimo</TableHead>
                    <TableHead>Ubicación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.slice(0, 10).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <span className="text-destructive font-semibold">
                          {product.currentStock}
                        </span>
                      </TableCell>
                      <TableCell>{product.minStock}</TableCell>
                      <TableCell>{getZoneName(product.warehouseZoneId)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        movement.type === 'entry' ? 'bg-accent' : 
                        movement.type === 'exit' ? 'bg-warning' : 'bg-blue-500'
                      }`}>
                        {movement.type === 'entry' ? 
                          <TrendingUp className="text-white" size={16} /> :
                          <TrendingDown className="text-white" size={16} />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {getProductName(movement.productId)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {movement.type === 'entry' ? 'Entrada' : 
                           movement.type === 'exit' ? 'Salida' : 'Transferencia'} • {movement.quantity} unidades
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(movement.createdAt!).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download size={20} className="text-blue-600" />
              <span>Exportar Datos - SportMax Pro</span>
            </DialogTitle>
            <DialogDescription>
              Configure las opciones de exportación y genere archivos profesionales con sus datos de inventario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Format & Module Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="format" className="text-sm font-medium">Formato de Archivo</Label>
                <Select 
                  value={exportOptions.format} 
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger data-testid="select-export-format">
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">📊 Excel (.xlsx)</SelectItem>
                    <SelectItem value="pdf">📄 PDF (.pdf)</SelectItem>
                    <SelectItem value="csv">📋 CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="module" className="text-sm font-medium">Módulo de Datos</Label>
                <Select 
                  value={exportOptions.module} 
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, module: value }))}
                >
                  <SelectTrigger data-testid="select-export-module">
                    <SelectValue placeholder="Seleccionar módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">📦 Inventario Completo</SelectItem>
                    <SelectItem value="movements">🔄 Movimientos de Stock</SelectItem>
                    <SelectItem value="orders">🛒 Órdenes de Compra</SelectItem>
                    <SelectItem value="suppliers">🏢 Proveedores</SelectItem>
                    <SelectItem value="customers">👥 Clientes</SelectItem>
                    <SelectItem value="analytics">📊 Analytics y Reportes</SelectItem>
                    <SelectItem value="all">🎯 Todo el Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template & Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Plantilla de Reporte</Label>
                <Select 
                  value={exportOptions.template} 
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, template: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">📋 Estándar</SelectItem>
                    <SelectItem value="detailed">📊 Detallado</SelectItem>
                    <SelectItem value="summary">📄 Resumen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Opciones Adicionales</Label>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox 
                    id="includeCharts"
                    checked={exportOptions.includeCharts}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeCharts: !!checked }))
                    }
                  />
                  <Label htmlFor="includeCharts" className="text-sm">Incluir Gráficos</Label>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Calendar size={16} />
                <span>Rango de Fechas (Opcional)</span>
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-600">Fecha Inicial</Label>
                  <Input 
                    type="date"
                    value={exportOptions.dateRange.start}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Fecha Final</Label>
                  <Input 
                    type="date"
                    value={exportOptions.dateRange.end}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleExportPreview}
                  className="flex items-center space-x-2"
                  data-testid="button-preview-export"
                >
                  <Clock size={16} />
                  <span>Vista Previa</span>
                </Button>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setExportModalOpen(false)}
                  data-testid="button-cancel-export"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  data-testid="button-confirm-export"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="mr-2" />
                      Exportar Ahora
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
