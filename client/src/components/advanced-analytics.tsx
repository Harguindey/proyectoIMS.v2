import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChartSkeleton } from "@/components/loading/chart-skeleton";
import { useChartTheme } from "@/hooks/use-chart-theme";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Package,
  ShoppingCart,
  Calendar,
  BarChart3,
  Zap
} from "lucide-react";
import { useState } from "react";

interface AdvancedAnalyticsProps {
  className?: string;
}

interface SalesPeriodData {
  date: string;
  orders: number;
  revenue: number;
  items: number;
}

interface TopProductData {
  name: string;
  salesQuantity?: number;
  revenue?: number;
  movementCount?: number;
}

interface ZonePerformanceData {
  id: number;
  name: string;
  code: string;
  totalValue: number;
  utilizationPercentage: number;
  productCount: number;
  salesQuantity: number;
}

interface InventoryTrendData {
  date: string;
  entries: number;
  exits: number;
  transfers: number;
  netChange: number;
}

export default function AdvancedAnalytics({ className }: AdvancedAnalyticsProps) {
  const [salesPeriod, setSalesPeriod] = useState("daily");
  const [salesDays, setSalesDays] = useState("30");
  const [topProductsMetric, setTopProductsMetric] = useState("sales");
  const [inventoryDays, setInventoryDays] = useState("30");

  const { colors } = useChartTheme();

  // Analytics data queries
  const { data: salesData = [], isLoading: salesLoading } = useQuery<SalesPeriodData[]>({
    queryKey: ["/api/analytics/sales-by-period", salesPeriod, salesDays],
    queryFn: () => fetch(`/api/analytics/sales-by-period?period=${salesPeriod}&days=${salesDays}`).then(res => res.json()),
  });

  const { data: topProducts = [], isLoading: topProductsLoading } = useQuery<TopProductData[]>({
    queryKey: ["/api/analytics/top-products", topProductsMetric],
    queryFn: () => fetch(`/api/analytics/top-products?limit=5&metric=${topProductsMetric}`).then(res => res.json()),
  });

  const { data: zonePerformance = [], isLoading: zoneLoading } = useQuery<ZonePerformanceData[]>({
    queryKey: ["/api/analytics/zone-performance"],
    queryFn: () => fetch(`/api/analytics/zone-performance`).then(res => res.json()),
  });

  const { data: inventoryTrends = [], isLoading: trendsLoading } = useQuery<InventoryTrendData[]>({
    queryKey: ["/api/analytics/inventory-trends", inventoryDays],
    queryFn: () => fetch(`/api/analytics/inventory-trends?days=${inventoryDays}`).then(res => res.json()),
  });

  // Calculate key metrics
  const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Prepare chart data
  const salesChartData = salesData.map(item => ({
    ...item,
    fecha: new Date(item.date).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }));

  const zoneValueData = zonePerformance.map(zone => ({
    name: zone.code,
    valor: zone.totalValue,
    utilizacion: zone.utilizationPercentage,
    productos: zone.productCount
  }));

  const productPerformanceData = topProducts.map((product, index) => ({
    name: product.name.substring(0, 15) + (product.name.length > 15 ? '...' : ''),
    ventas: product.salesQuantity || 0,
    ingresos: product.revenue || 0,
    color: colors[index % colors.length]
  }));

  return (
    <div className={className}>
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Ingresos Totales</p>
                <p className="text-2xl font-bold text-slate-900">
                  €{totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Euro className="text-green-600" size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-600 mr-1" size={16} />
              <span className="text-green-600 font-medium">+15.3%</span>
              <span className="text-slate-500 ml-1">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pedidos Totales</p>
                <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-blue-600" size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-600 mr-1" size={16} />
              <span className="text-green-600 font-medium">+8.1%</span>
              <span className="text-slate-500 ml-1">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Valor Medio Pedido</p>
                <p className="text-2xl font-bold text-slate-900">
                  €{averageOrderValue.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-purple-600" size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-600 mr-1" size={16} />
              <span className="text-green-600 font-medium">+6.7%</span>
              <span className="text-slate-500 ml-1">vs período anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tendencias de Ventas</CardTitle>
                <p className="text-sm text-slate-600">Ingresos y pedidos por período</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={salesPeriod} onValueChange={setSalesPeriod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={salesDays} onValueChange={setSalesDays}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7d</SelectItem>
                    <SelectItem value="30">30d</SelectItem>
                    <SelectItem value="90">90d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="fecha" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? `€${Number(value).toFixed(2)}` : value,
                      name === 'revenue' ? 'Ingresos' : 'Pedidos'
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke={colors[0]}
                    fill={colors[0]}
                    fillOpacity={0.3}
                    name="Ingresos (€)"
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stackId="2"
                    stroke={colors[1]}
                    fill={colors[1]}
                    fillOpacity={0.3}
                    name="Pedidos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Productos Top</CardTitle>
                <p className="text-sm text-slate-600">Mejores productos por rendimiento</p>
              </div>
              <Select value={topProductsMetric} onValueChange={setTopProductsMetric}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Ventas</SelectItem>
                  <SelectItem value="movements">Movimientos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={productPerformanceData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [
                      name === 'ingresos' ? `€${Number(value).toFixed(2)}` : value,
                      name === 'ingresos' ? 'Ingresos' : 'Ventas'
                    ]}
                  />
                  <Bar
                    dataKey={topProductsMetric === 'sales' ? 'ventas' : 'movimientos'}
                    fill={colors[0]}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Zone Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Zona</CardTitle>
            <p className="text-sm text-slate-600">Valor del inventario y utilización</p>
          </CardHeader>
          <CardContent>
            {zoneLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={zoneValueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [
                      name === 'valor' ? `€${Number(value).toFixed(2)}` : 
                      name === 'utilizacion' ? `${Number(value).toFixed(1)}%` : value,
                      name === 'valor' ? 'Valor Inventario' : 
                      name === 'utilizacion' ? 'Utilización' : 'Productos'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="valor" fill={colors[0]} name="Valor (€)" />
                  <Bar dataKey="utilizacion" fill={colors[1]} name="Utilización (%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Inventory Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tendencias de Inventario</CardTitle>
                <p className="text-sm text-slate-600">Entradas, salidas y cambios netos</p>
              </div>
              <Select value={inventoryDays} onValueChange={setInventoryDays}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7d</SelectItem>
                  <SelectItem value="30">30d</SelectItem>
                  <SelectItem value="90">90d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={inventoryTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit' 
                    })}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="entries"
                    stroke={colors[2]}
                    strokeWidth={2}
                    name="Entradas"
                    dot={{ fill: colors[2], strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="exits"
                    stroke={colors[3]}
                    strokeWidth={2}
                    name="Salidas"
                    dot={{ fill: colors[3], strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netChange"
                    stroke={colors[4]}
                    strokeWidth={3}
                    name="Cambio Neto"
                    dot={{ fill: colors[4], strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="text-yellow-500" size={20} />
              Insights de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zonePerformance.slice(0, 3).map((zone, index) => (
                <div key={zone.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{zone.name}</h4>
                    <Badge variant={zone.utilizationPercentage > 80 ? "destructive" : "secondary"}>
                      {zone.utilizationPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Productos: {zone.productCount}</p>
                    <p>Valor: €{zone.totalValue.toFixed(2)}</p>
                    <p>Ventas: {zone.salesQuantity} unidades</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
