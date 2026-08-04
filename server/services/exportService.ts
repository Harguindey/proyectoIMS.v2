import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { storage } from '../storage';
import type { 
  Product, WarehouseZone, StockMovement, Supplier, CustomerOrder, 
  Customer, OrderItem, ProductReservation, ShipmentTracking, Return 
} from '@shared/schema';

export interface ExportOptions {
  organizationId: number;
  format: 'pdf' | 'excel' | 'csv';
  module: 'inventory' | 'movements' | 'orders' | 'suppliers' | 'customers' | 'analytics' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: {
    categories?: string[];
    zones?: number[];
    suppliers?: number[];
    status?: string[];
  };
  columns?: string[];
  template?: 'standard' | 'detailed' | 'summary';
  includeCharts?: boolean;
  groupBy?: string;
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
  recordCount: number;
}

export class ExportService {
  private static readonly COMPANY_INFO = {
    name: 'SportMax Pro',
    tagline: 'Sistema de Gestión Deportiva Profesional',
    website: 'www.sportmaxpro.com',
    email: 'info@sportmaxpro.com'
  };

  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      console.log('Starting export with options:', options);
      
      // Get data based on module
      const data = await this.getDataForModule(options);
      
      // Generate export based on format
      switch (options.format) {
        case 'pdf':
          return await this.generatePDF(data, options);
        case 'excel':
          return await this.generateExcel(data, options);
        case 'csv':
          return await this.generateCSV(data, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  private async getDataForModule(options: ExportOptions): Promise<any> {
    const { organizationId, module, dateRange, filters } = options;
    
    switch (module) {
      case 'inventory':
        return await this.getInventoryData(organizationId, filters);
      case 'movements':
        return await this.getMovementsData(organizationId, dateRange, filters);
      case 'orders':
        return await this.getOrdersData(organizationId, dateRange, filters);
      case 'suppliers':
        return await this.getSuppliersData(organizationId, filters);
      case 'customers':
        return await this.getCustomersData(organizationId, filters);
      case 'analytics':
        return await this.getAnalyticsData(organizationId, dateRange, filters);
      case 'all':
        return await this.getAllData(organizationId, dateRange, filters);
      default:
        throw new Error(`Unsupported module: ${module}`);
    }
  }

  private async getInventoryData(organizationId: number, filters?: any) {
    const products = await storage.getAllProducts(organizationId);
    const zones = await storage.getAllWarehouseZones(organizationId);
    const lowStockProducts = await storage.getLowStockProducts(organizationId);
    
    // Apply filters
    let filteredProducts = products;
    if (filters?.categories?.length) {
      filteredProducts = products.filter(p => filters.categories.includes(p.category));
    }
    if (filters?.zones?.length) {
      filteredProducts = filteredProducts.filter(p => 
        p.warehouseZoneId && filters.zones.includes(p.warehouseZoneId)
      );
    }

    // Calculate metrics
    const totalValue = filteredProducts.reduce((sum, p) => 
      sum + (p.currentStock * parseFloat(p.unitPrice || '0')), 0
    );

    const categoryStats = filteredProducts.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = { count: 0, stock: 0, value: 0 };
      }
      acc[product.category].count++;
      acc[product.category].stock += product.currentStock;
      acc[product.category].value += product.currentStock * parseFloat(product.unitPrice || '0');
      return acc;
    }, {} as Record<string, any>);

