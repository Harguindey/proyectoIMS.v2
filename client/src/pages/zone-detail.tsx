import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  MapPin,
  Edit,
  BarChart3
} from "lucide-react";
import EditZoneModal from "@/components/edit-zone-modal-simple";
import { useState } from "react";
import type { Product, WarehouseZone, StockMovement } from "@shared/schema";

export default function ZoneDetail() {
  const [, params] = useRoute("/zone/:id");
  const [, setLocation] = useLocation();
  const [showEditModal, setShowEditModal] = useState(false);
  const zoneId = params?.id ? parseInt(params.id) : null;

  const { data: zone, isLoading: zoneLoading } = useQuery<WarehouseZone>({
    queryKey: [`/api/warehouse-zones/${zoneId}`],
    enabled: !!zoneId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
  });

  if (zoneLoading || !zone) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando detalles de la zona...</p>
        </div>
      </div>
    );
  }

  // Filter products for this zone
  const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
  
  // Calculate zone statistics
  const totalStock = zoneProducts.reduce((sum, p) => sum + p.currentStock, 0);
  const lowStockCount = zoneProducts.filter(p => p.currentStock <= p.minStock).length;
  const utilization = zone.capacity > 0 ? (zone.currentOccupancy / zone.capacity) * 100 : 0;
  
  // Recent movements for this zone
  const zoneMovements = movements.filter(m => {
    const product = products.find(p => p.id === m.productId);
    return product?.warehouseZoneId === zone.id;
  }).slice(0, 5);

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) return { label: "Sin stock", color: "bg-destructive" };
    if (product.currentStock <= product.minStock) return { label: "Stock bajo", color: "bg-warning" };
    return { label: "Stock normal", color: "bg-accent" };
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/warehouse-map")}
            >
              <ArrowLeft size={14} className="mr-1" />
              Volver
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {zone.name}
              </h1>
              <p className="text-xs text-slate-500">
                {zone.code}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit size={14} className="mr-1" />
            Editar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* Zone Overview Cards - More Compact */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Productos</p>
                    <p className="text-lg font-bold text-slate-900">{zoneProducts.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="text-primary" size={16} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Stock Total</p>
                    <p className="text-lg font-bold text-slate-900">{totalStock}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-accent" size={16} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Utilización</p>
                    <p className={`text-lg font-bold ${utilization > 80 ? 'text-warning' : 'text-slate-900'}`}>
                      {Math.round(utilization)}%
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="text-purple-600" size={16} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Stock Bajo</p>
                    <p className={`text-lg font-bold ${lowStockCount > 0 ? 'text-warning' : 'text-slate-900'}`}>
                      {lowStockCount}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="text-warning" size={16} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Zone Information - More Compact */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Código:</span>
                    <span className="text-xs font-medium">{zone.code}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Capacidad:</span>
                    <span className="text-xs font-medium">{zone.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Ocupación:</span>
                    <span className="text-xs font-medium">{zone.currentOccupancy}</span>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Uso</span>
                    <span className="font-medium">{zone.currentOccupancy}/{zone.capacity}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        utilization > 90 ? 'bg-destructive' : 
                        utilization > 80 ? 'bg-warning' : 'bg-accent'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products in Zone */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Productos en esta Zona</CardTitle>
              </CardHeader>
              <CardContent>
                {zoneProducts.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay productos en esta zona</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {zoneProducts.map((product) => {
                      const status = getStockStatus(product);
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2 bg-white rounded border hover:shadow-sm transition-shadow cursor-pointer"
                          onClick={() => setLocation(`/product/${product.id}`)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                              <Package className="text-slate-600" size={12} />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-slate-900">{product.name}</h4>
                              <p className="text-xs text-slate-500">{product.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-900">{product.currentStock}</p>
                            </div>
                            <Badge className={`${status.color} text-white text-xs px-1 py-0.5`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Movements - Compact */}
          {zoneMovements.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Movimientos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {zoneMovements.map((movement) => {
                    const product = products.find(p => p.id === movement.productId);
                    return (
                      <div key={movement.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            movement.type === 'entry' ? 'bg-accent' : 
                            movement.type === 'exit' ? 'bg-warning' : 'bg-blue-500'
                          }`}>
                            <div className="text-white text-xs">
                              {movement.type === 'entry' ? '↑' : 
                               movement.type === 'exit' ? '↓' : '↔'}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-900">
                              {movement.type === 'entry' ? 'Entrada' : 
                               movement.type === 'exit' ? 'Salida' : 'Transferencia'}
                            </p>
                            <p className="text-xs text-slate-500">{product?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{movement.quantity} uds</p>
                          <p className="text-xs text-slate-500">
                            {new Date(movement.createdAt!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      {/* Edit Zone Modal */}
      {zone && (
        <EditZoneModal
          zone={zone}
          open={showEditModal}
          onOpenChange={setShowEditModal}
        />
      )}
    </div>
  );
}