export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  module: string;
  columns: ReportColumn[];
  defaultFilters?: any;
  sortBy?: string;
  groupBy?: string;
  includeCharts?: boolean;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  required: boolean;
  width?: number;
  formatter?: (value: any) => string;
}

// SportMax Pro Report Templates
export const REPORT_TEMPLATES: Record<string, ReportTemplate[]> = {
  inventory: [
    {
      id: 'inventory-complete',
      name: 'Inventario Completo',
      description: 'Listado completo de todos los productos con información detallada',
      module: 'inventory',
      columns: [
        { key: 'name', label: 'Nombre del Producto', type: 'text', required: true, width: 30 },
        { key: 'sku', label: 'SKU', type: 'text', required: true, width: 15 },
        { key: 'category', label: 'Categoría', type: 'text', required: true, width: 20 },
        { key: 'currentStock', label: 'Stock Actual', type: 'number', required: true, width: 12 },
        { key: 'minStock', label: 'Stock Mínimo', type: 'number', required: true, width: 12 },
        { key: 'maxStock', label: 'Stock Máximo', type: 'number', required: false, width: 12 },
        { key: 'unitPrice', label: 'Precio Unitario', type: 'currency', required: true, width: 15 },
        { key: 'totalValue', label: 'Valor Total', type: 'currency', required: true, width: 15 },
        { key: 'supplierName', label: 'Proveedor', type: 'text', required: false, width: 20 },
        { key: 'zoneName', label: 'Zona', type: 'text', required: false, width: 15 }
      ],
      sortBy: 'name',
      includeCharts: true
    },
    {
      id: 'inventory-stock-alerts',
      name: 'Alertas de Stock',
      description: 'Productos con stock bajo que requieren reposición',
      module: 'inventory',
      columns: [
        { key: 'name', label: 'Producto', type: 'text', required: true, width: 30 },
        { key: 'sku', label: 'SKU', type: 'text', required: true, width: 15 },
        { key: 'category', label: 'Categoría', type: 'text', required: true, width: 20 },
        { key: 'currentStock', label: 'Stock Actual', type: 'number', required: true, width: 12 },
        { key: 'minStock', label: 'Stock Mínimo', type: 'number', required: true, width: 12 },
        { key: 'deficit', label: 'Déficit', type: 'number', required: true, width: 10 },
        { key: 'urgency', label: 'Urgencia', type: 'text', required: true, width: 12 },
        { key: 'supplierName', label: 'Proveedor', type: 'text', required: true, width: 20 },
        { key: 'leadTimeDays', label: 'Días de Entrega', type: 'number', required: false, width: 12 }
      ],
      defaultFilters: { lowStock: true },
      sortBy: 'deficit'
    },
    {
      id: 'inventory-by-category',
      name: 'Inventario por Categoría',
      description: 'Resumen de inventario agrupado por categorías deportivas',
      module: 'inventory',
      columns: [
        { key: 'category', label: 'Categoría', type: 'text', required: true, width: 25 },
        { key: 'productsCount', label: 'Productos', type: 'number', required: true, width: 12 },
        { key: 'totalStock', label: 'Stock Total', type: 'number', required: true, width: 15 },
        { key: 'averageStock', label: 'Stock Promedio', type: 'number', required: false, width: 15 },
        { key: 'totalValue', label: 'Valor Total', type: 'currency', required: true, width: 18 },
        { key: 'lowStockItems', label: 'Items Bajo Stock', type: 'number', required: true, width: 15 }
      ],
      groupBy: 'category',
      includeCharts: true
    },
    {
      id: 'inventory-valuation',
      name: 'Valoración de Inventario',
      description: 'Análisis financiero del inventario con métricas de valor',
      module: 'inventory',
      columns: [
        { key: 'name', label: 'Producto', type: 'text', required: true, width: 25 },
        { key: 'category', label: 'Categoría', type: 'text', required: true, width: 20 },
        { key: 'currentStock', label: 'Stock', type: 'number', required: true, width: 12 },
        { key: 'unitPrice', label: 'Precio Unit.', type: 'currency', required: true, width: 15 },
        { key: 'totalValue', label: 'Valor Total', type: 'currency', required: true, width: 18 },
        { key: 'percentageOfTotal', label: '% del Total', type: 'percentage', required: false, width: 12 },
        { key: 'turnoverRatio', label: 'Rotación', type: 'number', required: false, width: 12 }
      ],
      sortBy: 'totalValue',
      includeCharts: true
    }
  ],

  movements: [
    {
      id: 'movements-complete',
      name: 'Historial Completo',
      description: 'Registro completo de todos los movimientos de stock',
      module: 'movements',
      columns: [
        { key: 'productName', label: 'Producto', type: 'text', required: true, width: 25 },
        { key: 'type', label: 'Tipo', type: 'text', required: true, width: 12 },
        { key: 'quantity', label: 'Cantidad', type: 'number', required: true, width: 12 },
        { key: 'reason', label: 'Motivo', type: 'text', required: true, width: 20 },
        { key: 'fromZone', label: 'Zona Origen', type: 'text', required: false, width: 15 },
        { key: 'toZone', label: 'Zona Destino', type: 'text', required: false, width: 15 },
        { key: 'createdAt', label: 'Fecha', type: 'date', required: true, width: 15 },
        { key: 'notes', label: 'Notas', type: 'text', required: false, width: 25 }
      ],
      sortBy: 'createdAt'
    },
    {
      id: 'movements-entries',
      name: 'Entradas de Stock',
      description: 'Movimientos de entrada de mercancía al almacén',
      module: 'movements',
      columns: [
        { key: 'productName', label: 'Producto', type: 'text', required: true, width: 30 },
        { key: 'quantity', label: 'Cantidad', type: 'number', required: true, width: 12 },
        { key: 'reason', label: 'Motivo', type: 'text', required: true, width: 20 },
        { key: 'toZone', label: 'Zona Destino', type: 'text', required: true, width: 15 },
        { key: 'supplierName', label: 'Proveedor', type: 'text', required: false, width: 20 },
        { key: 'unitCost', label: 'Costo Unit.', type: 'currency', required: false, width: 15 },
        { key: 'totalCost', label: 'Costo Total', type: 'currency', required: false, width: 18 },
        { key: 'createdAt', label: 'Fecha', type: 'date', required: true, width: 15 }
      ],
      defaultFilters: { type: 'entry' },
      sortBy: 'createdAt'
    },
    {
      id: 'movements-exits',
      name: 'Salidas de Stock',
      description: 'Movimientos de salida de mercancía del almacén',
      module: 'movements',
      columns: [
        { key: 'productName', label: 'Producto', type: 'text', required: true, width: 30 },
        { key: 'quantity', label: 'Cantidad', type: 'number', required: true, width: 12 },
        { key: 'reason', label: 'Motivo', type: 'text', required: true, width: 20 },
        { key: 'fromZone', label: 'Zona Origen', type: 'text', required: true, width: 15 },
        { key: 'orderNumber', label: 'Nº Pedido', type: 'text', required: false, width: 15 },
        { key: 'customerName', label: 'Cliente', type: 'text', required: false, width: 25 },
        { key: 'createdAt', label: 'Fecha', type: 'date', required: true, width: 15 }
      ],
      defaultFilters: { type: 'exit' },
      sortBy: 'createdAt'
    }
  ],

  orders: [
    {
      id: 'orders-complete',
      name: 'Pedidos Completos',
      description: 'Listado completo de todos los pedidos con detalles',
      module: 'orders',
      columns: [
        { key: 'orderNumber', label: 'Nº Pedido', type: 'text', required: true, width: 15 },
        { key: 'customerName', label: 'Cliente', type: 'text', required: true, width: 25 },
        { key: 'status', label: 'Estado', type: 'text', required: true, width: 15 },
        { key: 'totalAmount', label: 'Total', type: 'currency', required: true, width: 15 },
        { key: 'itemsCount', label: 'Items', type: 'number', required: true, width: 10 },
        { key: 'orderDate', label: 'Fecha Pedido', type: 'date', required: true, width: 15 },
        { key: 'shippedDate', label: 'Fecha Envío', type: 'date', required: false, width: 15 },
        { key: 'deliveredDate', label: 'Fecha Entrega', type: 'date', required: false, width: 15 },
        { key: 'notes', label: 'Notas', type: 'text', required: false, width: 25 }
      ],
      sortBy: 'orderDate',
      includeCharts: true
    },
    {
      id: 'orders-pending',
      name: 'Pedidos Pendientes',
      description: 'Pedidos que requieren procesamiento o envío',
      module: 'orders',
      columns: [
        { key: 'orderNumber', label: 'Nº Pedido', type: 'text', required: true, width: 15 },
        { key: 'customerName', label: 'Cliente', type: 'text', required: true, width: 25 },
        { key: 'status', label: 'Estado', type: 'text', required: true, width: 15 },
        { key: 'totalAmount', label: 'Total', type: 'currency', required: true, width: 15 },
        { key: 'orderDate', label: 'Fecha Pedido', type: 'date', required: true, width: 15 },
        { key: 'daysPending', label: 'Días Pendiente', type: 'number', required: true, width: 12 },
        { key: 'priority', label: 'Prioridad', type: 'text', required: false, width: 12 }
      ],
      defaultFilters: { status: ['pending', 'preparing'] },
      sortBy: 'daysPending'
    },
    {
      id: 'orders-revenue-analysis',
      name: 'Análisis de Ingresos',
      description: 'Análisis financiero de pedidos e ingresos',
      module: 'orders',
      columns: [
        { key: 'orderNumber', label: 'Nº Pedido', type: 'text', required: true, width: 15 },
        { key: 'customerName', label: 'Cliente', type: 'text', required: true, width: 25 },
        { key: 'totalAmount', label: 'Total', type: 'currency', required: true, width: 15 },
        { key: 'margin', label: 'Margen', type: 'currency', required: false, width: 15 },
        { key: 'marginPercent', label: '% Margen', type: 'percentage', required: false, width: 12 },
        { key: 'orderDate', label: 'Fecha', type: 'date', required: true, width: 15 },
        { key: 'customerType', label: 'Tipo Cliente', type: 'text', required: false, width: 15 }
      ],
      sortBy: 'totalAmount',
      includeCharts: true
    }
  ],

  suppliers: [
    {
      id: 'suppliers-complete',
      name: 'Proveedores Completos',
      description: 'Listado completo de proveedores con información de contacto y rendimiento',
      module: 'suppliers',
      columns: [
        { key: 'name', label: 'Proveedor', type: 'text', required: true, width: 25 },
        { key: 'contactEmail', label: 'Email', type: 'text', required: true, width: 25 },
        { key: 'contactPhone', label: 'Teléfono', type: 'text', required: true, width: 15 },
        { key: 'address', label: 'Dirección', type: 'text', required: false, width: 30 },
        { key: 'leadTimeDays', label: 'Días Entrega', type: 'number', required: true, width: 12 },
        { key: 'reliability', label: 'Fiabilidad', type: 'percentage', required: true, width: 12 },
        { key: 'productsCount', label: 'Productos', type: 'number', required: true, width: 12 },
        { key: 'totalInventoryValue', label: 'Valor Inventario', type: 'currency', required: false, width: 18 }
      ],
      sortBy: 'name'
    },
    {
      id: 'suppliers-performance',
      name: 'Rendimiento de Proveedores',
      description: 'Análisis de rendimiento y métricas de proveedores',
      module: 'suppliers',
      columns: [
        { key: 'name', label: 'Proveedor', type: 'text', required: true, width: 25 },
        { key: 'reliability', label: 'Fiabilidad', type: 'percentage', required: true, width: 12 },
        { key: 'leadTimeDays', label: 'Días Entrega', type: 'number', required: true, width: 12 },
        { key: 'onTimeDelivery', label: 'Entregas Puntuales', type: 'percentage', required: false, width: 15 },
        { key: 'qualityScore', label: 'Puntuación Calidad', type: 'number', required: false, width: 15 },
        { key: 'totalOrders', label: 'Pedidos Total', type: 'number', required: false, width: 12 },
        { key: 'averageOrderValue', label: 'Valor Promedio', type: 'currency', required: false, width: 15 },
        { key: 'lastOrderDate', label: 'Último Pedido', type: 'date', required: false, width: 15 }
      ],
      sortBy: 'reliability',
      includeCharts: true
    }
  ],

  customers: [
    {
      id: 'customers-complete',
      name: 'Clientes Completos',
      description: 'Listado completo de clientes con información de contacto y estadísticas',
      module: 'customers',
      columns: [
        { key: 'name', label: 'Cliente', type: 'text', required: true, width: 25 },
        { key: 'email', label: 'Email', type: 'text', required: true, width: 25 },
        { key: 'phone', label: 'Teléfono', type: 'text', required: true, width: 15 },
        { key: 'address', label: 'Dirección', type: 'text', required: false, width: 30 },
        { key: 'ordersCount', label: 'Pedidos', type: 'number', required: true, width: 12 },
        { key: 'totalSpent', label: 'Total Gastado', type: 'currency', required: true, width: 15 },
        { key: 'averageOrderValue', label: 'Promedio/Pedido', type: 'currency', required: true, width: 15 },
        { key: 'lastOrderDate', label: 'Último Pedido', type: 'date', required: false, width: 15 }
      ],
      sortBy: 'totalSpent',
      includeCharts: true
    },
    {
      id: 'customers-top-buyers',
      name: 'Mejores Compradores',
      description: 'Clientes con mayor volumen de compras y valor',
      module: 'customers',
      columns: [
        { key: 'name', label: 'Cliente', type: 'text', required: true, width: 25 },
        { key: 'totalSpent', label: 'Total Gastado', type: 'currency', required: true, width: 15 },
        { key: 'ordersCount', label: 'Pedidos', type: 'number', required: true, width: 12 },
        { key: 'averageOrderValue', label: 'Promedio/Pedido', type: 'currency', required: true, width: 15 },
        { key: 'frequency', label: 'Frecuencia', type: 'text', required: false, width: 15 },
        { key: 'customerSince', label: 'Cliente Desde', type: 'date', required: false, width: 15 },
        { key: 'loyaltyScore', label: 'Puntuación Fidelidad', type: 'number', required: false, width: 15 }
      ],
      sortBy: 'totalSpent',
      includeCharts: true
    }
  ],

  analytics: [
    {
      id: 'analytics-executive',
      name: 'Resumen Ejecutivo',
      description: 'Dashboard ejecutivo con KPIs principales',
      module: 'analytics',
      columns: [
        { key: 'metric', label: 'Métrica', type: 'text', required: true, width: 25 },
        { key: 'currentValue', label: 'Valor Actual', type: 'text', required: true, width: 15 },
        { key: 'previousValue', label: 'Valor Anterior', type: 'text', required: false, width: 15 },
        { key: 'change', label: 'Cambio', type: 'text', required: false, width: 12 },
        { key: 'changePercent', label: '% Cambio', type: 'percentage', required: false, width: 12 },
        { key: 'trend', label: 'Tendencia', type: 'text', required: false, width: 15 }
      ],
      includeCharts: true
    },
    {
      id: 'analytics-sales-performance',
      name: 'Rendimiento de Ventas',
      description: 'Análisis detallado del rendimiento de ventas',
      module: 'analytics',
      columns: [
        { key: 'period', label: 'Período', type: 'text', required: true, width: 15 },
        { key: 'totalSales', label: 'Ventas Totales', type: 'currency', required: true, width: 18 },
        { key: 'ordersCount', label: 'Pedidos', type: 'number', required: true, width: 12 },
        { key: 'averageOrderValue', label: 'Valor Promedio', type: 'currency', required: true, width: 15 },
        { key: 'bestCategory', label: 'Mejor Categoría', type: 'text', required: false, width: 20 },
        { key: 'conversion', label: 'Conversión', type: 'percentage', required: false, width: 12 }
      ],
      includeCharts: true
    }
  ]
};