    return {
      products: filteredProducts,
      zones,
      lowStockProducts: lowStockProducts.filter(p => 
        !filters?.categories?.length || filters.categories.includes(p.category)
      ),
      metrics: {
        totalProducts: filteredProducts.length,
        totalValue,
        lowStockCount: lowStockProducts.length,
        categoryStats
      }
    };
  }

  private async getMovementsData(organizationId: number, dateRange?: any, filters?: any) {
    const movements = await storage.getAllStockMovements(organizationId);
    const products = await storage.getAllProducts(organizationId);
    
    // Apply date range filter
    let filteredMovements = movements;
    if (dateRange) {
      filteredMovements = movements.filter(m => {
        const date = new Date(m.createdAt!);
        return date >= dateRange.start && date <= dateRange.end;
      });
    }

    // Add product names
    const enrichedMovements = filteredMovements.map(m => ({
      ...m,
      productName: products.find(p => p.id === m.productId)?.name || 'Desconocido'
    }));

    // Calculate statistics
    const entries = filteredMovements.filter(m => m.type === 'entry');
    const exits = filteredMovements.filter(m => m.type === 'exit');
    const transfers = filteredMovements.filter(m => m.type === 'transfer');

    return {
      movements: enrichedMovements,
      statistics: {
        totalMovements: filteredMovements.length,
        entriesCount: entries.length,
        exitsCount: exits.length,
        transfersCount: transfers.length,
        totalEntriesQuantity: entries.reduce((sum, m) => sum + m.quantity, 0),
        totalExitsQuantity: exits.reduce((sum, m) => sum + m.quantity, 0)
      }
    };
  }

  private async getOrdersData(organizationId: number, dateRange?: any, filters?: any) {
    const orders = await storage.getAllCustomerOrders(organizationId);
    const customers = await storage.getAllCustomers(organizationId);
    const orderItems = await storage.getAllOrderItems(organizationId);
    
    // Apply date range filter
    let filteredOrders = orders;
    if (dateRange) {
      filteredOrders = orders.filter(o => {
        const date = new Date(o.orderDate!);
        return date >= dateRange.start && date <= dateRange.end;
      });
    }

    // Apply status filter
    if (filters?.status?.length) {
      filteredOrders = filteredOrders.filter(o => filters.status.includes(o.status));
    }

    // Enrich with customer data
    const enrichedOrders = filteredOrders.map(order => ({
      ...order,
      customerName: customers.find(c => c.id === order.customerId)?.name || 'Desconocido',
      itemsCount: orderItems.filter(oi => oi.orderId === order.id).length
    }));

    // Calculate metrics
    const totalRevenue = filteredOrders.reduce((sum, o) => 
      sum + parseFloat(o.totalAmount || '0'), 0
    );

    const statusStats = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      orders: enrichedOrders,
      customers,
      orderItems,
      metrics: {
        totalOrders: filteredOrders.length,
        totalRevenue,
        averageOrderValue: totalRevenue / filteredOrders.length || 0,
        statusStats
      }
    };
  }

  private async getSuppliersData(organizationId: number, filters?: any) {
    const suppliers = await storage.getAllSuppliers(organizationId);
    const products = await storage.getAllProducts(organizationId);
    
    // Enrich suppliers with product counts
    const enrichedSuppliers = suppliers.map(supplier => ({
      ...supplier,
      productsCount: products.filter(p => p.supplierId === supplier.id).length,
      totalInventoryValue: products
        .filter(p => p.supplierId === supplier.id)
        .reduce((sum, p) => sum + (p.currentStock * parseFloat(p.unitPrice || '0')), 0)
    }));

    return {
      suppliers: enrichedSuppliers,
      metrics: {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.length, // All suppliers are considered active
        averageLeadTime: suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length,
        averageReliability: suppliers.reduce((sum, s) => sum + parseFloat(s.reliability || '0'), 0) / suppliers.length
      }
    };
  }

  private async getCustomersData(organizationId: number, filters?: any) {
    const customers = await storage.getAllCustomers(organizationId);
    const orders = await storage.getAllCustomerOrders(organizationId);
    
    // Enrich customers with order statistics
    const enrichedCustomers = customers.map(customer => {
      const customerOrders = orders.filter(o => o.customerId === customer.id);
      const totalSpent = customerOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0);
      
      return {
        ...customer,
        ordersCount: customerOrders.length,
        totalSpent,
        averageOrderValue: customerOrders.length ? totalSpent / customerOrders.length : 0,
        lastOrderDate: customerOrders.length ? 
          Math.max(...customerOrders.map(o => new Date(o.orderDate!).getTime())) : null
      };
    });

    return {
      customers: enrichedCustomers,
      metrics: {
        totalCustomers: customers.length,
        activeCustomers: enrichedCustomers.filter(c => c.ordersCount > 0).length,
        totalRevenue: enrichedCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
        averageCustomerValue: enrichedCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length
      }
    };
  }

  private async getAnalyticsData(organizationId: number, dateRange?: any, filters?: any) {
    const products = await storage.getAllProducts(organizationId);
    const movements = await storage.getAllStockMovements(organizationId);
    const orders = await storage.getAllCustomerOrders(organizationId);
    const zones = await storage.getAllWarehouseZones(organizationId);

    // Calculate various analytics metrics
    const totalInventoryValue = products.reduce((sum, p) => 
      sum + (p.currentStock * parseFloat(p.unitPrice || '0')), 0
    );

    const zoneUtilization = zones.map(zone => {
      const zoneProducts = products.filter(p => p.warehouseZoneId === zone.id);
      return {
        ...zone,
        utilization: (zone.currentOccupancy / zone.capacity) * 100,
        productsCount: zoneProducts.length,
        inventoryValue: zoneProducts.reduce((sum, p) => 
          sum + (p.currentStock * parseFloat(p.unitPrice || '0')), 0
        )
      };
    });

    return {
      inventory: { products, totalValue: totalInventoryValue },
      movements: { data: movements, count: movements.length },
      orders: { data: orders, count: orders.length },
      zones: zoneUtilization,
      metrics: {
        totalInventoryValue,
        totalProducts: products.length,
        totalMovements: movements.length,
        totalOrders: orders.length,
        averageZoneUtilization: zoneUtilization.reduce((sum, z) => sum + z.utilization, 0) / zones.length
      }
    };
  }

  private async getAllData(organizationId: number, dateRange?: any, filters?: any) {
    const [inventory, movements, orders, suppliers, customers, analytics] = await Promise.all([
      this.getInventoryData(organizationId, filters),
      this.getMovementsData(organizationId, dateRange, filters),
      this.getOrdersData(organizationId, dateRange, filters),
      this.getSuppliersData(organizationId, filters),
      this.getCustomersData(organizationId, filters),
      this.getAnalyticsData(organizationId, dateRange, filters)
    ]);

    return {
      inventory,
      movements,
      orders,
      suppliers,
      customers,
      analytics,
      summary: {
        totalProducts: inventory.products.length,
        totalMovements: movements.movements.length,
        totalOrders: orders.orders.length,
        totalSuppliers: suppliers.suppliers.length,
        totalCustomers: customers.customers.length,
        totalInventoryValue: inventory.metrics.totalValue
      }
    };
  }

  private async generatePDF(data: any, options: ExportOptions): Promise<ExportResult> {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('es-ES');
    let yPosition = 30;

    // Header with company branding
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text('SportMax Pro', 20, yPosition);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Sistema de Gestión Deportiva Profesional', 20, yPosition + 10);
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    yPosition += 30;
    doc.text(`Reporte de ${this.getModuleDisplayName(options.module)}`, 20, yPosition);
    
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    yPosition += 15;
    doc.text(`Fecha de generación: ${currentDate}`, 20, yPosition);
    
    if (options.dateRange) {
      doc.text(`Período: ${options.dateRange.start.toLocaleDateString('es-ES')} - ${options.dateRange.end.toLocaleDateString('es-ES')}`, 20, yPosition + 10);
      yPosition += 10;
    }

    yPosition += 20;

    // Generate content based on module
    switch (options.module) {
      case 'inventory':
        yPosition = await this.addInventoryToPDF(doc, data, yPosition);
        break;
      case 'movements':
        yPosition = await this.addMovementsToPDF(doc, data, yPosition);
        break;
      case 'orders':
        yPosition = await this.addOrdersToPDF(doc, data, yPosition);
        break;
      case 'suppliers':
        yPosition = await this.addSuppliersToPDF(doc, data, yPosition);
        break;
      case 'customers':
        yPosition = await this.addCustomersToPDF(doc, data, yPosition);
        break;
      default:
        yPosition = await this.addAllDataToPDF(doc, data, yPosition);
    }

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Página ${i} de ${pageCount}`, 20, 285);
      doc.text(`SportMax Pro © ${new Date().getFullYear()}`, 150, 285);
    }

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const fileName = `SportMaxPro_${options.module}_${currentDate.replace(/\//g, '-')}.pdf`;

    return {
      success: true,
      fileName,
      buffer,
      mimeType: 'application/pdf',
      size: buffer.length,
      recordCount: this.getRecordCount(data, options.module)
    };
  }

  private async generateExcel(data: any, options: ExportOptions): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new();
    const currentDate = new Date().toLocaleDateString('es-ES');

    // Create summary sheet
    const summaryData = [
      ['SPORTMAX PRO - REPORTE DE GESTIÓN DEPORTIVA'],
      [`Módulo: ${this.getModuleDisplayName(options.module)}`],
      [`Fecha de generación: ${currentDate}`],
      [''],
      ['RESUMEN EJECUTIVO']
    ];

    // Add module-specific sheets
    switch (options.module) {
      case 'inventory':
        this.addInventoryToExcel(workbook, data, summaryData);
        break;
      case 'movements':
        this.addMovementsToExcel(workbook, data, summaryData);
        break;
      case 'orders':
        this.addOrdersToExcel(workbook, data, summaryData);
        break;
      case 'suppliers':
        this.addSuppliersToExcel(workbook, data, summaryData);
        break;
      case 'customers':
        this.addCustomersToExcel(workbook, data, summaryData);
        break;
      default:
        this.addAllDataToExcel(workbook, data, summaryData);
    }

    // Create and add summary sheet
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `SportMaxPro_${options.module}_${currentDate.replace(/\//g, '-')}.xlsx`;

    return {
      success: true,
      fileName,
      buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      recordCount: this.getRecordCount(data, options.module)
    };
  }

  private async generateCSV(data: any, options: ExportOptions): Promise<ExportResult> {
    const currentDate = new Date().toLocaleDateString('es-ES');
    let csvContent = '';

    // Add header
    csvContent += `SportMax Pro - Reporte ${this.getModuleDisplayName(options.module)}\n`;
    csvContent += `Fecha: ${currentDate}\n\n`;

    // Generate CSV based on module
    switch (options.module) {
      case 'inventory':
        csvContent += this.generateInventoryCSV(data);
        break;
      case 'movements':
        csvContent += this.generateMovementsCSV(data);
        break;
      case 'orders':
        csvContent += this.generateOrdersCSV(data);
        break;
      case 'suppliers':
        csvContent += this.generateSuppliersCSV(data);
        break;
      case 'customers':
        csvContent += this.generateCustomersCSV(data);
        break;
      default:
        csvContent += this.generateAllDataCSV(data);
    }

    const buffer = Buffer.from(csvContent, 'utf8');
    const fileName = `SportMaxPro_${options.module}_${currentDate.replace(/\//g, '-')}.csv`;

    return {
      success: true,
      fileName,
      buffer,
      mimeType: 'text/csv',
      size: buffer.length,
      recordCount: this.getRecordCount(data, options.module)
    };
  }

  private getModuleDisplayName(module: string): string {
    const names = {
      inventory: 'Inventario',
      movements: 'Movimientos',
      orders: 'Pedidos',
      suppliers: 'Proveedores',
      customers: 'Clientes',
      analytics: 'Analíticas',
      all: 'Completo'
    };
    return names[module as keyof typeof names] || module;
  }

  private getRecordCount(data: any, module: string): number {
    switch (module) {
      case 'inventory':
        return data.products?.length || 0;
      case 'movements':
        return data.movements?.length || 0;
      case 'orders':
        return data.orders?.length || 0;
      case 'suppliers':
        return data.suppliers?.length || 0;
      case 'customers':
        return data.customers?.length || 0;
      default:
        return Object.values(data).reduce((sum: number, value: any) => {
          if (Array.isArray(value)) return sum + value.length;
          if (value && typeof value === 'object' && Array.isArray(value.data)) return sum + value.data.length;
          return sum;
        }, 0);
    }
  }

  // PDF helper methods
  private async addInventoryToPDF(doc: jsPDF, data: any, yPosition: number): Promise<number> {
    // Executive summary
    doc.setFontSize(16);
    doc.text('Resumen de Inventario', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Total de productos: ${data.metrics.totalProducts}`, 20, yPosition);
    doc.text(`Valor total del inventario: €${data.metrics.totalValue.toLocaleString()}`, 20, yPosition + 10);
    doc.text(`Productos con stock bajo: ${data.metrics.lowStockCount}`, 20, yPosition + 20);
    yPosition += 40;

    // Products table
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(14);
    doc.text('Listado de Productos', 20, yPosition);
    yPosition += 10;

    const productData = data.products.slice(0, 50).map((p: Product) => [
      p.name,
      p.sku || 'N/A',
      p.category,
      p.currentStock?.toString() || '0',
      `€${parseFloat(p.unitPrice || '0').toFixed(2)}`,
      `€${((p.currentStock || 0) * parseFloat(p.unitPrice || '0')).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Producto', 'SKU', 'Categoría', 'Stock', 'Precio Unit.', 'Valor Total']],
      body: productData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    return (doc as any).lastAutoTable.finalY + 20;
  }

  private async addMovementsToPDF(doc: jsPDF, data: any, yPosition: number): Promise<number> {
    // Statistics
    doc.setFontSize(16);
    doc.text('Estadísticas de Movimientos', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Total de movimientos: ${data.statistics.totalMovements}`, 20, yPosition);
    doc.text(`Entradas: ${data.statistics.entriesCount}`, 20, yPosition + 10);
    doc.text(`Salidas: ${data.statistics.exitsCount}`, 20, yPosition + 20);
    doc.text(`Transferencias: ${data.statistics.transfersCount}`, 20, yPosition + 30);
    yPosition += 50;

    // Movements table
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(14);
    doc.text('Historial de Movimientos', 20, yPosition);
    yPosition += 10;

    const movementData = data.movements.slice(0, 30).map((m: any) => [
      m.productName,
      m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Salida' : 'Transferencia',
      m.quantity.toString(),
      m.reason || 'N/A',
      new Date(m.createdAt).toLocaleDateString('es-ES')
    ]);

    autoTable(doc, {
      head: [['Producto', 'Tipo', 'Cantidad', 'Motivo', 'Fecha']],
      body: movementData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 9 }
    });

    return (doc as any).lastAutoTable.finalY + 20;
  }

  private async addOrdersToPDF(doc: jsPDF, data: any, yPosition: number): Promise<number> {
    // Order statistics
    doc.setFontSize(16);
    doc.text('Estadísticas de Pedidos', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Total de pedidos: ${data.metrics.totalOrders}`, 20, yPosition);
    doc.text(`Ingresos totales: €${data.metrics.totalRevenue.toFixed(2)}`, 20, yPosition + 10);
    doc.text(`Valor promedio por pedido: €${data.metrics.averageOrderValue.toFixed(2)}`, 20, yPosition + 20);
    yPosition += 40;

    // Orders table
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(14);
    doc.text('Listado de Pedidos', 20, yPosition);
    yPosition += 10;

    const orderData = data.orders.slice(0, 30).map((o: any) => [
      o.orderNumber,
      o.customerName,
      o.status,
      `€${parseFloat(o.totalAmount || '0').toFixed(2)}`,
      new Date(o.orderDate).toLocaleDateString('es-ES')
    ]);

    autoTable(doc, {
      head: [['Número', 'Cliente', 'Estado', 'Total', 'Fecha']],
      body: orderData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247] },
      styles: { fontSize: 9 }
    });

    return (doc as any).lastAutoTable.finalY + 20;
  }

  private async addSuppliersToPDF(doc: jsPDF, data: any, yPosition: number): Promise<number> {
    // Supplier statistics
    doc.setFontSize(16);
    doc.text('Estadísticas de Proveedores', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Total de proveedores: ${data.metrics.totalSuppliers}`, 20, yPosition);
    doc.text(`Tiempo promedio de entrega: ${data.metrics.averageLeadTime.toFixed(1)} días`, 20, yPosition + 10);
    doc.text(`Fiabilidad promedio: ${data.metrics.averageReliability.toFixed(1)}%`, 20, yPosition + 20);
    yPosition += 40;

    // Suppliers table
    const supplierData = data.suppliers.map((s: any) => [
      s.name,
      s.contactEmail || 'N/A',
      s.leadTimeDays.toString(),
      `${parseFloat(s.reliability || '0').toFixed(1)}%`,
      s.productsCount.toString(),
      `€${s.totalInventoryValue.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Proveedor', 'Email', 'Días Entrega', 'Fiabilidad', 'Productos', 'Valor Inventario']],
      body: supplierData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 9 }
    });

    return (doc as any).lastAutoTable.finalY + 20;
  }

  private async addCustomersToPDF(doc: jsPDF, data: any, yPosition: number): Promise<number> {
    // Customer statistics
    doc.setFontSize(16);
    doc.text('Estadísticas de Clientes', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Total de clientes: ${data.metrics.totalCustomers}`, 20, yPosition);
    doc.text(`Clientes activos: ${data.metrics.activeCustomers}`, 20, yPosition + 10);
    doc.text(`Valor promedio por cliente: €${data.metrics.averageCustomerValue.toFixed(2)}`, 20, yPosition + 20);
    yPosition += 40;

    // Customers table
    const customerData = data.customers.slice(0, 30).map((c: any) => [
      c.name,
      c.email || 'N/A',
      c.ordersCount.toString(),
      `€${c.totalSpent.toFixed(2)}`,
      `€${c.averageOrderValue.toFixed(2)}`,
      c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('es-ES') : 'Nunca'
    ]);

    autoTable(doc, {
      head: [['Cliente', 'Email', 'Pedidos', 'Total Gastado', 'Promedio/Pedido', 'Último Pedido']],
      body: customerData,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 }
    });

    return (doc as any).lastAutoTable.finalY + 20;
  }

  private async addAllDataToPDF(doc: jsPDF, data: any, yPosition: number): Promise<number> {
    // Executive summary
    doc.setFontSize(16);
    doc.text('Resumen Ejecutivo Completo', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(12);
    doc.text(`Total de productos: ${data.summary.totalProducts}`, 20, yPosition);
    doc.text(`Total de movimientos: ${data.summary.totalMovements}`, 20, yPosition + 10);
    doc.text(`Total de pedidos: ${data.summary.totalOrders}`, 20, yPosition + 20);
    doc.text(`Total de proveedores: ${data.summary.totalSuppliers}`, 20, yPosition + 30);
    doc.text(`Total de clientes: ${data.summary.totalCustomers}`, 20, yPosition + 40);
    doc.text(`Valor total del inventario: €${data.summary.totalInventoryValue.toFixed(2)}`, 20, yPosition + 50);

    return yPosition + 70;
  }

  // Excel helper methods
  private addInventoryToExcel(workbook: XLSX.WorkBook, data: any, summaryData: string[][]) {
    // Add inventory summary to summary data
    summaryData.push(
      ['Total de productos', data.metrics.totalProducts],
      ['Valor total del inventario', `€${data.metrics.totalValue.toLocaleString()}`],
      ['Productos con stock bajo', data.metrics.lowStockCount]
    );

    // Products sheet
    const productHeaders = ['Nombre', 'SKU', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Precio Unitario', 'Valor Total'];
    const productData = [
      productHeaders,
      ...data.products.map((p: Product) => [
        p.name,
        p.sku || 'N/A',
        p.category,
        p.currentStock || 0,
        p.minStock || 0,
        parseFloat(p.unitPrice || '0'),
        (p.currentStock || 0) * parseFloat(p.unitPrice || '0')
      ])
    ];

    const productSheet = XLSX.utils.aoa_to_sheet(productData);
    productSheet['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 20 }, 
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Inventario');

    // Low stock sheet
    if (data.lowStockProducts.length > 0) {
      const lowStockData = [
        ['Producto', 'SKU', 'Stock Actual', 'Stock Mínimo', 'Diferencia'],
        ...data.lowStockProducts.map((p: Product) => [
          p.name,
          p.sku || 'N/A',
          p.currentStock || 0,
          p.minStock || 0,
          (p.currentStock || 0) - (p.minStock || 0)
        ])
      ];

      const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
      lowStockSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Stock Bajo');
    }
  }

  private addMovementsToExcel(workbook: XLSX.WorkBook, data: any, summaryData: string[][]) {
    summaryData.push(
      ['Total de movimientos', data.statistics.totalMovements],
      ['Entradas', data.statistics.entriesCount],
      ['Salidas', data.statistics.exitsCount]
    );

    const movementData = [
      ['Producto', 'Tipo', 'Cantidad', 'Motivo', 'Fecha'],
      ...data.movements.map((m: any) => [
        m.productName,
        m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Salida' : 'Transferencia',
        m.quantity,
        m.reason || 'N/A',
        new Date(m.createdAt).toLocaleDateString('es-ES')
      ])
    ];

    const movementSheet = XLSX.utils.aoa_to_sheet(movementData);
    movementSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, movementSheet, 'Movimientos');
  }

  private addOrdersToExcel(workbook: XLSX.WorkBook, data: any, summaryData: string[][]) {
    summaryData.push(
      ['Total de pedidos', data.metrics.totalOrders],
      ['Ingresos totales', `€${data.metrics.totalRevenue.toFixed(2)}`],
      ['Valor promedio por pedido', `€${data.metrics.averageOrderValue.toFixed(2)}`]
    );

    const orderData = [
      ['Número de Pedido', 'Cliente', 'Estado', 'Total', 'Fecha'],
      ...data.orders.map((o: any) => [
        o.orderNumber,
        o.customerName,
        o.status,
        parseFloat(o.totalAmount || '0'),
        new Date(o.orderDate).toLocaleDateString('es-ES')
      ])
    ];

    const orderSheet = XLSX.utils.aoa_to_sheet(orderData);
    orderSheet['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, orderSheet, 'Pedidos');
  }

  private addSuppliersToExcel(workbook: XLSX.WorkBook, data: any, summaryData: string[][]) {
    summaryData.push(
      ['Total de proveedores', data.metrics.totalSuppliers],
      ['Tiempo promedio de entrega', `${data.metrics.averageLeadTime.toFixed(1)} días`],
      ['Fiabilidad promedio', `${data.metrics.averageReliability.toFixed(1)}%`]
    );

    const supplierData = [
      ['Proveedor', 'Email', 'Teléfono', 'Días de Entrega', 'Fiabilidad', 'Productos', 'Valor Inventario'],
      ...data.suppliers.map((s: any) => [
        s.name,
        s.contactEmail || 'N/A',
        s.contactPhone || 'N/A',
        s.leadTimeDays,
        parseFloat(s.reliability || '0'),
        s.productsCount,
        s.totalInventoryValue
      ])
    ];

    const supplierSheet = XLSX.utils.aoa_to_sheet(supplierData);
    supplierSheet['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 15 }, 
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, supplierSheet, 'Proveedores');
  }

  private addCustomersToExcel(workbook: XLSX.WorkBook, data: any, summaryData: string[][]) {
    summaryData.push(
      ['Total de clientes', data.metrics.totalCustomers],
      ['Clientes activos', data.metrics.activeCustomers],
      ['Valor promedio por cliente', `€${data.metrics.averageCustomerValue.toFixed(2)}`]
    );

    const customerData = [
      ['Cliente', 'Email', 'Teléfono', 'Pedidos', 'Total Gastado', 'Promedio/Pedido', 'Último Pedido'],
      ...data.customers.map((c: any) => [
        c.name,
        c.email || 'N/A',
        c.phone || 'N/A',
        c.ordersCount,
        c.totalSpent,
        c.averageOrderValue,
        c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('es-ES') : 'Nunca'
      ])
    ];

    const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
    customerSheet['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 15 }, 
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Clientes');
  }

  private addAllDataToExcel(workbook: XLSX.WorkBook, data: any, summaryData: string[][]) {
    summaryData.push(
      ['Total de productos', data.summary.totalProducts],
      ['Total de movimientos', data.summary.totalMovements],
      ['Total de pedidos', data.summary.totalOrders],
      ['Total de proveedores', data.summary.totalSuppliers],
      ['Total de clientes', data.summary.totalCustomers],
      ['Valor total del inventario', `€${data.summary.totalInventoryValue.toFixed(2)}`]
    );

    // Add individual module sheets
    if (data.inventory) this.addInventoryToExcel(workbook, data.inventory, []);
    if (data.movements) this.addMovementsToExcel(workbook, data.movements, []);
    if (data.orders) this.addOrdersToExcel(workbook, data.orders, []);
    if (data.suppliers) this.addSuppliersToExcel(workbook, data.suppliers, []);
    if (data.customers) this.addCustomersToExcel(workbook, data.customers, []);
  }

  // CSV helper methods
  private generateInventoryCSV(data: any): string {
    let csv = 'INVENTARIO\n';
    csv += 'Nombre,SKU,Categoría,Stock Actual,Stock Mínimo,Precio Unitario,Valor Total\n';
    
    data.products.forEach((p: Product) => {
      const totalValue = (p.currentStock || 0) * parseFloat(p.unitPrice || '0');
      csv += `"${p.name}","${p.sku || 'N/A'}","${p.category}",${p.currentStock || 0},${p.minStock || 0},${parseFloat(p.unitPrice || '0').toFixed(2)},${totalValue.toFixed(2)}\n`;
    });

    return csv;
  }

  private generateMovementsCSV(data: any): string {
    let csv = 'MOVIMIENTOS DE STOCK\n';
    csv += 'Producto,Tipo,Cantidad,Motivo,Fecha\n';
    
    data.movements.forEach((m: any) => {
      const type = m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Salida' : 'Transferencia';
      const date = new Date(m.createdAt).toLocaleDateString('es-ES');
      csv += `"${m.productName}","${type}",${m.quantity},"${m.reason || 'N/A'}","${date}"\n`;
    });

    return csv;
  }

  private generateOrdersCSV(data: any): string {
    let csv = 'PEDIDOS\n';
    csv += 'Número de Pedido,Cliente,Estado,Total,Fecha\n';
    
    data.orders.forEach((o: any) => {
      const date = new Date(o.orderDate).toLocaleDateString('es-ES');
      csv += `"${o.orderNumber}","${o.customerName}","${o.status}",${parseFloat(o.totalAmount || '0').toFixed(2)},"${date}"\n`;
    });

    return csv;
  }

  private generateSuppliersCSV(data: any): string {
    let csv = 'PROVEEDORES\n';
    csv += 'Proveedor,Email,Teléfono,Días de Entrega,Fiabilidad,Productos,Valor Inventario\n';
    
    data.suppliers.forEach((s: any) => {
      csv += `"${s.name}","${s.contactEmail || 'N/A'}","${s.contactPhone || 'N/A'}",${s.leadTimeDays},${parseFloat(s.reliability || '0').toFixed(1)},${s.productsCount},${s.totalInventoryValue.toFixed(2)}\n`;
    });

    return csv;
  }

  private generateCustomersCSV(data: any): string {
    let csv = 'CLIENTES\n';
    csv += 'Cliente,Email,Teléfono,Pedidos,Total Gastado,Promedio por Pedido,Último Pedido\n';
    
    data.customers.forEach((c: any) => {
      const lastOrder = c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('es-ES') : 'Nunca';
      csv += `"${c.name}","${c.email || 'N/A'}","${c.phone || 'N/A'}",${c.ordersCount},${c.totalSpent.toFixed(2)},${c.averageOrderValue.toFixed(2)},"${lastOrder}"\n`;
    });

    return csv;
  }

  private generateAllDataCSV(data: any): string {
    let csv = 'RESUMEN EJECUTIVO\n';
    csv += `Productos,${data.summary.totalProducts}\n`;
    csv += `Movimientos,${data.summary.totalMovements}\n`;
    csv += `Pedidos,${data.summary.totalOrders}\n`;
    csv += `Proveedores,${data.summary.totalSuppliers}\n`;
    csv += `Clientes,${data.summary.totalCustomers}\n`;
    csv += `Valor Inventario,${data.summary.totalInventoryValue.toFixed(2)}\n\n`;

    // Add each module's CSV data
    if (data.inventory) csv += this.generateInventoryCSV(data.inventory) + '\n';
    if (data.movements) csv += this.generateMovementsCSV(data.movements) + '\n';
    if (data.orders) csv += this.generateOrdersCSV(data.orders) + '\n';
    if (data.suppliers) csv += this.generateSuppliersCSV(data.suppliers) + '\n';
    if (data.customers) csv += this.generateCustomersCSV(data.customers) + '\n';

    return csv;
  }
}

export const exportService = new ExportService();
