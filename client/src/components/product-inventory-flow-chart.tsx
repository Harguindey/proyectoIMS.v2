import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface StockHistoryData {
  productId: number;
  productName: string;
  currentStock: number;
  reorderPoint: number | null;
  safetyStock: number | null;
  minStock: number;
  rangeDays: number;
  history: Array<{
    date: string;
    stock: number;
    day: string;
  }>;
}

interface ProductInventoryFlowChartProps {
  productId: number;
}

export default function ProductInventoryFlowChart({ productId }: ProductInventoryFlowChartProps) {
  const [rangeDays, setRangeDays] = useState<number>(30);

  const { data, isLoading, error } = useQuery<StockHistoryData>({
    queryKey: ["/api/products", productId, "stock-history", rangeDays],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/stock-history?rangeDays=${rangeDays}`);
      if (!response.ok) {
        throw new Error("Error al cargar el historial de stock");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Flujo de Inventario
          </CardTitle>
          <CardDescription>Cargando historial de stock...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Flujo de Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No se pudo cargar el historial de stock
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasInsufficientData = data.history.length < 2;

  // Calcular stock medio del periodo
  const averageStock = data.history.length > 0
    ? Math.round(data.history.reduce((sum, item) => sum + item.stock, 0) / data.history.length)
    : 0;

  return (
    <Card data-testid="card-inventory-flow-chart">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Flujo de Inventario
            </CardTitle>
            <CardDescription>
              Evolución del stock en los últimos {rangeDays} días
            </CardDescription>
          </div>
          <Select
            value={rangeDays.toString()}
            onValueChange={(value) => setRangeDays(parseInt(value))}
          >
            <SelectTrigger className="w-32" data-testid="select-range-days">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {hasInsufficientData ? (
          <div className="h-80 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="h-12 w-12 opacity-20" />
            <p>No hay suficientes datos históricos para mostrar</p>
            <p className="text-sm">Se necesitan al menos 2 días de movimientos</p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Stock Actual</p>
                  <p className="text-lg font-semibold">{data.currentStock} unidades</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Stock Medio</p>
                  <p className="text-lg font-semibold">{averageStock} unidades</p>
                </div>
              </div>
              
              {data.reorderPoint && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Punto de Pedido</p>
                    <p className="text-lg font-semibold">{data.reorderPoint} unidades</p>
                  </div>
                </div>
              )}
              
              {data.safetyStock && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Stock de Seguridad</p>
                    <p className="text-lg font-semibold">{data.safetyStock} unidades</p>
                  </div>
                </div>
              )}
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.history}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="day"
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    label={{ value: 'Unidades', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                  
                  {/* Stock de Seguridad - línea verde punteada */}
                  {data.safetyStock && (
                    <ReferenceLine
                      y={data.safetyStock}
                      stroke="#10b981"
                      strokeDasharray="5 5"
                      label={{
                        value: 'Stock de Seguridad',
                        position: 'insideTopLeft',
                        fill: '#10b981',
                        fontSize: 11,
                      }}
                    />
                  )}
                  
                  {/* Stock Medio - línea púrpura punteada */}
                  <ReferenceLine
                    y={averageStock}
                    stroke="#9333ea"
                    strokeDasharray="5 5"
                    label={{
                      value: 'Stock Medio',
                      position: 'insideTopRight',
                      fill: '#9333ea',
                      fontSize: 11,
                    }}
                  />
                  
                  {/* Punto de Pedido - línea naranja punteada */}
                  {data.reorderPoint && (
                    <ReferenceLine
                      y={data.reorderPoint}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      label={{
                        value: 'Punto de Pedido',
                        position: 'insideBottomRight',
                        fill: '#f59e0b',
                        fontSize: 11,
                      }}
                    />
                  )}
                  
                  {/* Línea de Stock - azul sólida */}
                  <Line
                    type="monotone"
                    dataKey="stock"
                    name="Stock"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <p className="font-medium mb-1">Leyenda:</p>
              <ul className="space-y-1">
                <li>• <span className="text-blue-600 dark:text-blue-400 font-semibold">Línea azul</span>: Nivel de stock diario</li>
                <li>• <span className="text-purple-600 dark:text-purple-400 font-semibold">Línea púrpura</span>: Promedio de stock en el periodo seleccionado</li>
                {data.reorderPoint && (
                  <li>• <span className="text-orange-600 dark:text-orange-400 font-semibold">Línea naranja</span>: Cuando el stock cruza esta línea, se debe hacer un pedido</li>
                )}
                {data.safetyStock && (
                  <li>• <span className="text-green-600 dark:text-green-400 font-semibold">Línea verde</span>: Stock mínimo de seguridad para evitar quiebres</li>
                )}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
