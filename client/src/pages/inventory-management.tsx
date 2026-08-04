import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  Package,
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  MapPin,
  RefreshCw,
  CheckCircle2,
  X,
  Filter,
  TrendingUp,
} from "lucide-react";
import type { Product, WarehouseZone } from "@shared/schema";

interface RefreshButtonProps {
  onRefresh: () => void;
}

function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      // Simular un breve delay para mostrar la animación
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: "Datos actualizados",
        description: "La información del inventario se ha actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar la información del inventario.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      variant="outline"
      className="bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-200 disabled:opacity-50"
    >
      <RefreshCw 
        size={16} 
        className={`mr-2 transition-transform duration-500 ${
          isRefreshing ? 'animate-spin' : ''
        }`} 
      />
      {isRefreshing ? 'Actualizando...' : 'Actualizar'}
    </Button>
  );
}

interface ProductWithZone extends Product {
  zoneName?: string;
  zoneCode?: string;
}

interface DraggedProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  fromZoneId: number | null;
}

function DraggableProduct({ product }: { product: ProductWithZone }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) {
      return { status: "Sin Stock", color: "destructive" as const };
    }
    if (product.currentStock <= product.minStock) {
      return { status: "Stock Bajo", color: "secondary" as const };
    }
    return { status: "En Stock", color: "default" as const };
  };

  const stockStatus = getStockStatus(product);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg border border-slate-200 p-2 sm:p-4 cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:shadow-md hover:border-blue-300 w-full max-w-full
        ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}
      `}
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-purple-600">
          <AvatarFallback className="text-white font-medium text-xs sm:text-sm">
            {product.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900 truncate text-xs sm:text-sm">{product.name}</h3>
            <Badge variant={stockStatus.color} className="text-xs ml-2">
              {stockStatus.status}
            </Badge>
          </div>
          <div className="flex items-center flex-wrap gap-x-1 sm:gap-x-2 mt-1">
            <span className="text-xs text-slate-500">{product.sku}</span>
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 hidden sm:inline">{product.category}</span>
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs font-medium text-slate-700">{product.currentStock} un.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnassignedDropZone({ products }: { products: ProductWithZone[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "unassigned",
  });

  return (
    <div ref={setNodeRef}>
      <Card className={`
        min-h-[300px] sm:min-h-[400px] transition-all duration-200
        ${isOver ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}
      `}>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Productos Sin Asignar</CardTitle>
              <p className="text-xs sm:text-sm text-slate-600">Código: UNASSIGNED</p>
            </div>
            <div className="text-right">
              <div className="text-xs sm:text-sm text-slate-500">Productos</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">{products.length}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Productos pendientes</span>
              <span>{products.length}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-200 bg-amber-500"
                style={{ width: `${products.length > 0 ? 100 : 0}%` }}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {products.map((product) => (
            <DraggableProduct key={product.id} product={product} />
          ))}
          
          {products.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Package size={32} className="mx-auto mb-2" />
              <p className="text-sm">Todos los productos están asignados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DropZone({ zone, products }: { zone: WarehouseZone; products: ProductWithZone[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: zone.id.toString(),
  });

  return (
    <div ref={setNodeRef}>
      <Card className={`
        min-h-[300px] sm:min-h-[400px] transition-all duration-200
        ${isOver ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}
      `}>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">{zone.name}</CardTitle>
              <p className="text-xs sm:text-sm text-slate-600">Código: {zone.code}</p>
            </div>
            <div className="text-right">
              <div className="text-xs sm:text-sm text-slate-500">Productos</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">{products.length}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Ocupación</span>
              <span>{zone.currentOccupancy}/{zone.capacity}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-200 ${
                  zone.currentOccupancy / zone.capacity > 0.8
                    ? 'bg-red-500'
                    : zone.currentOccupancy / zone.capacity > 0.6
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((zone.currentOccupancy / zone.capacity) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {products.map((product) => (
            <DraggableProduct key={product.id} product={product} />
          ))}
          
          {products.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Package size={32} className="mx-auto mb-2" />
              <p className="text-sm">No hay productos en esta zona</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InventoryManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedProduct, setDraggedProduct] = useState<DraggedProduct | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  // Move product mutation
  const moveProductMutation = useMutation({
    mutationFn: async ({ productId, fromZoneId, toZoneId, quantity }: {
      productId: number;
      fromZoneId: number | null;
      toZoneId: number | null;
      quantity: number;
    }) => {
      // Update product zone
      await apiRequest("PATCH", `/api/products/${productId}`, {
        warehouseZoneId: toZoneId
      });

      // Create stock movement record
      await apiRequest("POST", "/api/stock-movements", {
        productId,
        type: "transfer",
        quantity,
        fromZoneId,
        toZoneId,
        reason: "Transferencia via drag-and-drop"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-zones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      toast({
        title: "Producto movido exitosamente",
        description: "El producto ha sido transferido a la nueva zona.",
      });
    },
    onError: () => {
      toast({
        title: "Error al mover producto",
        description: "No se pudo transferir el producto.",
        variant: "destructive",
      });
    },
  });

  // Enhanced products with zone info
  const productsWithZones = useMemo(() => {
    return products.map(product => {
      const zone = zones.find(z => z.id === product.warehouseZoneId);
      return {
        ...product,
        zoneName: zone?.name || "Sin asignar",
        zoneCode: zone?.code || "N/A"
      };
    });
  }, [products, zones]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return productsWithZones;
    
    const query = searchQuery.toLowerCase();
    return productsWithZones.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  }, [productsWithZones, searchQuery]);

  // Group products by zone
  const productsByZone = useMemo(() => {
    const grouped: Record<string, ProductWithZone[]> = {};
    
    // Initialize with all zones
    zones.forEach(zone => {
      grouped[zone.id.toString()] = [];
    });
    
    // Add unassigned zone
    grouped["unassigned"] = [];
    
    // Group products
    filteredProducts.forEach(product => {
      const zoneId = product.warehouseZoneId?.toString() || "unassigned";
      if (grouped[zoneId]) {
        grouped[zoneId].push(product);
      }
    });
    
    return grouped;
  }, [filteredProducts, zones]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const unassignedProducts = products.filter(p => !p.warehouseZoneId).length;
    const lowStockProducts = products.filter(p => p.currentStock <= p.minStock).length;
    const totalValue = products.reduce((sum, p) => sum + (p.currentStock * parseFloat(p.unitPrice || "0")), 0);
    const categoriesCount = new Set(products.map(p => p.category)).size;
    const emptyZones = zones.filter(zone => !products.some(p => p.warehouseZoneId === zone.id)).length;
    const averageStockPerProduct = totalProducts > 0 ? Math.round(totalStock / totalProducts) : 0;
    
    return { 
      totalProducts, 
      totalStock,
      unassignedProducts, 
      lowStockProducts, 
      totalValue, 
      categoriesCount,
      emptyZones,
      averageStockPerProduct
    };
  }, [products, zones]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const product = filteredProducts.find(p => p.id === active.id);
    
    if (product) {
      setDraggedProduct({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        currentStock: product.currentStock,
        fromZoneId: product.warehouseZoneId
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over || !draggedProduct) {
      setDraggedProduct(null);
      return;
    }

    // Get the drop target zone
    const targetZoneId = over.id.toString();
    let newZoneId: number | null = null;
    
    if (targetZoneId === "unassigned") {
      newZoneId = null; // Moving to unassigned
    } else {
      const targetZone = zones.find(z => z.id.toString() === targetZoneId);
      if (targetZone) {
        newZoneId = targetZone.id;
      }
    }
    
    // Don't move if dropped on the same zone
    const currentZoneId = draggedProduct.fromZoneId;
    if (currentZoneId === newZoneId) {
      setDraggedProduct(null);
      return;
    }

    console.log('Moving product:', {
      productId: draggedProduct.id,
      from: currentZoneId,
      to: newZoneId,
      productName: draggedProduct.name
    });

    // Move the product
    moveProductMutation.mutate({
      productId: draggedProduct.id,
      fromZoneId: currentZoneId,
      toZoneId: newZoneId,
      quantity: draggedProduct.currentStock
    });

    setDraggedProduct(null);
  }

  if (productsLoading || zonesLoading) {
    return (
      <div className="h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="w-full mx-auto p-2 sm:p-4 lg:p-6 pb-20 md:pb-8 overflow-x-hidden">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center">
                  <ArrowRightLeft className="mr-2 sm:mr-3 text-blue-600" size={20} />
                  <span className="text-xl sm:text-3xl">Gestión de Inventario</span>
                  <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full sm:hidden">📱 Móvil</span>
                </h1>
                <p className="text-slate-600 text-sm sm:text-base">
                  <span className="sm:hidden">Toca y arrastra productos entre zonas</span>
                  <span className="hidden sm:inline">Arrastra y suelta productos para moverlos entre zonas</span>
                </p>
              </div>
              <div className="self-start sm:self-auto">
                <RefreshButton
                  onRefresh={async () => {
                    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/warehouse-zones"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
                  }}
                />
              </div>
            </div>

            {/* Stats - Mobile Optimized */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-8 w-full">
              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Productos</p>
                      <p className="text-base sm:text-xl font-bold text-slate-900">{stats.totalProducts}</p>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Package className="text-blue-600" size={12} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Stock Total</p>
                      <p className="text-base sm:text-xl font-bold text-slate-900">{stats.totalStock.toLocaleString()}</p>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-purple-600" size={12} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Sin Asignar</p>
                      <p className="text-base sm:text-xl font-bold text-amber-600">{stats.unassignedProducts}</p>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <MapPin className="text-amber-600" size={12} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Stock Bajo</p>
                      <p className="text-base sm:text-xl font-bold text-red-600">{stats.lowStockProducts}</p>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="text-red-600" size={12} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Categorías</p>
                      <p className="text-base sm:text-xl font-bold text-indigo-600">{stats.categoriesCount}</p>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <Filter className="text-indigo-600" size={12} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Valor Total</p>
                      <p className="text-base sm:text-xl font-bold text-green-600">
                        €{Math.round(stats.totalValue).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-green-600" size={12} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <Input
                      placeholder="Buscar productos para mover..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200"
                    />
                  </div>
                  
                  {searchQuery && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        {Object.values(productsByZone).flat().filter(product => 
                          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length} productos encontrados
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="h-6 w-6 p-0 hover:bg-slate-100"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Notice */}
          <div className="sm:hidden mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-700">
              <span className="mr-2">📱</span>
              <span className="text-sm font-medium">Versión optimizada para móvil</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">Diseño adaptado para pantallas táctiles</p>
          </div>

          {/* Zones Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 w-full overflow-x-hidden">
            {/* Unassigned Products Zone */}
            <UnassignedDropZone products={productsByZone["unassigned"] || []} />

            {/* Warehouse Zones */}
            {zones.map((zone) => (
              <div key={zone.id}>
                <DropZone
                  zone={zone}
                  products={productsByZone[zone.id.toString()] || []}
                />
              </div>
            ))}
          </div>

          {/* Instructions */}
          <Card className="border-0 bg-white/80 backdrop-blur-sm mt-8">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Instrucciones de uso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="text-green-600 mt-0.5" size={16} />
                  <span>Arrastra cualquier producto desde su zona actual</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="text-green-600 mt-0.5" size={16} />
                  <span>Suelta el producto en la zona de destino deseada</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="text-green-600 mt-0.5" size={16} />
                  <span>El sistema registrará automáticamente el movimiento</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="text-green-600 mt-0.5" size={16} />
                  <span>Usa la búsqueda para encontrar productos específicos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedProduct ? (
          <div className="bg-white rounded-lg border border-blue-300 p-4 shadow-xl opacity-90">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600">
                <AvatarFallback className="text-white font-medium text-sm">
                  {draggedProduct.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-slate-900 text-sm">{draggedProduct.name}</h3>
                <p className="text-xs text-slate-500">{draggedProduct.sku}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}