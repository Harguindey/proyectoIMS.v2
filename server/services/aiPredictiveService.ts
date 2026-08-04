import OpenAI from 'openai';

// Make OpenAI optional - only initialize if API key is provided
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

export interface PredictiveSuggestion {
  id: string;
  type: 'restock' | 'demand' | 'optimization' | 'alert' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;
  impact: string;
  data?: any;
}

export interface InventoryData {
  products: any[];
  movements: any[];
  orders: any[];
  suppliers: any[];
  zones: any[];
}

export class AIPredictiveService {
  
  /**
   * Analiza datos de inventario y genera sugerencias predictivas usando IA
   */
  async generatePredictiveSuggestions(data: InventoryData): Promise<PredictiveSuggestion[]> {
    const suggestions: PredictiveSuggestion[] = [];

    // 1. Análisis de productos con bajo stock o alto riesgo
    const lowStockSuggestions = this.analyzeLowStockProducts(data.products);
    suggestions.push(...lowStockSuggestions);

    // 2. Análisis de patrones de movimiento
    const movementSuggestions = this.analyzeMovementPatterns(data.movements, data.products);
    suggestions.push(...movementSuggestions);

    // 3. Análisis de tendencias de pedidos
    const orderSuggestions = this.analyzeOrderTrends(data.orders, data.products);
    suggestions.push(...orderSuggestions);

    // 4. Optimización de zonas de almacén
    const zoneSuggestions = this.analyzeZoneOptimization(data.zones, data.products);
    suggestions.push(...zoneSuggestions);

    // 5. Generar insights avanzados con IA si hay datos suficientes
    if (suggestions.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        const aiInsights = await this.generateAIInsights(data, suggestions);
        suggestions.push(...aiInsights);
      } catch (error) {
        console.error('[AI Predictive] Error generating AI insights:', error);
      }
    }

    // Ordenar por prioridad
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Analiza productos con bajo stock y genera sugerencias de reabastecimiento
   */
  private analyzeLowStockProducts(products: any[]): PredictiveSuggestion[] {
    const suggestions: PredictiveSuggestion[] = [];

    products.forEach(product => {
      const stockPercentage = (product.currentStock / product.maxStock) * 100;
      const isLowStock = product.currentStock <= product.minStock;
      const isCritical = product.currentStock <= product.minStock * 0.5;

      if (isCritical) {
        suggestions.push({
          id: `restock-critical-${product.id}`,
          type: 'restock',
          priority: 'high',
          title: `Stock Crítico: ${product.name}`,
          description: `El producto tiene solo ${product.currentStock} unidades (${stockPercentage.toFixed(0)}% de capacidad). Se recomienda reabastecer urgentemente.`,
          actionable: true,
          impact: `Evitar rotura de stock y pérdida de ventas estimada en €${(product.unitPrice * product.minStock).toFixed(2)}`,
          data: {
            productId: product.id,
            currentStock: product.currentStock,
            minStock: product.minStock,
            suggestedOrder: product.maxStock - product.currentStock,
            supplierId: product.supplierId
          }
        });
      } else if (isLowStock) {
        suggestions.push({
          id: `restock-low-${product.id}`,
          type: 'restock',
          priority: 'medium',
          title: `Stock Bajo: ${product.name}`,
          description: `El producto está por debajo del mínimo (${product.currentStock}/${product.minStock}). Considere hacer un pedido pronto.`,
          actionable: true,
          impact: `Mantener disponibilidad y evitar posibles roturas de stock`,
          data: {
            productId: product.id,
            currentStock: product.currentStock,
            minStock: product.minStock,
            suggestedOrder: Math.ceil((product.maxStock - product.currentStock) * 0.7),
                supplierId: product.supplierId
          }
        });
      }
    });

    return suggestions;
  }