export class ReportTemplateService {
  static getTemplatesForModule(module: string): ReportTemplate[] {
    return REPORT_TEMPLATES[module] || [];
  }

  static getTemplate(templateId: string): ReportTemplate | undefined {
    for (const moduleTemplates of Object.values(REPORT_TEMPLATES)) {
      const template = moduleTemplates.find(t => t.id === templateId);
      if (template) return template;
    }
    return undefined;
  }

  static getAllTemplates(): ReportTemplate[] {
    return Object.values(REPORT_TEMPLATES).flat();
  }

  static getDefaultTemplate(module: string): ReportTemplate | undefined {
    const moduleTemplates = this.getTemplatesForModule(module);
    return moduleTemplates[0]; // Return the first template as default
  }

  // Generate dynamic columns based on data structure
  static generateColumnsFromData(data: any[], module: string): ReportColumn[] {
    if (!data || data.length === 0) return [];

    const sampleItem = data[0];
    const columns: ReportColumn[] = [];

    for (const [key, value] of Object.entries(sampleItem)) {
      // Skip internal fields
      if (key.startsWith('_') || key === 'id') continue;

      let type: ReportColumn['type'] = 'text';
      if (typeof value === 'number') {
        type = key.includes('price') || key.includes('cost') || key.includes('amount') || key.includes('value') ? 'currency' : 'number';
        if (key.includes('percent') || key.includes('rate') || key.includes('ratio')) {
          type = 'percentage';
        }
      } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        type = 'date';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      }

      columns.push({
        key,
        label: this.formatLabel(key),
        type,
        required: true,
        width: this.getDefaultWidth(type)
      });
    }

