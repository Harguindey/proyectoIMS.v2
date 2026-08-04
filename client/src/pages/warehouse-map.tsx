import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WarehouseMapGrid from "@/components/warehouse-map-grid";
import AddZoneModal from "@/components/add-zone-modal";
import { Search, Expand, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import type { Product, WarehouseZone } from "@shared/schema";

export default function WarehouseMap() {
  const [showAddZone, setShowAddZone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [isExpandedView, setIsExpandedView] = useState(false);
  const { isMobile } = useDeviceDetection();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedZone === "all") return matchesSearch;
    
    const zone = zones.find(z => z.id === product.warehouseZoneId);
    return matchesSearch && zone?.code.startsWith(selectedZone);
  });

  const getZoneStats = (zoneCode: string) => {
    const zone = zones.find(z => z.code === zoneCode);
    const zoneProducts = products.filter(p => {
      const productZone = zones.find(z => z.id === p.warehouseZoneId);
      return productZone?.code === zoneCode;
    });
    
    return {
      zone,
      totalProducts: zoneProducts.length,
      totalStock: zoneProducts.reduce((sum, p) => sum + p.currentStock, 0),
      lowStockCount: zoneProducts.filter(p => p.currentStock <= p.minStock).length,
    };
  };

  if (productsLoading || zonesLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className={`bg-white border-b border-slate-200 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
        <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
          <div>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-slate-900`}>
              {isMobile ? 'Mapa Almacén' : 'Mapa del Almacén'}
            </h2>
            {!isMobile && <p className="text-sm text-slate-500">Vista interactiva de todas las zonas</p>}
          </div>
          <div className={`${isMobile ? 'space-y-3' : 'flex items-center space-x-3'}`}>
            {/* Search and Filters */}
            <div className={`${isMobile ? 'space-y-2' : 'flex items-center space-x-3'}`}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={isMobile ? "Buscar..." : "Buscar producto..."}
                  className={`${isMobile ? 'w-full' : 'w-64'} pl-9 ${isMobile ? 'h-10' : 'h-9'} text-sm`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar productos en el mapa"
                  data-testid="input-search-products"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              </div>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className={`${isMobile ? 'w-full h-10' : 'w-40 h-9'} text-sm`} aria-label="Filtrar por zona" data-testid="select-zone-filter">
                  <SelectValue placeholder="Zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.code}>
                      {zone.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Action Buttons */}
            <div className={`${isMobile ? 'flex space-x-2' : 'flex items-center space-x-3'}`}>
              <Button 
                onClick={() => setShowAddZone(true)} 
                size="sm" 
                className={`${isMobile ? 'flex-1 h-10' : 'h-9'}`}
                aria-label="Agregar nueva zona"
                data-testid="button-add-zone"
              >
                <Plus className={`h-4 w-4 ${isMobile ? '' : 'mr-1'}`} />
                {isMobile ? '' : 'Zona'}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className={`${isMobile ? 'flex-1 h-10' : 'h-9'}`}
                onClick={() => setIsExpandedView(!isExpandedView)}
                aria-label={isMobile ? (isExpandedView ? "Ocultar estadísticas" : "Mostrar estadísticas") : (isExpandedView ? "Vista compacta" : "Vista expandida")}
                data-testid="button-toggle-view"
              >
                <Expand size={14} className={isMobile ? '' : 'mr-1'} />
                {isMobile ? '' : (isExpandedView ? "Compacto" : "Expandir")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'p-4' : 'p-8'} bg-slate-50`}>
        <div className={`${isMobile ? 'space-y-4' : `grid grid-cols-1 gap-8 ${isExpandedView ? 'xl:grid-cols-1' : 'xl:grid-cols-4'}`}`}>
          {/* Warehouse Map */}
          <div className={!isMobile ? (isExpandedView ? 'xl:col-span-1' : 'xl:col-span-3') : ''}>
            <Card>
              <CardHeader className={isMobile ? 'pb-3' : ''}>
                <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-base' : 'text-lg'}`}>
                  {isMobile ? 'Plano' : 'Plano del Almacén'}
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-normal text-slate-500`}>
                    {zones.length} zonas{!isMobile && ` • ${products.length} productos`}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <WarehouseMapGrid zones={zones} products={filteredProducts} />
              </CardContent>
            </Card>
          </div>

          {/* Zone Details Panel */}
          {(isMobile ? !isExpandedView : !isExpandedView) && (
            <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
              {/* Zone Statistics */}
              <Card>
                <CardHeader className={isMobile ? 'pb-3' : ''}>
                  <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>
                    {isMobile ? 'Estadísticas' : 'Estadísticas por Zona'}
                  </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'space-y-3' : 'space-y-4'}>
                  {zones.slice(0, isMobile ? 3 : 5).map((zone) => {
                    const stats = getZoneStats(zone.code);
                    const utilization = zone.capacity > 0 ? (zone.currentOccupancy / zone.capacity) * 100 : 0;
                    
                    return (
                      <div key={zone.id} className={`border rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                        <div className={`flex items-center justify-between ${isMobile ? 'mb-1' : 'mb-2'}`}>
                          <h4 className={`font-medium text-slate-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                            {isMobile ? zone.code : zone.name}
                          </h4>
                          {!isMobile && <span className="text-xs text-slate-500">{zone.code}</span>}
                        </div>
                        <div className={`${isMobile ? 'space-y-0.5' : 'space-y-1'} ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          <div className="flex justify-between">
                            <span className="text-slate-600">{isMobile ? 'Prod:' : 'Productos:'}</span>
                            <span className="font-medium">{stats.totalProducts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">{isMobile ? 'Stock:' : 'Stock total:'}</span>
                            <span className="font-medium">{stats.totalStock}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">{isMobile ? 'Util:' : 'Utilización:'}</span>
                            <span className={`font-medium ${utilization > 80 ? 'text-warning' : 'text-accent'}`}>
                              {Math.round(utilization)}%
                            </span>
                          </div>
                          {stats.lowStockCount > 0 && (
                            <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-destructive`}>
                              ⚠ {stats.lowStockCount} stock bajo
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Zone Capacity Overview */}
              {!isMobile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Capacidad General</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total zonas:</span>
                        <span className="font-medium">{zones.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Capacidad total:</span>
                        <span className="font-medium">
                          {zones.reduce((sum, z) => sum + z.capacity, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Ocupación actual:</span>
                        <span className="font-medium">
                          {zones.reduce((sum, z) => sum + z.currentOccupancy, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Utilización promedio:</span>
                        <span className="font-medium text-accent">
                          {Math.round(
                            (zones.reduce((sum, z) => sum + (z.currentOccupancy / z.capacity), 0) / zones.length) * 100
                          )}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <AddZoneModal 
        open={showAddZone} 
        onOpenChange={setShowAddZone} 
      />
    </div>
  );
}
