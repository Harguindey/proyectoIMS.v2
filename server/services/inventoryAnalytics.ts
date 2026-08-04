/**
 * Servicio de Análisis de Inventario
 * Proporciona cálculos logísticos avanzados para optimización de inventario
 */

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: string | null;
  supplierId: number | null;
  safetyStock?: number | null;
  reorderPoint?: number | null;
}

interface StockMovement {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  createdAt: Date | string | null;
}

interface Supplier {
  id: number;
  name: string;
  leadTimeDays: number;
}

export interface SalesVelocityResult {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  velocity30Days: number;
  velocity60Days: number;
  velocity90Days: number;
  daysUntilStockout30: number | null;
  daysUntilStockout60: number | null;
  daysUntilStockout90: number | null;
  trend: 'increasing' | 'stable' | 'decreasing';
  status: 'critical' | 'warning' | 'healthy';
}

export interface ABCClassificationResult {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  unitPrice: number;
  totalValue: number;
  valuePercentage: number;
  cumulativePercentage: number;
  classification: 'A' | 'B' | 'C';
  recommendation: string;
}

export interface DynamicReorderPointResult {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  avgDailySales: number;
  leadTimeDays: number;
  safetyStock: number;
  dynamicReorderPoint: number;
  staticReorderPoint: number;
  difference: number;
  daysOfStockRemaining: number;
  shouldReorder: boolean;
  urgency: 'urgent' | 'soon' | 'normal' | 'not_needed';
  suggestedOrderQuantity: number;
  supplierName: string | null;
}

export class InventoryAnalyticsService {
  