    return columns;
  }

  private static formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/Id$/, ' ID')
      .replace(/Url$/, ' URL')
      .replace(/Sku$/, 'SKU');
  }

  private static getDefaultWidth(type: ReportColumn['type']): number {
    switch (type) {
      case 'currency': return 15;
      case 'date': return 12;
      case 'number': return 10;
      case 'percentage': return 10;
      case 'boolean': return 8;
      default: return 20;
    }
  }

  // Apply template formatting to data
  static formatDataForTemplate(data: any[], template: ReportTemplate): any[] {
    return data.map(item => {
      const formattedItem: any = {};
      
      template.columns.forEach(column => {
        let value = item[column.key];
        
        if (column.formatter) {
          value = column.formatter(value);
        } else {
          value = this.formatValue(value, column.type);
        }
        
        formattedItem[column.key] = value;
      });
      
      return formattedItem;
    });
  }

  private static formatValue(value: any, type: ReportColumn['type']): any {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'currency':
        return typeof value === 'number' ? `€${value.toFixed(2)}` : value;
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
      case 'date':
        return value instanceof Date ? value.toLocaleDateString('es-ES') : 
               typeof value === 'string' ? new Date(value).toLocaleDateString('es-ES') : value;
      case 'boolean':
        return value ? 'Sí' : 'No';
      default:
        return value;
    }
  }
}