  /**
   * Analiza patrones en movimientos de stock
   */
  private analyzeMovementPatterns(movements: any[], products: any[]): PredictiveSuggestion[] {
    const suggestions: PredictiveSuggestion[] = [];

    // Agrupar movimientos por producto
    const movementsByProduct = new Map<number, any[]>();
    movements.forEach(movement => {
      if (!movementsByProduct.has(movement.productId)) {
        movementsByProduct.set(movement.productId, []);
      }
      movementsByProduct.get(movement.productId)!.push(movement);
    });

    // Analizar patrones de cada producto
    movementsByProduct.forEach((productMovements, productId) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const exits = productMovements.filter(m => m.type === 'salida');
      const entries = productMovements.filter(m => m.type === 'entrada');

      // Detectar productos con alta rotación
      if (exits.length > 5 && exits.length > entries.length * 1.5) {
        const avgExitQuantity = exits.reduce((sum, m) => sum + m.quantity, 0) / exits.length;
        
        suggestions.push({
          id: `demand-high-${productId}`,
          type: 'demand',
          priority: 'medium',
          title: `Alta Demanda Detectada: ${product.name}`,
          description: `Este producto tiene ${exits.length} salidas recientes con un promedio de ${avgExitQuantity.toFixed(0)} unidades. Demanda ${((exits.length / (entries.length || 1)) * 100).toFixed(0)}% superior a reabastecimientos.`,
          actionable: true,
          impact: `Aumentar stock de seguridad para satisfacer demanda creciente`,
          data: {
            productId: product.id,
            exitCount: exits.length,
            avgExitQuantity: avgExitQuantity,
            suggestedMinStock: Math.ceil(product.minStock * 1.3)
          }
        });
      }

      // Detectar productos con baja rotación
      if (entries.length > 3 && exits.length < entries.length * 0.3) {
        suggestions.push({
          id: `demand-low-${productId}`,
          type: 'optimization',
          priority: 'low',
          title: `Baja Rotación: ${product.name}`,
          description: `Producto con ${entries.length} entradas pero solo ${exits.length} salidas. Stock acumulándose sin movimiento significativo.`,
          actionable: true,
          impact: `Reducir inversión en inventario y liberar espacio`,
          data: {
            productId: product.id,
            entryCount: entries.length,
            exitCount: exits.length,
            currentStock: product.currentStock,
            suggestedMaxStock: Math.ceil(product.maxStock * 0.7)
          }
        });
      }
    });