  /**
   * Calcula la velocidad de ventas (salidas promedio por día) para cada producto
   */
  calculateSalesVelocity(
    products: Product[],
    movements: StockMovement[]
  ): SalesVelocityResult[] {
    const results: SalesVelocityResult[] = [];
    const now = new Date();

    products.forEach(product => {
      // Filtrar solo salidas de este producto
      const productExits = movements.filter(m => 
        m.productId === product.id && m.type === 'exit'
      );

      // Calcular velocidades para diferentes períodos
      const velocity30 = this.calculateVelocityForPeriod(productExits, 30, now);
      const velocity60 = this.calculateVelocityForPeriod(productExits, 60, now);
      const velocity90 = this.calculateVelocityForPeriod(productExits, 90, now);

      // Calcular días hasta agotamiento (stockout)
      const daysUntilStockout30 = velocity30 > 0 
        ? Math.floor(product.currentStock / velocity30) 
        : null;
      const daysUntilStockout60 = velocity60 > 0 
        ? Math.floor(product.currentStock / velocity60) 
        : null;
      const daysUntilStockout90 = velocity90 > 0 
        ? Math.floor(product.currentStock / velocity90) 
        : null;

      // Determinar tendencia
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (velocity30 > velocity60 * 1.2) trend = 'increasing';
      else if (velocity30 < velocity60 * 0.8) trend = 'decreasing';

      // Determinar estado
      let status: 'critical' | 'warning' | 'healthy' = 'healthy';
      if (daysUntilStockout30 !== null && daysUntilStockout30 < 7) status = 'critical';
      else if (daysUntilStockout30 !== null && daysUntilStockout30 < 14) status = 'warning';

      results.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        currentStock: product.currentStock,
        velocity30Days: Math.round(velocity30 * 100) / 100,
        velocity60Days: Math.round(velocity60 * 100) / 100,
        velocity90Days: Math.round(velocity90 * 100) / 100,
        daysUntilStockout30,
        daysUntilStockout60,
        daysUntilStockout90,
        trend,
        status
      });
    });

    // Ordenar por urgencia (critical primero)
    return results.sort((a, b) => {
      const statusOrder = { critical: 0, warning: 1, healthy: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Si mismo status, ordenar por días hasta stockout
      const daysA = a.daysUntilStockout30 ?? 999;
      const daysB = b.daysUntilStockout30 ?? 999;
      return daysA - daysB;
    });
  }

  /**
   * Calcula velocidad de ventas para un período específico
   */
  private calculateVelocityForPeriod(
    exits: StockMovement[],
    days: number,
    now: Date
  ): number {
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const relevantExits = exits.filter(exit => {
      if (!exit.createdAt) return false;
      const exitDate = new Date(exit.createdAt);
      return exitDate >= cutoffDate;
    });

    const totalQuantity = relevantExits.reduce((sum, exit) => sum + exit.quantity, 0);
    return totalQuantity / days;
  }

  /**
   * Clasifica productos según análisis ABC (regla 80/20)
   * A: ~20% productos = ~80% valor
   * B: ~30% productos = ~15% valor
   * C: ~50% productos = ~5% valor
   */
  calculateABCClassification(products: Product[]): ABCClassificationResult[] {
    // Calcular valor total de cada producto
    const productsWithValue = products.map(p => ({
      product: p,
      totalValue: p.currentStock * parseFloat(p.unitPrice || '0')
    }));

    // Ordenar por valor descendente
    productsWithValue.sort((a, b) => b.totalValue - a.totalValue);

    // Calcular valor total del inventario
    const totalInventoryValue = productsWithValue.reduce((sum, p) => sum + p.totalValue, 0);

    // Clasificar productos
    const results: ABCClassificationResult[] = [];
    let cumulativeValue = 0;

    productsWithValue.forEach((item, index) => {
      const p = item.product;
      const valuePercentage = (item.totalValue / totalInventoryValue) * 100;
      cumulativeValue += item.totalValue;
      const cumulativePercentage = (cumulativeValue / totalInventoryValue) * 100;

      // Determinar clasificación
      let classification: 'A' | 'B' | 'C';
      let recommendation: string;

      if (cumulativePercentage <= 80) {
        classification = 'A';
        recommendation = 'Máxima prioridad: control estricto, revisión diaria, evitar roturas de stock';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
        recommendation = 'Prioridad media: control regular, revisión semanal, mantener stock adecuado';
      } else {
        classification = 'C';
        recommendation = 'Baja prioridad: control básico, revisión mensual, minimizar inventario';
      }

      results.push({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        category: p.category,
        currentStock: p.currentStock,
        unitPrice: parseFloat(p.unitPrice || '0'),
        totalValue: Math.round(item.totalValue * 100) / 100,
        valuePercentage: Math.round(valuePercentage * 100) / 100,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        classification,
        recommendation
      });
    });

    return results;
  }

  /**
   * Calcula puntos de reorden dinámicos basados en velocidad de ventas real
   */
  calculateDynamicReorderPoints(
    products: Product[],
    movements: StockMovement[],
    suppliers: Supplier[]
  ): DynamicReorderPointResult[] {
    const results: DynamicReorderPointResult[] = [];
    const now = new Date();

    products.forEach(product => {
      // Obtener datos del proveedor
      const supplier = product.supplierId 
        ? suppliers.find(s => s.id === product.supplierId)
        : null;
      const leadTimeDays = supplier?.leadTimeDays || 7; // Default 7 días

      // Calcular velocidad de ventas promedio (últimos 60 días)
      const productExits = movements.filter(m => 
        m.productId === product.id && m.type === 'exit'
      );
      const avgDailySales = this.calculateVelocityForPeriod(productExits, 60, now);

      // Stock de seguridad: usar el del producto o calcular (7 días de ventas)
      const safetyStock = product.safetyStock || Math.ceil(avgDailySales * 7);

      // Punto de reorden dinámico: (velocidad * lead time) + stock de seguridad
      const dynamicReorderPoint = Math.ceil((avgDailySales * leadTimeDays) + safetyStock);

      // Punto de reorden estático (el configurado manualmente)
      const staticReorderPoint = product.reorderPoint || product.minStock;

      // Diferencia entre dinámico y estático
      const difference = dynamicReorderPoint - staticReorderPoint;

      // Días de stock restantes
      const daysOfStockRemaining = avgDailySales > 0 
        ? Math.floor(product.currentStock / avgDailySales)
        : 999;

      // ¿Debe reordenar?
      const shouldReorder = product.currentStock <= dynamicReorderPoint;

      // Urgencia
      let urgency: 'urgent' | 'soon' | 'normal' | 'not_needed';
      if (shouldReorder && daysOfStockRemaining < leadTimeDays) {
        urgency = 'urgent';
      } else if (shouldReorder) {
        urgency = 'soon';
      } else if (daysOfStockRemaining < leadTimeDays * 2) {
        urgency = 'normal';
      } else {
        urgency = 'not_needed';
      }

      // Cantidad sugerida de pedido
      const suggestedOrderQuantity = Math.max(
        product.maxStock - product.currentStock,
        Math.ceil(avgDailySales * 30) // Al menos 30 días de inventario
      );

      results.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        currentStock: product.currentStock,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        leadTimeDays,
        safetyStock,
        dynamicReorderPoint,
        staticReorderPoint,
        difference,
        daysOfStockRemaining,
        shouldReorder,
        urgency,
        suggestedOrderQuantity,
        supplierName: supplier?.name || null
      });
    });

    // Ordenar por urgencia
    return results.sort((a, b) => {
      const urgencyOrder = { urgent: 0, soon: 1, normal: 2, not_needed: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }
}

export const inventoryAnalyticsService = new InventoryAnalyticsService();