// Predefined date ranges for reports
export const DATE_RANGES = {
  today: {
    label: 'Hoy',
    start: () => new Date(),
    end: () => new Date()
  },
  yesterday: {
    label: 'Ayer',
    start: () => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    },
    end: () => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    }
  },
  last7days: {
    label: 'Últimos 7 días',
    start: () => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    },
    end: () => new Date()
  },
  last30days: {
    label: 'Últimos 30 días',
    start: () => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    },
    end: () => new Date()
  },
  thisMonth: {
    label: 'Este mes',
    start: () => {
      const date = new Date();
      date.setDate(1);
      return date;
    },
    end: () => new Date()
  },
  lastMonth: {
    label: 'Mes pasado',
    start: () => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1, 1);
      return date;
    },
    end: () => {
      const date = new Date();
      date.setDate(0);
      return date;
    }
  },
  thisQuarter: {
    label: 'Este trimestre',
    start: () => {
      const date = new Date();
      const quarter = Math.floor(date.getMonth() / 3);
      date.setMonth(quarter * 3, 1);
      return date;
    },
    end: () => new Date()
  },
  thisYear: {
    label: 'Este año',
    start: () => new Date(new Date().getFullYear(), 0, 1),
    end: () => new Date()
  },
  lastYear: {
    label: 'Año pasado',
    start: () => new Date(new Date().getFullYear() - 1, 0, 1),
    end: () => new Date(new Date().getFullYear() - 1, 11, 31)
  }
};

export const CHART_TYPES = {
  bar: { label: 'Gráfico de Barras', icon: 'BarChart' },
  line: { label: 'Gráfico de Líneas', icon: 'LineChart' },
  pie: { label: 'Gráfico Circular', icon: 'PieChart' },
  area: { label: 'Gráfico de Área', icon: 'AreaChart' },
  donut: { label: 'Gráfico Dona', icon: 'Donut' },
  scatter: { label: 'Gráfico de Dispersión', icon: 'Scatter' }
};