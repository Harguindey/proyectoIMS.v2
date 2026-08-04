import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Package, 
  Clock, 
  TrendingDown, 
  MapPin,
  X,
  CheckCircle
} from "lucide-react";
import type { Product, WarehouseZone, StockMovement, ProcurementPlan } from "@shared/schema";

interface Alert {
  id: string;
  type: "low-stock" | "reorder" | "expired" | "zone-capacity" | "movement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  productId?: number;
  zoneId?: number;
  timestamp: Date;
  read: boolean;
}

interface AlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readAlerts?: Set<string>;
  onMarkAsRead?: (alertId: string) => void;
  onMarkAllAsRead?: () => void;
}

export default function AlertsModal({ 
  open, 
  onOpenChange, 
  readAlerts: externalReadAlerts, 
  onMarkAsRead: externalMarkAsRead,
  onMarkAllAsRead: externalMarkAllAsRead 
}: AlertsModalProps) {
  const [internalReadAlerts, setInternalReadAlerts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");
  
  // Use external or internal state
  const readAlerts = externalReadAlerts || internalReadAlerts;

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: lowStockProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products/low-stock"],
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const { data: recentMovements = [] } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements/recent"],
  });

  const { data: upcomingPlans = [] } = useQuery<ProcurementPlan[]>({
    queryKey: ["/api/procurement-plans/upcoming"],
  });

  // Generate alerts based on current data
  const generateAlerts = (): Alert[] => {
    const generatedAlerts: Alert[] = [];

    // Low stock alerts
    lowStockProducts.forEach((product) => {
      generatedAlerts.push({
        id: `low-stock-${product.id}`,
        type: "low-stock",
        priority: product.currentStock === 0 ? "high" : "medium",
        title: `Stock crítico: ${product.name}`,
        description: `Stock actual: ${product.currentStock} unidades (mínimo: ${product.minStock})`,
        productId: product.id,
        timestamp: new Date(),
        read: false,
      });
    });

    // Products needing reorder
    products.forEach((product) => {
      if (product.currentStock <= product.minStock && product.reorderPoint) {
        generatedAlerts.push({
          id: `reorder-${product.id}`,
          type: "reorder",
          priority: "medium",
          title: `Reabastecer: ${product.name}`,
          description: `Ha alcanzado el punto de reorden. Cantidad sugerida: ${product.orderQuantity || 'No definida'}`,
          productId: product.id,
          timestamp: new Date(),
          read: false,
        });
      }
    });

    // Zone capacity alerts
    zones.forEach((zone) => {
      const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
      const totalStock = zoneProducts.reduce((sum, p) => sum + p.currentStock, 0);
      
      if (zone.capacity && totalStock > zone.capacity * 0.9) {
        generatedAlerts.push({
          id: `zone-capacity-${zone.id}`,
          type: "zone-capacity",
          priority: totalStock > zone.capacity ? "high" : "medium",
          title: `Capacidad de zona: ${zone.name}`,
          description: `Utilización: ${totalStock}/${zone.capacity} (${Math.round((totalStock / zone.capacity) * 100)}%)`,
          zoneId: zone.id,
          timestamp: new Date(),
          read: false,
        });
      }
    });

    // Recent unusual movements
    const today = new Date();
    const unusualMovements = recentMovements.filter(movement => {
      const movementDate = new Date(movement.createdAt!);
      const diffHours = (today.getTime() - movementDate.getTime()) / (1000 * 60 * 60);
      return diffHours < 24 && movement.quantity > 100; // Large movements in last 24h
    });

    unusualMovements.forEach((movement) => {
      const product = products.find(p => p.id === movement.productId);
      generatedAlerts.push({
        id: `movement-${movement.id}`,
        type: "movement",
        priority: "low",
        title: `Movimiento grande: ${product?.name || 'Producto desconocido'}`,
        description: `${movement.type === 'entry' ? 'Entrada' : 'Salida'} de ${movement.quantity} unidades`,
        productId: movement.productId,
        timestamp: new Date(movement.createdAt!),
        read: false,
      });
    });

    return generatedAlerts.sort((a, b) => {
      // Sort by priority then by timestamp
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  };

  const allAlerts = generateAlerts().map(alert => ({
    ...alert,
    read: readAlerts.has(alert.id)
  }));
  const unreadCount = allAlerts.filter(alert => !alert.read).length;

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'low-stock':
        return <AlertTriangle className="text-warning" size={16} />;
      case 'reorder':
        return <Package className="text-blue-500" size={16} />;
      case 'expired':
        return <Clock className="text-destructive" size={16} />;
      case 'zone-capacity':
        return <MapPin className="text-purple-500" size={16} />;
      case 'movement':
        return <TrendingDown className="text-accent" size={16} />;
      default:
        return <AlertTriangle className="text-slate-500" size={16} />;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive';
      case 'medium':
        return 'bg-warning';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-slate-500';
    }
  };

  const markAsRead = (alertId: string) => {
    if (externalMarkAsRead) {
      externalMarkAsRead(alertId);
    } else {
      setInternalReadAlerts(prev => new Set([...Array.from(prev), alertId]));
    }
  };

  const markAllAsRead = () => {
    if (externalMarkAllAsRead) {
      externalMarkAllAsRead();
    } else {
      const allAlertIds = allAlerts.map(alert => alert.id);
      setInternalReadAlerts(new Set(allAlertIds));
    }
  };

  const filteredAlerts = activeTab === "all" 
    ? allAlerts 
    : allAlerts.filter(alert => alert.type === activeTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Alertas del Sistema
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCircle size={16} className="mr-1" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="all" className="text-xs">
              Todas
              <Badge variant="secondary" className="ml-1 text-xs">
                {allAlerts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="text-xs">
              Stock
              <Badge variant="secondary" className="ml-1 text-xs">
                {allAlerts.filter(a => a.type === 'low-stock').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="reorder" className="text-xs">
              Reorden
              <Badge variant="secondary" className="ml-1 text-xs">
                {allAlerts.filter(a => a.type === 'reorder').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="zone-capacity" className="text-xs">
              Zonas
              <Badge variant="secondary" className="ml-1 text-xs">
                {allAlerts.filter(a => a.type === 'zone-capacity').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="movement" className="text-xs">
              Movimientos
              <Badge variant="secondary" className="ml-1 text-xs">
                {allAlerts.filter(a => a.type === 'movement').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-full w-full">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                  <CheckCircle size={48} className="mb-2" />
                  <p>No hay alertas en esta categoría</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {filteredAlerts.map((alert) => {
                    const product = alert.productId ? products.find(p => p.id === alert.productId) : null;
                    const zone = alert.zoneId ? zones.find(z => z.id === alert.zoneId) : null;
                    
                    return (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          alert.read 
                            ? 'bg-slate-50 border-slate-200' 
                            : 'bg-white border-slate-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-1 flex-shrink-0">
                              {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className={`font-medium text-sm ${alert.read ? 'text-slate-600' : 'text-slate-900'}`}>
                                  {alert.title}
                                </h4>
                                <Badge 
                                  className={`${getPriorityColor(alert.priority)} text-white text-xs flex-shrink-0`}
                                >
                                  {alert.priority === 'high' ? 'Alta' : 
                                   alert.priority === 'medium' ? 'Media' : 'Baja'}
                                </Badge>
                              </div>
                              <p className={`text-xs ${alert.read ? 'text-slate-500' : 'text-slate-600'} mb-2`}>
                                {alert.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                                <span>{alert.timestamp.toLocaleString()}</span>
                                {product && (
                                  <span>SKU: {product.sku}</span>
                                )}
                                {zone && (
                                  <span>Zona: {zone.name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {!alert.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(alert.id)}
                              >
                                <CheckCircle size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}