import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Activity, Zap, Target, Clock, Dumbbell, Waves, Mountain, Shirt } from "lucide-react";
import type { WarehouseZone, Product } from "@shared/schema";

interface WarehouseMapGridProps {
  zones: WarehouseZone[];
  products: Product[];
}

export default function WarehouseMapGrid({ zones, products }: WarehouseMapGridProps) {
  const [, setLocation] = useLocation();
  
  const getZoneProducts = (zoneId: number) => {
    return products.filter(p => p.warehouseZoneId === zoneId);
  };

  const getZoneIcon = (zoneCode: string) => {
    const iconClass = "w-5 h-5";
    switch (zoneCode) {
      case 'FUTBOL': return <Activity className={`${iconClass} text-green-600`} />;
      case 'BASKET': return <Target className={`${iconClass} text-orange-600`} />;
      case 'TENIS': return <Zap className={`${iconClass} text-yellow-600`} />;
      case 'ATLETISMO': return <Clock className={`${iconClass} text-red-600`} />;
      case 'FITNESS': return <Dumbbell className={`${iconClass} text-purple-600`} />;
      case 'NATACION': return <Waves className={`${iconClass} text-blue-600`} />;
      case 'OUTDOOR': return <Mountain className={`${iconClass} text-emerald-600`} />;
      case 'TEXTIL': return <Shirt className={`${iconClass} text-pink-600`} />;
      default: return <Activity className={`${iconClass} text-gray-600`} />;
    }
  };

  const getZoneUtilization = (zone: WarehouseZone) => {
    return Math.round((zone.currentOccupancy / zone.capacity) * 100);
  };

  const getZoneGradient = (zoneCode: string) => {
    switch (zoneCode) {
      case 'FUTBOL': return 'from-green-50 to-green-100 border-green-200 hover:shadow-green-100';
      case 'BASKET': return 'from-orange-50 to-orange-100 border-orange-200 hover:shadow-orange-100';
      case 'TENIS': return 'from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-yellow-100';
      case 'ATLETISMO': return 'from-red-50 to-red-100 border-red-200 hover:shadow-red-100';
      case 'FITNESS': return 'from-purple-50 to-purple-100 border-purple-200 hover:shadow-purple-100';
      case 'NATACION': return 'from-blue-50 to-blue-100 border-blue-200 hover:shadow-blue-100';
      case 'OUTDOOR': return 'from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-emerald-100';
      case 'TEXTIL': return 'from-pink-50 to-pink-100 border-pink-200 hover:shadow-pink-100';
      default: return 'from-gray-50 to-gray-100 border-gray-200 hover:shadow-gray-100';
    }
  };

  return (
    <div className="w-full">
      {/* Modern Clean Layout */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapa de Almacén SportMax Pro</h3>
          <p className="text-sm text-gray-500">Layout de zonas especializadas por categoría deportiva</p>
        </div>

        {/* Warehouse Layout - 4x2 Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {zones && zones.length > 0 ? (zones.map((zone) => {
            const zoneProducts = getZoneProducts(zone.id);
            const utilization = getZoneUtilization(zone);
            const lowStockCount = zoneProducts.filter(p => p.currentStock <= p.minStock).length;
            
            return (
              <Card
                key={zone.id}
                className={`relative bg-gradient-to-br ${getZoneGradient(zone.code)} border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105`}
                onClick={() => setLocation(`/zone/${zone.id}`)}
              >
                <div className="p-4">
                  {/* Zone Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getZoneIcon(zone.code)}
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {zone.code}
                      </span>
                    </div>
                    {lowStockCount > 0 && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                  </div>

                  {/* Zone Name */}
                  <h4 className="font-semibold text-gray-900 text-sm mb-2 leading-tight">
                    {zone.name}
                  </h4>

                  {/* Statistics */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Productos:</span>
                      <span className="font-medium text-gray-900">{zoneProducts.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Capacidad:</span>
                      <span className="font-medium text-gray-900">{utilization}%</span>
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          utilization >= 80 ? 'bg-red-500' : 
                          utilization >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Low Stock Warning */}
                  {lowStockCount > 0 && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ⚠ {lowStockCount} con stock bajo
                    </div>
                  )}
                </div>
              </Card>
            );
          })) : (
            <div className="col-span-4 text-center py-8 text-gray-500">
              <div className="text-lg mb-2">🏭</div>
              <p>Cargando mapa del almacén...</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{zones?.length || 0}</div>
            <div className="text-xs text-gray-500">Zonas Activas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{products?.length || 0}</div>
            <div className="text-xs text-gray-500">Productos Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {zones?.reduce((sum, z) => sum + z.capacity, 0) || 0}
            </div>
            <div className="text-xs text-gray-500">Capacidad Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-emerald-600">
              {zones && zones.length > 0 ? Math.round(
                (zones.reduce((sum, z) => sum + (z.currentOccupancy / z.capacity), 0) / zones.length) * 100
              ) : 0}%
            </div>
            <div className="text-xs text-gray-500">Utilización Promedio</div>
          </div>
        </div>
      </div>
    </div>
  );
}
