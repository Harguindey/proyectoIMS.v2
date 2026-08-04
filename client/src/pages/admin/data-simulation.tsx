import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Sparkles, 
  TrendingUp,
  Package,
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

interface SimulationResult {
  success: boolean;
  movementsCreated: number;
  productsAffected: number;
  daysSimulated: number;
  intensity: string;
}

export default function DataSimulationPage() {
  const { toast } = useToast();
  const [daysBack, setDaysBack] = useState<number>(180);
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const simulationMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/admin/simulate-data", {
        daysBack,
        intensity
      });
      return result as unknown as SimulationResult;
    },
    onSuccess: (data: SimulationResult) => {
      setSimulationResult(data);
      
      // Invalidate all affected queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      toast({
        title: "✅ Simulación completada",
        description: `Se crearon ${data.movementsCreated} movimientos para ${data.productsAffected} productos`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la simulación",
        description: error?.message || "No se pudo completar la simulación",
        variant: "destructive",
      });
    },
  });

  const handleSimulate = () => {
    setShowConfirmDialog(true);
  };

  const confirmSimulation = () => {
    setShowConfirmDialog(false);
    setSimulationResult(null);
    simulationMutation.mutate();
  };

  const getIntensityColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-blue-600 dark:text-blue-400';
      case 'medium': return 'text-orange-600 dark:text-orange-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600';
    }
  };

  const getIntensityLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Baja (30% probabilidad de ventas)';
      case 'medium': return 'Media (50% probabilidad de ventas)';
      case 'high': return 'Alta (70% probabilidad de ventas)';
      default: return level;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold">Simulación de Datos</h1>
          <p className="text-muted-foreground">
            Genera movimientos históricos para análisis y pruebas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configuración de Simulación
          </CardTitle>
          <CardDescription>
            Genera entradas y salidas de inventario con patrones realistas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Days Selection */}
          <div className="space-y-2">
            <Label htmlFor="days-select">Periodo a Simular</Label>
            <Select
              value={daysBack.toString()}
              onValueChange={(value) => setDaysBack(parseInt(value))}
              disabled={simulationMutation.isPending}
            >
              <SelectTrigger id="days-select" data-testid="select-days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 días (1 mes)</SelectItem>
                <SelectItem value="90">90 días (3 meses)</SelectItem>
                <SelectItem value="180">180 días (6 meses)</SelectItem>
                <SelectItem value="365">365 días (1 año)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Se generarán movimientos desde hace {daysBack} días hasta hoy
            </p>
          </div>

          {/* Intensity Selection */}
          <div className="space-y-2">
            <Label htmlFor="intensity-select">Intensidad de Actividad</Label>
            <Select
              value={intensity}
              onValueChange={(value: any) => setIntensity(value)}
              disabled={simulationMutation.isPending}
            >
              <SelectTrigger id="intensity-select" data-testid="select-intensity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🔵 Baja</SelectItem>
                <SelectItem value="medium">🟠 Media</SelectItem>
                <SelectItem value="high">🔴 Alta</SelectItem>
              </SelectContent>
            </Select>
            <p className={`text-sm font-medium ${getIntensityColor(intensity)}`}>
              {getIntensityLabel(intensity)}
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm">Entradas</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Se generan automáticamente cuando el stock baja del punto de pedido
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-orange-600" />
                <span className="font-semibold text-sm">Salidas</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ventas aleatorias según la intensidad configurada
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {simulationMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600 animate-pulse" />
                <span className="text-sm font-medium">Generando movimientos...</span>
              </div>
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Esto puede tomar unos segundos dependiendo del periodo seleccionado
              </p>
            </div>
          )}

          {/* Results */}
          {simulationResult && !simulationMutation.isPending && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    ¡Simulación completada!
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Movimientos:</span>
                      <Badge variant="secondary" className="ml-2">
                        {simulationResult.movementsCreated}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Productos:</span>
                      <Badge variant="secondary" className="ml-2">
                        {simulationResult.productsAffected}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Periodo:</span>
                      <Badge variant="secondary" className="ml-2">
                        {simulationResult.daysSimulated} días
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Intensidad:</span>
                      <Badge variant="secondary" className="ml-2 capitalize">
                        {simulationResult.intensity}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 pt-2">
                    💡 Ve a cualquier producto para ver el gráfico de flujo de inventario actualizado
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Aviso importante:</p>
                <p className="text-xs mt-1">
                  Esta operación creará movimientos históricos en la base de datos.
                  Los stocks de productos se actualizarán según los movimientos generados.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleSimulate}
            disabled={simulationMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-simulate"
          >
            {simulationMutation.isPending ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Generando datos...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Iniciar Simulación
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar simulación de datos?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Se van a generar movimientos históricos para los últimos <strong>{daysBack} días</strong> con
                intensidad <strong>{intensity}</strong>.
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                Esta acción creará nuevos registros en la base de datos y modificará los niveles de stock.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSimulation} data-testid="button-confirm-dialog">
              Sí, iniciar simulación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
