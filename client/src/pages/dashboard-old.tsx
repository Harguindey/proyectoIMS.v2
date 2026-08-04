import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import WarehouseMapGrid from "@/components/warehouse-map-grid";
import AddProductModal from "@/components/add-product-modal";
import StockMovementModal from "@/components/stock-movement-modal";
import SmartRecommendations from "@/components/smart-recommendations";
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
  BarChart
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useMemo } from "react";
import type { Product, StockMovement, WarehouseZone } from "@shared/schema";

export default function Dashboard() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showStockMovement, setShowStockMovement] = useState(false);
  const [movementType, setMovementType] = useState<"entry" | "exit">("entry");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());

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

  // Generate alerts function (similar to alerts modal)
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

    // Recent unusual movements
    const today = new Date();
    const unusualMovements = recentMovements.filter(movement => {
      const movementDate = new Date(movement.createdAt!);
      const diffHours = (today.getTime() - movementDate.getTime()) / (1000 * 60 * 60);
      return diffHours < 24 && movement.quantity > 100;
    });

    unusualMovements.forEach((movement) => {
      generatedAlerts.push({
        id: `movement-${movement.id}`,
        read: false,
      });
    });

    return generatedAlerts.map(alert => ({
      ...alert,
      read: readAlerts.has(alert.id)
    }));
  };

  const allAlerts = generateAlerts();
  const unreadAlertsCount = allAlerts.filter(alert => !alert.read).length;

  // Handle marking alerts as read - synced with modal
  const markAsRead = (alertId: string) => {
    setReadAlerts(prev => new Set([...Array.from(prev), alertId]));
  };

  const markAllAsRead = () => {
    const allAlertIds = allAlerts.map(alert => alert.id);
    setReadAlerts(new Set(allAlertIds));
  };
  
  // Filter products and zones based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim() || products.length === 0) return products;
    
    const query = searchQuery.toLowerCase().trim();
    return products.filter(product => {
      const nameMatch = product.name && product.name.toLowerCase().includes(query);
      const skuMatch = product.sku && product.sku.toLowerCase().includes(query);
      const categoryMatch = product.category && product.category.toLowerCase().includes(query);
      const descriptionMatch = product.description && product.description.toLowerCase().includes(query);
      
      return nameMatch || skuMatch || categoryMatch || descriptionMatch;
    });
  }, [products, searchQuery]);
  
  const filteredZones = useMemo(() => {
    if (!searchQuery.trim() || zones.length === 0) return zones;
    
    const query = searchQuery.toLowerCase().trim();
    return zones.filter(zone => {
      const nameMatch = zone.name && zone.name.toLowerCase().includes(query);
      const codeMatch = zone.code && zone.code.toLowerCase().includes(query);
      const descriptionMatch = zone.description && zone.description.toLowerCase().includes(query);
      
      return nameMatch || codeMatch || descriptionMatch;
    });
  }, [zones, searchQuery]);

  // Filter recent products based on search
  const recentProducts = useMemo(() => {
    const filtered = searchQuery.trim() ? filteredProducts : products;
    return filtered.slice(0, 5);
  }, [filteredProducts, products, searchQuery]);

  // Chart data preparation
  const stockMovementData = recentMovements.slice(0, 7).reverse().map((movement, index) => {
    return {
      name: `Día ${index + 1}`,
      entradas: movement.type === 'entry' ? movement.quantity : 0,
      salidas: movement.type === 'exit' ? movement.quantity : 0,
      fecha: new Date(movement.createdAt!).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    };
  });

  const categoryDistribution = products.reduce((acc, product) => {
    const category = product.category || 'Sin categoría';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.value += 1;
      existing.stock += product.currentStock;
    } else {
      acc.push({
        name: category,
        value: 1,
        stock: product.currentStock,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      });
    }
    return acc;
  }, [] as Array<{name: string, value: number, stock: number, color: string}>).map(item => {
    const percentage = ((item.value / products.length) * 100).toFixed(1);
    return {
      ...item,
      percentage: parseFloat(percentage),
      label: `${item.name} (${percentage}%)`
    };
  });

  const zoneUtilization = zones.map(zone => {
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

  const stockLevels = products.slice(0, 8).map(product => ({
    name: product.name.substring(0, 8),
    actual: product.currentStock,
    minimo: product.minStock,
    estado: product.currentStock <= product.minStock ? 'Bajo' : 'Normal'
  }));

  // Use theme colors instead of static colors
  const CHART_COLORS = colors;

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
      {/* Top Bar */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100 px-3 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-3xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium">Control y análisis del inventario</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Input
                type="text"
                placeholder="Buscar productos..."
                className="w-full sm:w-96 pl-8 sm:pl-10 pr-12 sm:pr-16 h-9 sm:h-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 text-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                data-tour="search"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
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
              className="relative p-2 h-10 w-10"
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
      <main className="flex-1 overflow-auto overflow-x-hidden bg-slate-50/30 p-3 sm:p-8 pb-20 md:pb-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-slate-500">Total Productos</p>
                  {metricsLoading ? (
                    <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
                  ) : (
                    <p className="text-lg sm:text-2xl font-bold text-slate-900">{(metrics as any)?.totalProducts || 0}</p>
                  )}
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="text-blue-600" size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-md">+12%</span>
                <span className="text-slate-500 ml-2">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Stock Bajo</p>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-amber-600">{(metrics as any)?.lowStock || 0}</p>
                  )}
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="text-amber-600" size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-md">Crítico</span>
                <span className="text-slate-500 ml-2">requiere atención</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Movimientos Hoy</p>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{(metrics as any)?.todayMovements || 0}</p>
                  )}
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center">
                  <ArrowUpDown className="text-green-600" size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-md">+8%</span>
                <span className="text-slate-500 ml-2">vs ayer</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Zonas Activas</p>
                  {zonesLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{activeZonesData.activeZonesText}</p>
                  )}
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center">
                  <MapPin className="text-purple-600" size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-md">{activeZonesData.utilizationRate}%</span>
                <span className="text-slate-500 ml-2">utilización</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Warehouse Map */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-slate-900">Mapa del Almacén</h3>
                    <p className="text-sm text-slate-500">Vista general de zonas y ocupación</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Select>
                      <SelectTrigger className="w-48 h-9">
                        <SelectValue placeholder="Todas las zonas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las zonas</SelectItem>
                        <SelectItem value="A">Zona A</SelectItem>
                        <SelectItem value="B">Zona B</SelectItem>
                        <SelectItem value="C">Zona C</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-9" asChild>
                      <Link href="/warehouse-map">
                        <Expand size={16} className="mr-2" />
                        Ver completo
                      </Link>
                    </Button>
                  </div>
                </div>
                <WarehouseMapGrid zones={filteredZones} products={filteredProducts} />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Smart Recommendations Widget */}
            <SmartRecommendations />
            
            {/* Activity Panel */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Actividad Reciente</h3>
                <div className="space-y-3">
                  {recentMovements.slice(0, 2).map((movement) => {
                    const product = filteredProducts.find(p => p.id === movement.productId) || products.find(p => p.id === movement.productId);
                    const zone = filteredZones.find(z => z.id === movement.toZoneId) || zones.find(z => z.id === movement.toZoneId);
                    
                    return (
                      <div key={movement.id} className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          movement.type === 'entry' ? 'bg-accent' : movement.type === 'exit' ? 'bg-warning' : 'bg-blue-500'
                        }`}>
                          {movement.type === 'entry' ? (
                            <ArrowUp className="text-white" size={10} />
                          ) : movement.type === 'exit' ? (
                            <ArrowDown className="text-white" size={10} />
                          ) : (
                            <ArrowUpDown className="text-white" size={10} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-900 font-medium">
                            {movement.type === 'entry' ? 'Entrada' : 
                             movement.type === 'exit' ? 'Salida' : 'Transferencia'}
                          </p>
                          <p className="text-xs text-slate-600">{product?.name || 'Producto desconocido'}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(movement.createdAt!).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-primary">
                  Ver más <ArrowUpDown size={14} className="ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Alertas de Stock</h3>
                  <span className="bg-destructive text-white text-xs px-2 py-1 rounded-full">
                    {lowStockProducts.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {lowStockProducts.slice(0, 2).map((product) => {
                    const zone = zones.find(z => z.id === product.warehouseZoneId);
                    return (
                      <div key={product.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-600">
                            Stock: {product.currentStock}/{product.minStock}
                          </p>
                        </div>
                        <Button size="sm" variant="destructive">
                          Reabastecer
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Dashboard Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Análisis y Tendencias</h2>
              <p className="text-sm text-slate-600">Visualización avanzada de datos del inventario</p>
            </div>
            <div className="flex items-center space-x-4">
              <ChartThemeSelector 
                currentTheme={currentTheme.id}
                onThemeChange={changeTheme}
              />
              <div className="flex items-center space-x-2">
                <TrendingUp className="text-primary" size={20} />
                <span className="text-sm font-medium text-slate-700">Dashboard Analítico</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Stock Movements Trend */}
            {movementsLoading ? (
              <ChartSkeleton title="Tendencia de Movimientos" />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Tendencia de Movimientos</h3>
                    <BarChart className="text-slate-500" size={20} />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stockMovementData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="fecha" 
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="entradas" 
                          stackId="1"
                          stroke={CHART_COLORS[1]} 
                          fill={CHART_COLORS[1]}
                          fillOpacity={0.6}
                          name="Entradas"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="salidas" 
                          stackId="2"
                          stroke={CHART_COLORS[2]} 
                          fill={CHART_COLORS[2]}
                          fillOpacity={0.6}
                          name="Salidas"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category Distribution */}
            {productsLoading ? (
              <ChartSkeleton title="Distribución por Categorías" />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Distribución por Categorías</h3>
                    <Package className="text-slate-500" size={20} />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={(entry: any) => `${entry.percentage}%`}
                          labelLine={false}
                        >
                          {categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: any, name: string, props: any) => [
                            `${value} productos (${props.payload.percentage}%)`,
                            name
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zone Utilization */}
            {zonesLoading ? (
              <ChartSkeleton title="Utilización de Zonas" />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Utilización de Zonas</h3>
                    <MapPin className="text-slate-500" size={20} />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={zoneUtilization}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                          label={{ value: '% Utilización', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: any, name: string) => [
                            name === 'utilizacion' ? `${value}%` : value,
                            name === 'utilizacion' ? 'Utilización' : 
                            name === 'productos' ? 'Productos' : 'Stock Total'
                          ]}
                        />
                        <Bar 
                          dataKey="utilizacion" 
                          fill={CHART_COLORS[0]}
                          radius={[4, 4, 0, 0]}
                          name="Utilización %"
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock Levels Comparison */}
            {productsLoading ? (
              <ChartSkeleton title="Niveles de Stock vs Mínimo" />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Niveles de Stock vs Mínimo</h3>
                    <AlertTriangle className="text-slate-500" size={20} />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={stockLevels}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                          label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar 
                          dataKey="actual" 
                          fill={CHART_COLORS[1]}
                          name="Stock Actual"
                          radius={[2, 2, 0, 0]}
                        />
                        <Bar 
                          dataKey="minimo" 
                          fill={CHART_COLORS[3]}
                          name="Stock Mínimo"
                          radius={[2, 2, 0, 0]}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Dashboard de Analíticas Avanzado</h2>
              <p className="text-sm text-slate-600">Análisis completo de ventas, productos y tendencias</p>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="text-primary" size={20} />
              <span className="text-sm font-medium text-slate-700">Analytics Pro</span>
            </div>
          </div>

          <AdvancedAnalytics />
        </div>

        {/* Quick Actions and Recent Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="flex flex-col h-20 border-dashed hover:border-primary hover:bg-blue-50"
                  onClick={() => setShowAddProduct(true)}
                >
                  <Plus className="text-primary mb-2" size={24} />
                  <span className="text-sm font-medium">Agregar Producto</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col h-20 border-dashed hover:border-accent hover:bg-green-50"
                  onClick={() => openStockMovement("entry")}
                >
                  <ArrowUp className="text-accent mb-2" size={24} />
                  <span className="text-sm font-medium">Entrada Stock</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col h-20 border-dashed hover:border-warning hover:bg-yellow-50"
                  onClick={() => openStockMovement("exit")}
                >
                  <ArrowDown className="text-warning mb-2" size={24} />
                  <span className="text-sm font-medium">Salida Stock</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col h-20 border-dashed hover:border-purple-500 hover:bg-purple-50"
                >
                  <FileText className="text-purple-500 mb-2" size={24} />
                  <span className="text-sm font-medium">Generar Reporte</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Products */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Productos Recientes</h3>
                <Button variant="ghost" className="text-primary">
                  Ver todos <ArrowUpDown size={16} className="ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                {recentProducts.map((product) => {
                  const zone = filteredZones.find(z => z.id === product.warehouseZoneId) || zones.find(z => z.id === product.warehouseZoneId);
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                          <Package className="text-slate-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${product.currentStock <= product.minStock ? 'text-warning' : 'text-slate-900'}`}>
                          {product.currentStock}
                        </p>
                        <p className="text-xs text-slate-500">{zone?.name || 'Sin zona'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

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
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  );
}
