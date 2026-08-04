import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart, 
  Clock,
  Target,
  BarChart3,
  DollarSign,
  Package,
  Zap,
  Users,
  Calendar,
  Truck,
  Shield,
  Lightbulb,
  TrendingDown
} from "lucide-react";
import type { Product, StockMovement, ProcurementPlan, InsertStockMovement, InsertProcurementPlan } from "@shared/schema";

interface RecommendationItem {
  id: string;
  type: "reorder" | "trending" | "seasonal" | "optimization" | "cost" | "demand" | "supplier" | "space" | "quality" | "bundling" | "promotion" | "risk";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action: string;
  productId?: number;
  impact: string;
  confidence: number;
}

export default function SmartRecommendations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: recentMovements = [] } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements/recent"],
  });

  const { data: procurementPlans = [] } = useQuery<ProcurementPlan[]>({
    queryKey: ["/api/procurement-plans"],
  });

  // Mutation for creating stock movements
  const stockMovementMutation = useMutation({
    mutationFn: async (data: InsertStockMovement) => {
      const response = await fetch("/api/stock-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create stock movement");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      toast({
        title: "Movimiento de stock creado",
        description: "El stock ha sido actualizado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el stock",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating procurement plans
  const procurementMutation = useMutation({
    mutationFn: async (data: InsertProcurementPlan) => {
      const response = await fetch("/api/procurement-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create procurement plan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement-plans"] });
      toast({
        title: "Plan de adquisición creado",
        description: "El plan ha sido programado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el plan de adquisición",
        variant: "destructive",
      });
    },
  });

  // Generate intelligent recommendations
  const generateRecommendations = (): RecommendationItem[] => {
    const recommendations: RecommendationItem[] = [];

    // 1. Critical Reorder Recommendations
    const criticalProducts = products.filter(p => 
      p.currentStock <= p.minStock * 0.5 && p.currentStock > 0
    );
    
    criticalProducts.forEach(product => {
      recommendations.push({
        id: `reorder-${product.id}`,
        type: "reorder",
        title: `Reorder Urgente: ${product.name}`,
        description: `Stock crítico (${product.currentStock}/${product.minStock})`,
        priority: "high",
        action: "Crear orden de compra",
        productId: product.id,
        impact: "Evitar agotamiento",
        confidence: 95
      });
    });

    // 2. Trending Products (based on recent movements)
    const productMovements = recentMovements.reduce((acc, movement) => {
      acc[movement.productId] = (acc[movement.productId] || 0) + movement.quantity;
      return acc;
    }, {} as Record<number, number>);

    const trendingProducts = Object.entries(productMovements)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([productId]) => products.find(p => p.id === parseInt(productId)))
      .filter(Boolean);

    trendingProducts.forEach(product => {
      if (product) {
        recommendations.push({
          id: `trending-${product.id}`,
          type: "trending",
          title: `Producto en Tendencia: ${product.name}`,
          description: `Alta actividad reciente en movimientos`,
          priority: "medium",
          action: "Aumentar stock de seguridad",
          productId: product.id,
          impact: "Optimizar disponibilidad",
          confidence: 80
        });
      }
    });

    // 3. Cost Optimization - High Value Products
    const highValueProducts = products.filter(p => 
      p.unitPrice && Number(p.unitPrice) > 150 && p.currentStock > p.minStock * 2
    );

    if (highValueProducts.length > 0) {
      const product = highValueProducts[0];
      recommendations.push({
        id: `cost-${product.id}`,
        type: "cost",
        title: `Optimización de Costos: ${product.name}`,
        description: `Producto de alto valor con exceso de stock (€${Number(product.unitPrice).toFixed(2)})`,
        priority: "medium",
        action: "Crear promoción especial",
        productId: product.id,
        impact: "Reducir capital inmovilizado",
        confidence: 85
      });
    }

    // 4. Demand Prediction - Seasonal Analysis
    const sportsProducts = products.filter(p => 
      p.category?.toLowerCase().includes('fútbol') || 
      p.category?.toLowerCase().includes('natación') ||
      p.category?.toLowerCase().includes('atletismo')
    );

    if (sportsProducts.length > 0) {
      const currentMonth = new Date().getMonth();
      const isSummerApproaching = currentMonth >= 4 && currentMonth <= 7; // Mayo-Agosto
      const isWinterApproaching = currentMonth >= 10 || currentMonth <= 2; // Nov-Feb

      if (isSummerApproaching) {
        const swimmingProducts = sportsProducts.filter(p => 
          p.category?.toLowerCase().includes('natación') && 
          p.currentStock < p.minStock * 1.5
        );
        
        swimmingProducts.slice(0, 1).forEach(product => {
          recommendations.push({
            id: `demand-summer-${product.id}`,
            type: "demand",
            title: `Preparar Temporada Verano: ${product.name}`,
            description: `Aumentar stock antes del pico de demanda estival`,
            priority: "high",
            action: "Planificar compra adicional",
            productId: product.id,
            impact: "Capturar demanda estacional",
            confidence: 88
          });
        });
      }

      if (isWinterApproaching) {
        const footballProducts = sportsProducts.filter(p => 
          p.category?.toLowerCase().includes('fútbol') && 
          p.currentStock < p.minStock * 1.8
        );
        
        footballProducts.slice(0, 1).forEach(product => {
          recommendations.push({
            id: `demand-winter-${product.id}`,
            type: "demand",
            title: `Temporada de Fútbol: ${product.name}`,
            description: `Aumentar stock para la temporada alta de fútbol`,
            priority: "high",
            action: "Aumentar inventario",
            productId: product.id,
            impact: "Maximizar ventas temporada",
            confidence: 92
          });
        });
      }
    }

    // 5. Supplier Performance Analysis
    const supplierPerformance = products.reduce((acc, product) => {
      if (product.supplierId) {
        if (!acc[product.supplierId]) {
          acc[product.supplierId] = { products: [], lowStock: 0, avgPrice: 0 };
        }
        acc[product.supplierId].products.push(product);
        if (product.currentStock <= product.minStock) {
          acc[product.supplierId].lowStock++;
        }
      }
      return acc;
    }, {} as Record<number, { products: Product[], lowStock: number, avgPrice: number }>);

    Object.entries(supplierPerformance).forEach(([supplierId, data]) => {
      if (data.lowStock > 2) {
        recommendations.push({
          id: `supplier-${supplierId}`,
          type: "supplier",
          title: `Revisar Proveedor ID ${supplierId}`,
          description: `${data.lowStock} productos con stock bajo del mismo proveedor`,
          priority: "medium",
          action: "Contactar proveedor",
          impact: "Mejorar disponibilidad",
          confidence: 75
        });
      }
    });

    // 6. Space Optimization Recommendations
    const zoneUtilization = products.reduce((acc, product) => {
      if (product.warehouseZoneId) {
        if (!acc[product.warehouseZoneId]) {
          acc[product.warehouseZoneId] = { products: 0, totalStock: 0 };
        }
        acc[product.warehouseZoneId].products++;
        acc[product.warehouseZoneId].totalStock += product.currentStock;
      }
      return acc;
    }, {} as Record<number, { products: number, totalStock: number }>);

    Object.entries(zoneUtilization).forEach(([zoneId, data]) => {
      if (data.totalStock > 500) {
        recommendations.push({
          id: `space-${zoneId}`,
          type: "space",
          title: `Optimizar Zona ${zoneId}`,
          description: `Alta concentración de stock (${data.totalStock} unidades)`,
          priority: "low",
          action: "Redistribuir productos",
          impact: "Mejorar accesibilidad",
          confidence: 70
        });
      }
    });

    // 7. Quality & Bundling Opportunities
    const premiumProducts = products.filter(p => 
      p.unitPrice && Number(p.unitPrice) > 100 && p.currentStock > 5
    );
    const basicProducts = products.filter(p => 
      p.unitPrice && Number(p.unitPrice) < 50 && p.currentStock > 10
    );

    if (premiumProducts.length > 0 && basicProducts.length > 0) {
      recommendations.push({
        id: `bundling-opportunity`,
        type: "bundling",
        title: `Oportunidad de Paquetes`,
        description: `Combinar productos premium y básicos para aumentar ventas`,
        priority: "medium",
        action: "Crear paquetes promocionales",
        impact: "Aumentar valor promedio",
        confidence: 78
      });
    }

    // 8. Risk Management - Single Source Dependencies
    const singleSourceProducts = products.filter(p => 
      p.supplierId && p.currentStock < p.minStock * 2
    );

    if (singleSourceProducts.length > 3) {
      recommendations.push({
        id: `risk-dependency`,
        type: "risk",
        title: `Riesgo de Dependencia`,
        description: `${singleSourceProducts.length} productos con un solo proveedor y stock bajo`,
        priority: "high",
        action: "Diversificar proveedores",
        impact: "Reducir riesgo operacional",
        confidence: 90
      });
    }

    // 9. Promotion Opportunities
    const slowMovingProducts = products.filter(p => {
      const recentActivity = recentMovements.filter(m => m.productId === p.id).length;
      return recentActivity === 0 && p.currentStock > p.minStock * 1.5;
    });

    if (slowMovingProducts.length > 0) {
      const product = slowMovingProducts[0];
      recommendations.push({
        id: `promotion-${product.id}`,
        type: "promotion",
        title: `Promocionar: ${product.name}`,
        description: `Producto sin movimientos recientes con exceso de stock`,
        priority: "medium",
        action: "Crear descuento especial",
        productId: product.id,
        impact: "Acelerar rotación",
        confidence: 82
      });
    }

    // 10. Optimization Recommendations
    const overstockedProducts = products.filter(p => 
      p.currentStock > p.minStock * 3 && p.currentStock > 100
    );

    if (overstockedProducts.length > 0) {
      const product = overstockedProducts[0];
      recommendations.push({
        id: `optimization-${product.id}`,
        type: "optimization",
        title: `Optimizar Stock: ${product.name}`,
        description: `Exceso de inventario (${product.currentStock} unidades)`,
        priority: "low",
        action: "Revisar política de reposición",
        productId: product.id,
        impact: "Reducir costos de almacenamiento",
        confidence: 70
      });
    }

    // 4. Seasonal/Time-based Recommendations
    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= 9 && currentHour <= 17;

    if (isBusinessHours && recommendations.length < 4) {
      recommendations.push({
        id: "seasonal-general",
        type: "seasonal",
        title: "Revisión de Inventario",
        description: "Momento óptimo para revisar niveles de stock",
        priority: "medium",
        action: "Programar auditoría",
        impact: "Mejorar precisión de inventario",
        confidence: 65
      });
    }

    return recommendations.slice(0, 4); // Limit to 4 recommendations
  };

  const recommendations = generateRecommendations();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "warning";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reorder": return <AlertTriangle className="h-4 w-4" />;
      case "trending": return <TrendingUp className="h-4 w-4" />;
      case "seasonal": return <Clock className="h-4 w-4" />;
      case "optimization": return <Target className="h-4 w-4" />;
      case "cost": return <DollarSign className="h-4 w-4" />;
      case "demand": return <Users className="h-4 w-4" />;
      case "supplier": return <Truck className="h-4 w-4" />;
      case "space": return <Package className="h-4 w-4" />;
      case "quality": return <Shield className="h-4 w-4" />;
      case "bundling": return <Zap className="h-4 w-4" />;
      case "promotion": return <Lightbulb className="h-4 w-4" />;
      case "risk": return <TrendingDown className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reorder": return "text-red-600";
      case "trending": return "text-green-600";
      case "seasonal": return "text-blue-600";
      case "optimization": return "text-purple-600";
      case "cost": return "text-emerald-600";
      case "demand": return "text-indigo-600";
      case "supplier": return "text-orange-600";
      case "space": return "text-cyan-600";
      case "quality": return "text-amber-600";
      case "bundling": return "text-pink-600";
      case "promotion": return "text-yellow-600";
      case "risk": return "text-rose-600";
      default: return "text-gray-600";
    }
  };

  // Handle recommendation actions
  const handleRecommendationAction = async (recommendation: RecommendationItem) => {
    setIsLoading(true);
    
    try {
      switch (recommendation.type) {
        case "reorder":
          if (recommendation.productId) {
            const product = products.find(p => p.id === recommendation.productId);
            if (product) {
              // Create procurement plan for reorder
              const plannedDate = new Date();
              plannedDate.setDate(plannedDate.getDate() + (product.leadTimeDays || 7));
              const deliveryDate = new Date(plannedDate);
              deliveryDate.setDate(deliveryDate.getDate() + 7);
              
              await procurementMutation.mutateAsync({
                productId: product.id,
                quantity: Math.max(product.minStock * 2, 50),
                plannedOrderDate: plannedDate,
                expectedDeliveryDate: deliveryDate,
                supplierId: product.supplierId || undefined,
                notes: "Plan automático generado por recomendación IA",
                status: "planned"
              });
            }
          }
          break;
          
        case "trending":
          if (recommendation.productId) {
            const product = products.find(p => p.id === recommendation.productId);
            if (product) {
              // Add stock entry for trending product
              await stockMovementMutation.mutateAsync({
                productId: product.id,
                type: "entry",
                quantity: Math.max(Math.round(product.minStock * 1.5), 25),
                notes: "Reposición por tendencia positiva - Recomendación IA",
                toZoneId: product.warehouseZoneId
              });
            }
          }
          break;
          
        case "optimization":
          if (recommendation.productId) {
            const product = products.find(p => p.id === recommendation.productId);
            if (product && product.currentStock > product.minStock * 2) {
              // Create transfer movement for optimization
              await stockMovementMutation.mutateAsync({
                productId: product.id,
                type: "transfer",
                quantity: Math.round(product.currentStock * 0.3),
                notes: "Optimización de inventario - Recomendación IA",
                fromZoneId: product.warehouseZoneId,
                toZoneId: product.warehouseZoneId
              });
            }
          }
          break;
          
        case "seasonal":
          if (recommendation.productId) {
            const product = products.find(p => p.id === recommendation.productId);
            if (product) {
              // Create seasonal procurement plan
              const seasonalDate = new Date();
              seasonalDate.setDate(seasonalDate.getDate() + 14); // 2 weeks ahead
              const deliveryDate = new Date(seasonalDate);
              deliveryDate.setDate(deliveryDate.getDate() + 10);
              
              await procurementMutation.mutateAsync({
                productId: product.id,
                quantity: Math.max(product.minStock * 3, 100),
                plannedOrderDate: seasonalDate,
                expectedDeliveryDate: deliveryDate,
                supplierId: product.supplierId || undefined,
                notes: "Plan estacional generado por recomendación IA",
                status: "planned"
              });
            }
          }
          break;
      }
      
      toast({
        title: "Acción ejecutada",
        description: "La recomendación ha sido procesada exitosamente",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo ejecutar la acción recomendada",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh recommendations
  const refreshRecommendations = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stock-movements/recent"] });
    queryClient.invalidateQueries({ queryKey: ["/api/procurement-plans"] });
    
    toast({
      title: "Actualizado",
      description: "Las recomendaciones han sido actualizadas",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recomendaciones Inteligentes</CardTitle>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-slate-600">IA Predictiva</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Todo en orden</h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay recomendaciones críticas en este momento.
            </p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`${getTypeColor(rec.type)}`}>
                    {getTypeIcon(rec.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-900">{rec.title}</h4>
                    <p className="text-xs text-slate-600">{rec.description}</p>
                  </div>
                </div>
                <Badge variant={getPriorityColor(rec.priority) as any}>
                  {rec.priority.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Impacto:</span> {rec.impact}
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-medium">Confianza:</span> {rec.confidence}%
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRecommendationAction(rec)}
                  disabled={isLoading || stockMovementMutation.isPending || procurementMutation.isPending}
                >
                  {isLoading || stockMovementMutation.isPending || procurementMutation.isPending ? "Procesando..." : rec.action}
                </Button>
              </div>
            </div>
          ))
        )}
        
        {recommendations.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Última actualización: {new Date().toLocaleTimeString()}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={refreshRecommendations}
              >
                Actualizar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}