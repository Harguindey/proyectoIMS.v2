import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import WarehouseMapGrid from "@/components/warehouse-map-grid";
import AddProductModal from "@/components/add-product-modal";
import StockMovementModal from "@/components/stock-movement-modal";
import SmartRecommendations from "@/components/smart-recommendations";
import { PredictiveSuggestions } from "@/components/PredictiveSuggestions";
import SearchResultsDropdown from "@/components/search-results-dropdown";
import AlertsModal from "@/components/alerts-modal";
import ChartThemeSelector from "@/components/chart-theme-selector";
import AdvancedAnalytics from "@/components/advanced-analytics";
import { ChartSkeleton } from "@/components/loading/chart-skeleton";
import { CardSkeleton } from "@/components/loading/card-skeleton";
import { LoadingSpinner } from "@/components/loading/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { 
  Package, 
  AlertTriangle, 
  ArrowUpDown, 
  MapPin, 
  Search, 
  Bell, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  FileText,
  Expand,
  TrendingUp,
  BarChart3,
  Activity,
  Warehouse,
  ShoppingCart
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useMemo } from "react";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import type { Product, StockMovement, WarehouseZone } from "@shared/schema";

export default function Dashboard() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showStockMovement, setShowStockMovement] = useState(false);
  const [movementType, setMovementType] = useState<"entry" | "exit">("entry");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());

  // Device detection
  const { isMobile, isTablet, isDesktop, screenWidth } = useDeviceDetection();

  // Chart theme management
  const { currentTheme, changeTheme, colors } = useChartTheme();

  // Data queries
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: lowStockProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products/low-stock"],
  });

  const { data: recentMovements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements/recent"],
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  // Filtered search results
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.code.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 3);

  // Generate alerts function
  const generateAlerts = () => {
    const generatedAlerts: Array<{id: string, read: boolean}> = [];

    // Low stock alerts
    lowStockProducts.forEach((product) => {
      generatedAlerts.push({
        id: `low-stock-${product.id}`,
        read: false,
      });
    });

    // Zone capacity alerts
    zones.forEach((zone) => {
      const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
      const totalStock = zoneProducts.reduce((sum, p) => sum + p.currentStock, 0);
      
      if (totalStock > zone.capacity * 0.8) {
        generatedAlerts.push({
          id: `zone-capacity-${zone.id}`,
          read: false,
        });
      }
    });

    return generatedAlerts;
  };

  const alerts = generateAlerts();
  const unreadAlertsCount = alerts.filter(alert => !readAlerts.has(alert.id)).length;

  // Analytics data preparation
  const categoryData = useMemo(() => {
    const categories = products.reduce((acc: Record<string, number>, product) => {
      const category = product.category || "Sin categoría";
      acc[category] = (acc[category] || 0) + product.currentStock;
      return acc;
    }, {});

    return Object.entries(categories).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: Math.round((value / products.reduce((sum, p) => sum + p.currentStock, 0)) * 100)
    }));
  }, [products]);

  const zoneUtilizationData = useMemo(() => {
    return zones.map(zone => {
      const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
      const totalStock = zoneProducts.reduce((sum, p) => sum + p.currentStock, 0);
      const maxCapacity = zone.capacity || 1000;
      return {
        name: zone.name.substring(0, 10),
        utilizacion: Math.round((totalStock / maxCapacity) * 100),
        productos: zoneProducts.length,
        stock: totalStock
      };
    });
  }, [zones, products]);

  // Calculate real active zones metrics
  const activeZonesData = useMemo(() => {
    const zonesWithProducts = zones.filter(zone => 
      products.some(product => product.warehouseZoneId === zone.id && product.currentStock > 0)
    );
    
    const totalZones = zones.length;
    const activeZones = zonesWithProducts.length;
    const utilizationRate = totalZones > 0 ? Math.round((activeZones / totalZones) * 100) : 0;
    
    return {
      activeZones,
      totalZones,
      utilizationRate,
      activeZonesText: `${activeZones}/${totalZones}`
    };
  }, [zones, products]);

  const openStockMovement = (type: "entry" | "exit") => {
    setMovementType(type);
    setShowStockMovement(true);
  };

  if (metricsLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-full overflow-y-auto bg-slate-100">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-slate-100 px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:gap-4">
          <div className="space-y-1">
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-slate-900`}>
              {isMobile ? 'Dashboard' : 'Dashboard de Control'}
            </h1>
            {!isMobile && (
              <p className="text-slate-600">Resumen general del sistema de inventario</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:flex-initial">
              <Input
                type="text"
                placeholder={isMobile ? "Buscar..." : "Buscar productos o zonas..."}
                className={`${isMobile ? 'w-full' : 'w-80'} pl-10 pr-4 h-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              {searchQuery && (
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {filteredProducts.length + filteredZones.length}
                </span>
              )}
              <SearchResultsDropdown
                products={filteredProducts}
                zones={filteredZones}
                query={searchQuery}
                isVisible={showSearchResults}
                onClose={() => setShowSearchResults(false)}
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative p-2 h-10 w-10 flex-shrink-0"
              onClick={() => setShowAlerts(true)}
            >
              <Bell size={18} className="text-slate-600" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto bg-slate-50 ${isMobile ? 'p-4' : 'p-6'} space-y-6 md:space-y-8`}>
        
        {/* ===== RESUMEN GENERAL ===== */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-blue-600" size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Resumen General</h2>
          </div>
          
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'}`}>
            <Link href="/products" aria-label="Abrir listado de productos">
            <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer h-full">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile ? 'flex-col items-start space-y-2' : 'items-center justify-between'}`}>
                  <div className={`${isMobile ? 'space-y-1' : 'space-y-2'} flex-1`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Total Productos</p>
                    {metricsLoading ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-slate-900`}>{(metrics as any)?.totalProducts || 0}</p>
                    )}
                    {!isMobile && (
                      <div className="flex items-center text-sm">
                        <span className="text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md">Abrir</span>
                        <span className="text-slate-500 ml-2">catálogo</span>
                      </div>
                    )}
                  </div>
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} bg-blue-50 rounded-xl flex items-center justify-center ${isMobile ? 'self-end -mt-6' : ''}`}>
                    <Package className="text-blue-600" size={isMobile ? 18 : 24} />
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>

            <Link href="/products" aria-label="Revisar productos con stock bajo">
            <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer h-full">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile ? 'flex-col items-start space-y-2' : 'items-center justify-between'}`}>
                  <div className={`${isMobile ? 'space-y-1' : 'space-y-2'} flex-1`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Stock Bajo</p>
                    {metricsLoading ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-amber-600`}>{(metrics as any)?.lowStock || 0}</p>
                    )}
                    {!isMobile && (
                      <div className="flex items-center text-sm">
                        <span className="text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">Revisar</span>
                        <span className="text-slate-500 ml-2">requiere atención</span>
                      </div>
                    )}
                  </div>
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} bg-amber-50 rounded-xl flex items-center justify-center ${isMobile ? 'self-end -mt-6' : ''}`}>
                    <AlertTriangle className="text-amber-600" size={isMobile ? 18 : 24} />
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>

            <Link href="/movements" aria-label="Abrir movimientos de stock">
            <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer h-full">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile ? 'flex-col items-start space-y-2' : 'items-center justify-between'}`}>
                  <div className={`${isMobile ? 'space-y-1' : 'space-y-2'} flex-1`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Movimientos Hoy</p>
                    {movementsLoading ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-slate-900`}>{(metrics as any)?.todayMovements || 0}</p>
                    )}
                    {!isMobile && (
                      <div className="flex items-center text-sm">
                        <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded-md">Ver</span>
                        <span className="text-slate-500 ml-2">día productivo</span>
                      </div>
                    )}
                  </div>
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} bg-green-50 rounded-xl flex items-center justify-center ${isMobile ? 'self-end -mt-6' : ''}`}>
                    <Activity className="text-green-600" size={isMobile ? 18 : 24} />
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>

            <Link href="/warehouse-map" aria-label="Abrir mapa de almacén">
            <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer h-full">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className={`flex ${isMobile ? 'flex-col items-start space-y-2' : 'items-center justify-between'}`}>
                  <div className={`${isMobile ? 'space-y-1' : 'space-y-2'} flex-1`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Zonas Activas</p>
                    {zonesLoading ? (
                      <Skeleton className="h-6 w-16" />
                    ) : (
                      <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-slate-900`}>{activeZonesData.activeZonesText}</p>
                    )}
                    {!isMobile && (
                      <div className="flex items-center text-sm">
                        <span className="text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-md">{activeZonesData.utilizationRate}%</span>
                        <span className="text-slate-500 ml-2">utilización</span>
                      </div>
                    )}
                  </div>
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} bg-purple-50 rounded-xl flex items-center justify-center ${isMobile ? 'self-end -mt-6' : ''}`}>
                    <Warehouse className="text-purple-600" size={isMobile ? 18 : 24} />
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          </div>
        </section>

        {/* ===== ACCIONES RÁPIDAS ===== */}
        <section>
          <div className={`flex items-center gap-3 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-green-100 rounded-lg flex items-center justify-center`}>
              <Plus className="text-green-600" size={isMobile ? 14 : 18} />
            </div>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-slate-900`}>Acciones Rápidas</h2>
          </div>
          
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
            <Button 
              onClick={() => setShowAddProduct(true)} 
              className={`${isMobile ? 'h-14 flex-col text-xs px-2' : 'h-16 justify-start gap-3'} bg-blue-600 hover:bg-blue-700 text-white shadow-lg`}
            >
              <Plus size={isMobile ? 18 : 20} />
              <span className="font-medium">{isMobile ? 'Añadir' : 'Añadir Producto'}</span>
            </Button>
            
            <Button 
              onClick={() => openStockMovement("entry")} 
              variant="outline"
              className={`${isMobile ? 'h-14 flex-col text-xs px-2' : 'h-16 justify-start gap-3'} border-green-200 hover:bg-green-50 text-green-700 shadow-lg`}
            >
              <ArrowUp size={isMobile ? 18 : 20} />
              <span className="font-medium">{isMobile ? 'Entrada' : 'Entrada de Stock'}</span>
            </Button>
            
            <Button 
              onClick={() => openStockMovement("exit")} 
              variant="outline"
              className={`${isMobile ? 'h-14 flex-col text-xs px-2' : 'h-16 justify-start gap-3'} border-orange-200 hover:bg-orange-50 text-orange-700 shadow-lg`}
            >
              <ArrowDown size={isMobile ? 18 : 20} />
              <span className="font-medium">{isMobile ? 'Salida' : 'Salida de Stock'}</span>
            </Button>
            
            <Link href="/reports">
              <Button 
                variant="outline"
                className={`${isMobile ? 'h-14 flex-col text-xs px-2' : 'h-16 justify-start gap-3'} w-full border-purple-200 hover:bg-purple-50 text-purple-700 shadow-lg`}
              >
                <FileText size={isMobile ? 18 : 20} />
                <span className="font-medium">{isMobile ? 'Reportes' : 'Ver Reportes'}</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* ===== MAPA DEL ALMACÉN ===== */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <MapPin className="text-indigo-600" size={18} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Mapa del Almacén</h2>
            </div>
            <Link href="/warehouse-map">
              <Button variant="outline" size="sm" className="gap-2">
                <Expand size={16} />
                Ver Completo
              </Button>
            </Link>
          </div>
          
          <Card className="bg-white border border-slate-200/70 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl">
            <CardContent className="p-6">
              <WarehouseMapGrid zones={zones} products={products} />
            </CardContent>
          </Card>
        </section>

        {/* ===== ANÁLISIS Y GRÁFICOS ===== */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-emerald-600" size={18} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Análisis de Inventario</h2>
            </div>
            <ChartThemeSelector currentTheme={currentTheme.name} onThemeChange={changeTheme} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution by Category */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Distribución por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <ChartSkeleton />
                ) : categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    No hay datos de categorías disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Zone Utilization */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Utilización de Zonas</CardTitle>
              </CardHeader>
              <CardContent>
                {zonesLoading ? (
                  <ChartSkeleton />
                ) : zoneUtilizationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={zoneUtilizationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="utilizacion" fill={colors[1]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    No hay datos de zonas disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ===== RECOMENDACIONES INTELIGENTES ===== */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-orange-600" size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Recomendaciones Inteligentes</h2>
          </div>
          
          <SmartRecommendations />
        </section>

        {/* ===== SUGERENCIAS PREDICTIVAS CON IA ===== */}
        <section>
          <PredictiveSuggestions />
        </section>

        {/* ===== ANÁLISIS AVANZADO ===== */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-violet-600" size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Análisis Avanzado</h2>
          </div>
          
          <AdvancedAnalytics />
        </section>
      </main>
    </div>

      {/* Modals */}
      <AddProductModal 
        open={showAddProduct} 
        onOpenChange={setShowAddProduct}
      />

      <StockMovementModal 
        open={showStockMovement} 
        onOpenChange={setShowStockMovement}
        type={movementType}
      />

      <AlertsModal
        open={showAlerts}
        onOpenChange={setShowAlerts}
        readAlerts={readAlerts}
        onMarkAsRead={(alertId) => {
          setReadAlerts(prev => new Set(Array.from(prev).concat(alertId)));
        }}
      />
    </>
  );
}
