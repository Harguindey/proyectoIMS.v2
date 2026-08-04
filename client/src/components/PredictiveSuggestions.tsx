import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, TrendingUp, AlertTriangle, Package, Lightbulb, RefreshCw } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface PredictiveSuggestion {
  id: string;
  type: 'restock' | 'demand' | 'optimization' | 'alert' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
  impact: string;
  data?: any;
}

interface SuggestionsResponse {
  suggestions: PredictiveSuggestion[];
  generatedAt: string;
  dataSnapshot: {
    productsCount: number;
    movementsCount: number;
    ordersCount: number;
    zonesCount: number;
  };
}

const typeIcons: Record<string, any> = {
  restock: Package,
  demand: TrendingUp,
  optimization: Lightbulb,
  alert: AlertTriangle,
  trend: Sparkles
};

const typeLabels: Record<string, string> = {
  restock: 'Reabastecimiento',
  demand: 'Demanda',
  optimization: 'Optimización',
  alert: 'Alerta',
  trend: 'Tendencia'
};

const priorityColors: Record<string, string> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary'
};

const priorityLabels: Record<string, string> = {
  high: 'Alta Prioridad',
  medium: 'Prioridad Media',
  low: 'Prioridad Baja'
};

export function PredictiveSuggestions() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<SuggestionsResponse>({
    queryKey: ['/api/predictive/suggestions'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/predictive/suggestions'] });
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Sugerencias Inteligentes
          </CardTitle>
          <CardDescription>
            Analizando datos y generando recomendaciones...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Sugerencias Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar sugerencias. Por favor, intenta de nuevo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const suggestions = data?.suggestions || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Sugerencias Inteligentes con IA
            </CardTitle>
            <CardDescription>
              Análisis predictivo basado en {data?.dataSnapshot.productsCount} productos, {data?.dataSnapshot.movementsCount} movimientos y {data?.dataSnapshot.ordersCount} pedidos
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="refresh-suggestions-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Todo está funcionando bien. No hay sugerencias en este momento.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => {
              const Icon = typeIcons[suggestion.type];
              return (
                <Card 
                  key={suggestion.id} 
                  className={`border-l-4 ${
                    suggestion.priority === 'high' 
                      ? 'border-l-red-500 dark:border-l-red-400' 
                      : suggestion.priority === 'medium'
                      ? 'border-l-yellow-500 dark:border-l-yellow-400'
                      : 'border-l-blue-500 dark:border-l-blue-400'
                  }`}
                  data-testid={`suggestion-${suggestion.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          suggestion.priority === 'high' 
                            ? 'text-red-600 dark:text-red-400' 
                            : suggestion.priority === 'medium'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} />
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold">
                            {suggestion.title}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge 
                              variant={priorityColors[suggestion.priority] as any}
                              className="text-xs"
                            >
                              {priorityLabels[suggestion.priority]}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[suggestion.type]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {suggestion.description}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <strong>Impacto:</strong> {suggestion.impact}
                    </div>
                    {suggestion.actionable && suggestion.data && (
                      <div className="mt-3 flex gap-2">
                        {suggestion.data.productId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/products/${suggestion.data.productId}`}
                            data-testid={`view-product-${suggestion.data.productId}-btn`}
                          >
                            Ver Producto
                          </Button>
                        )}
                        {suggestion.data.suggestedOrder && suggestion.data.supplierId && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              // Navegar a crear plan de aprovisionamiento
                              window.location.href = `/procurement?productId=${suggestion.data.productId}&quantity=${suggestion.data.suggestedOrder}`;
                            }}
                            data-testid={`create-order-${suggestion.data.productId}-btn`}
                          >
                            Crear Pedido ({suggestion.data.suggestedOrder} unidades)
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {data?.generatedAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
            Última actualización: {new Date(data.generatedAt).toLocaleString('es-ES')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
