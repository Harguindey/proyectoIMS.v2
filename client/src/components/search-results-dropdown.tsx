import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import type { Product, WarehouseZone } from "@shared/schema";

interface SearchResultsDropdownProps {
  products: Product[];
  zones: WarehouseZone[];
  query: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function SearchResultsDropdown({ 
  products, 
  zones, 
  query, 
  isVisible, 
  onClose 
}: SearchResultsDropdownProps) {
  const [, setLocation] = useLocation();

  if (!isVisible || !query.trim()) {
    return null;
  }

  const getZoneName = (zoneId: number | null) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? `${zone.name} (${zone.code})` : "Sin asignar";
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) return { label: "Sin stock", color: "destructive" };
    if (product.currentStock <= product.minStock) return { label: "Stock bajo", color: "warning" };
    return { label: "Stock óptimo", color: "default" };
  };

  const handleProductClick = (productId: number) => {
    setLocation(`/product/${productId}`);
    onClose();
  };

  const handleZoneClick = (zoneId: number) => {
    setLocation(`/warehouse-map?zone=${zoneId}`);
    onClose();
  };

  const totalResults = products.length + zones.length;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-2">
      <Card className="shadow-lg border border-slate-200">
        <CardContent className="p-0">
          {totalResults === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <Package className="mx-auto h-8 w-8 mb-2 text-slate-400" />
              <p className="text-sm">No se encontraron resultados para "{query}"</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {/* Products Section */}
              {products.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Productos ({products.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {products.slice(0, 5).map((product) => {
                      const status = getStockStatus(product);
                      return (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => handleProductClick(product.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h5 className="text-sm font-medium text-slate-900 truncate">
                                  {product.name}
                                </h5>
                                <Badge variant={status.color as any} className="text-xs">
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="mt-1 flex items-center space-x-4 text-xs text-slate-500">
                                <span>SKU: {product.sku}</span>
                                <span>Stock: {product.currentStock}</span>
                                <span>{getZoneName(product.warehouseZoneId)}</span>
                              </div>
                              {product.description && (
                                <p className="mt-1 text-xs text-slate-600 truncate">
                                  {product.description}
                                </p>
                              )}
                            </div>
                            <div className="ml-3 text-right">
                              <div className="text-sm font-medium text-slate-900">
                                ${product.unitPrice || '0.00'}
                              </div>
                              <div className="text-xs text-slate-500">
                                {product.category}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {products.length > 5 && (
                      <div className="p-3 text-center">
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setLocation('/products');
                            onClose();
                          }}
                        >
                          Ver todos los productos ({products.length})
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Zones Section */}
              {zones.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Zonas del Almacén ({zones.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {zones.slice(0, 3).map((zone) => (
                      <div
                        key={zone.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleZoneClick(zone.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-slate-900">
                              {zone.name}
                            </h5>
                            <div className="mt-1 text-xs text-slate-500">
                              Código: {zone.code}
                            </div>
                            {zone.description && (
                              <p className="mt-1 text-xs text-slate-600 truncate">
                                {zone.description}
                              </p>
                            )}
                          </div>
                          <div className="ml-3 text-xs text-slate-500">
                            Capacidad: {zone.capacity || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}