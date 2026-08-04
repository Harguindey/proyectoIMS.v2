import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Package, 
  MapPin, 
  AlertTriangle, 
  DollarSign,
  Calendar,
  Truck,
  BarChart3,
  Edit,
  Trash2
} from "lucide-react";
import { useLocation } from "wouter";
import type { Product, WarehouseZone, StockMovement, Supplier } from "@shared/schema";
import ProductInventoryFlowChart from "@/components/product-inventory-flow-chart";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const productId = params?.id ? parseInt(params.id) : null;

  const { data: product, isLoading: productLoading, error: productError } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: [`/api/stock-movements/product/${productId}`],
    enabled: !!productId,
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  if (productLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (productError) {
    console.error('Product error:', productError);
  }

  console.log('Product ID:', productId);
  console.log('Product data:', product);
  console.log('Product loading:', productLoading);

  if (!product) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Producto no encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            El producto que buscas no existe o ha sido eliminado.
          </p>
          <Button className="mt-4" onClick={() => setLocation('/products')}>
            Volver a Productos
          </Button>
        </div>
      </div>
    );
  }

  const zone = zones.find(z => z.id === product.warehouseZoneId);
  const supplier = suppliers.find(s => s.id === product.supplierId);

  const getStockStatus = () => {
    if (product.currentStock === 0) return { label: "Sin stock", color: "destructive", icon: AlertTriangle };
    if (product.currentStock <= product.minStock) return { label: "Stock bajo", color: "secondary", icon: AlertTriangle };
    return { label: "Stock óptimo", color: "default", icon: Package };
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/products')}
              className="flex items-center min-h-[44px] min-w-[44px] px-3"
              data-testid="button-back"
            >
              <ArrowLeft size={18} className="sm:mr-1" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">
                {product?.name || 'Cargando...'}
              </h1>
              <p className="text-xs md:text-sm text-slate-600 truncate">
                SKU: {product?.sku || 'Cargando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 justify-end">
            <Button variant="outline" size="sm" className="min-h-[44px] px-4" data-testid="button-edit">
              <Edit size={18} className="sm:mr-2" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button variant="outline" size="sm" className="min-h-[44px] px-4" data-testid="button-delete">
              <Trash2 size={18} className="sm:mr-2" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Product Information */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Producto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm font-medium text-slate-600">Nombre</label>
                    <p className="text-sm md:text-lg text-slate-900 break-words">{product.name || 'Sin nombre'}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-medium text-slate-600">SKU</label>
                    <p className="text-sm md:text-lg text-slate-900 font-mono break-all">{product.sku || 'Sin SKU'}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-medium text-slate-600">Categoría</label>
                    <p className="text-sm md:text-lg text-slate-900 capitalize">{product.category || 'Sin categoría'}</p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-medium text-slate-600">Precio Unitario</label>
                    <p className="text-sm md:text-lg text-slate-900 font-semibold">${product.unitPrice || '0.00'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600">Descripción</label>
                  <p className="text-xs md:text-sm text-slate-900 leading-relaxed break-words">
                    {product.description && product.description.trim() ? product.description : 'Sin descripción disponible'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stock Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <StatusIcon size={20} className="mr-2" />
                  Información de Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl md:text-3xl font-bold text-blue-600">{product.currentStock}</div>
                    <div className="text-xs md:text-sm text-blue-700 font-medium">Stock Actual</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-amber-50 rounded-lg">
                    <div className="text-2xl md:text-3xl font-bold text-amber-600">{product.minStock}</div>
                    <div className="text-xs md:text-sm text-amber-700 font-medium">Stock Mínimo</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-slate-50 rounded-lg">
                    <div className="mb-2">
                      <Badge 
                        variant={stockStatus.color as any} 
                        className={`text-xs md:text-sm ${stockStatus.color === 'secondary' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}`}
                      >
                        {stockStatus.label}
                      </Badge>
                    </div>
                    <div className="text-xs md:text-sm text-slate-600 font-medium">Estado</div>
                  </div>
                </div>

                <Separator className="my-3 md:my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="p-2 md:p-3 border border-slate-200 rounded-lg">
                    <label className="text-xs md:text-sm font-medium text-slate-600">Punto de Reorden</label>
                    <p className="text-sm md:text-lg font-semibold text-slate-900">{product.reorderPoint || 'No definido'}</p>
                  </div>
                  <div className="p-2 md:p-3 border border-slate-200 rounded-lg">
                    <label className="text-xs md:text-sm font-medium text-slate-600">Cantidad de Orden</label>
                    <p className="text-sm md:text-lg font-semibold text-slate-900">{product.orderQuantity || 'No definido'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Movements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 size={20} className="mr-2" />
                  Movimientos Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {movements.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Sin movimientos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No hay movimientos registrados para este producto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {movements.slice(0, 5).map((movement) => (
                      <div key={movement.id} className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-lg gap-2">
                        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                          <div className={`w-7 h-7 md:w-8 md:h-8 flex-shrink-0 rounded-full flex items-center justify-center ${
                            movement.type === 'entry' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            <span className="text-sm md:text-base">{movement.type === 'entry' ? '+' : '-'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm font-medium truncate">
                              {movement.type === 'entry' ? 'Entrada' : 'Salida'}
                            </p>
                            <p className="text-xs text-slate-600">
                              {new Date(movement.createdAt!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs md:text-sm font-medium">{movement.quantity} ud</p>
                          {movement.reason && (
                            <p className="text-xs text-slate-600 hidden md:block truncate max-w-[120px]">{movement.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin size={20} className="mr-2" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Zona</label>
                    <p className="text-lg text-slate-900">{zone ? zone.name : 'Sin zona asignada'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Código</label>
                    <p className="text-lg text-slate-900 font-mono">{zone ? zone.code : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Descripción</label>
                    <p className="text-sm text-slate-900">
                      {zone && zone.description ? zone.description : 'Sin descripción'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Capacidad</label>
                    <p className="text-sm text-slate-900">{zone ? zone.capacity || 'No definida' : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supplier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck size={20} className="mr-2" />
                  Proveedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supplier ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Nombre</label>
                      <p className="text-lg text-slate-900">{supplier.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Email</label>
                      <p className="text-sm text-slate-900">{supplier.contactEmail || 'No especificado'}</p>
                    </div>
                    {supplier.contactPhone && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Teléfono</label>
                        <p className="text-sm text-slate-900">{supplier.contactPhone}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-slate-600">Tiempo de Entrega</label>
                      <p className="text-sm text-slate-900">{supplier.leadTimeDays} días</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Truck className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-slate-500 mt-2">Sin proveedor asignado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign size={20} className="mr-2" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Valor en Stock</span>
                    <span className="text-sm font-medium">
                      ${(parseFloat(product.unitPrice || '0') * product.currentStock).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Fecha de Creación</span>
                    <span className="text-sm font-medium">
                      {new Date(product.createdAt!).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Movimientos</span>
                    <span className="text-sm font-medium">{movements.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Inventory Flow Chart - Full Width */}
        <div className="mt-8">
          <ProductInventoryFlowChart productId={productId!} />
        </div>
      </main>
    </div>
  );
}