    return suggestions;
  }

  /**
   * Analiza tendencias en pedidos de clientes
   */
  private analyzeOrderTrends(orders: any[], products: any[]): PredictiveSuggestion[] {
    const suggestions: PredictiveSuggestion[] = [];

    // Analizar pedidos recientes (últimos 30 días)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);

    const recentOrders = orders.filter(order => 
      new Date(order.createdAt) >= recentDate
    );

    if (recentOrders.length > 0) {
      const totalRevenue = recentOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
      const avgOrderValue = totalRevenue / recentOrders.length;

      // Detectar tendencia de crecimiento
      if (recentOrders.length >= 5) {
        const ordersPerWeek = recentOrders.length / 4.3; // aproximadamente 4.3 semanas en un mes

        suggestions.push({
          id: 'trend-orders-growth',
          type: 'trend',
          priority: 'medium',
          title: 'Tendencia Positiva en Pedidos',
          description: `Se han procesado ${recentOrders.length} pedidos en el último mes (${ordersPerWeek.toFixed(1)} por semana) con un valor promedio de €${avgOrderValue.toFixed(2)}.`,
          actionable: false,
          impact: `Ingresos mensuales proyectados: €${(totalRevenue * 1.2).toFixed(2)}`,
          data: {
            recentOrderCount: recentOrders.length,
            avgOrderValue: avgOrderValue,
            totalRevenue: totalRevenue,
            ordersPerWeek: ordersPerWeek
          }
        });
      }
    }

    return suggestions;
  }

  /**
   * Analiza optimización de zonas de almacén
   */
  private analyzeZoneOptimization(zones: any[], products: any[]): PredictiveSuggestion[] {
    const suggestions: PredictiveSuggestion[] = [];

    zones.forEach(zone => {
      const occupancyPercentage = (zone.currentOccupancy / zone.capacity) * 100;

      // Detectar zonas con alta ocupación
      if (occupancyPercentage > 90) {
        const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
        
        suggestions.push({
          id: `zone-capacity-${zone.id}`,
          type: 'alert',
          priority: 'high',
          title: `Capacidad Crítica: ${zone.name}`,
          description: `La zona está al ${occupancyPercentage.toFixed(0)}% de capacidad (${zone.currentOccupancy}/${zone.capacity} unidades). ${zoneProducts.length} productos almacenados.`,
          actionable: true,
          impact: `Riesgo de no poder almacenar nuevos productos. Considerar redistribución o expansión.`,
          data: {
            zoneId: zone.id,
            occupancyPercentage: occupancyPercentage,
            productsCount: zoneProducts.length
          }
        });
      }

      // Detectar zonas con baja ocupación
      if (occupancyPercentage < 30 && zone.currentOccupancy > 0) {
        suggestions.push({
          id: `zone-underused-${zone.id}`,
          type: 'optimization',
          priority: 'low',
          title: `Zona Subutilizada: ${zone.name}`,
          description: `Solo ${occupancyPercentage.toFixed(0)}% de ocupación. Espacio disponible para optimizar distribución.`,
          actionable: true,
          impact: `Oportunidad para consolidar inventario y mejorar eficiencia`,
          data: {
            zoneId: zone.id,
            occupancyPercentage: occupancyPercentage,
            availableSpace: zone.capacity - zone.currentOccupancy
          }
        });
      }
    });

    return suggestions;
  }

  /**
   * Genera insights avanzados usando IA de OpenAI
   */
  private async generateAIInsights(
    data: InventoryData,
    currentSuggestions: PredictiveSuggestion[]
  ): Promise<PredictiveSuggestion[]> {
    const aiSuggestions: PredictiveSuggestion[] = [];

    // Skip AI insights if OpenAI is not configured
    if (!openai) {
      console.log('[AI Service] OpenAI not configured, skipping AI insights');
      return aiSuggestions;
    }

    try {
      // Preparar resumen de datos para el prompt
      const dataummary = {
        totalProducts: data.products.length,
        totalMovements: data.movements.length,
        totalOrders: data.orders.length,
        currentSuggestionsCount: currentSuggestions.length,
        highPrioritySuggestions: currentSuggestions.filter(s => s.priority === 'high').length,
        categories: [...new Set(data.products.map(p => p.category))],
        avgStockLevel: data.products.reduce((sum, p) => sum + (p.currentStock / p.maxStock), 0) / data.products.length
      };

      const prompt = `Eres un analista experto en gestión de inventario deportivo. Analiza los siguientes datos y proporciona 2-3 insights estratégicos breves y accionables:

Resumen de inventario:
- ${dataummary.totalProducts} productos en ${dataummary.categories.length} categorías
- ${dataummary.totalMovements} movimientos de stock
- ${dataummary.totalOrders} pedidos de clientes
- Nivel promedio de stock: ${(dataummary.avgStockLevel * 100).toFixed(0)}%
- ${dataummary.highPrioritySuggestions} alertas de alta prioridad detectadas

Genera insights que sean:
1. Específicos y estratégicos
2. Basados en los patrones observados
3. Orientados a optimización o prevención
4. Máximo 2 oraciones cada uno

Formato de respuesta (JSON array):
[
  {"title": "Título breve", "insight": "Descripción del insight", "priority": "high/medium/low"}
]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Eres un analista de datos experto en gestión de inventario y logística. Proporcionas insights concisos y accionables."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const responseText = completion.choices[0]?.message?.content;
      if (responseText) {
        try {
          const insights = JSON.parse(responseText);
          
          insights.forEach((insight: any, index: number) => {
            aiSuggestions.push({
              id: `ai-insight-${index}`,
              type: 'trend',
              priority: insight.priority || 'medium',
              title: insight.title,
              description: insight.insight,
              actionable: false,
              impact: 'Insight estratégico generado por IA',
              data: { source: 'openai', model: 'gpt-3.5-turbo' }
            });
          });
        } catch (parseError) {
          console.error('[AI Predictive] Error parsing AI response:', parseError);
        }
      }
    } catch (error: any) {
      if (error?.status === 429) {
        console.log('[AI Predictive] OpenAI quota exceeded, skipping AI insights');
      } else {
        console.error('[AI Predictive] Error generating AI insights:', error);
      }
    }

    return aiSuggestions;
  }
}

export const aiPredictiveService = new AIPredictiveService();
