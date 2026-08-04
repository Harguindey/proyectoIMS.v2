import * as XLSX from 'xlsx';
import { z } from 'zod';
import { 
  insertProductSchema, 
  insertCustomerSchema, 
  insertSupplierSchema, 
  insertWarehouseZoneSchema,
  insertStockMovementSchema,
  type InsertProduct,
  type InsertCustomer,
  type InsertSupplier,
  type InsertWarehouseZone,
  type InsertStockMovement
} from '@shared/schema';

// Enhanced logging for import operations
interface ImportLog {
  timestamp: Date;
  operation: string;
  type: string;
  filename?: string;
  userId?: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  warnings: number;
  errors: ImportError[];
  duration: number;
  metadata?: any;
}

class ImportLogger {
  private logs: ImportLog[] = [];

  log(logEntry: ImportLog) {
    this.logs.push(logEntry);
    console.log(`[Import ${logEntry.operation}] ${logEntry.type}: ${logEntry.successCount}/${logEntry.totalRows} successful in ${logEntry.duration}ms`, {
      filename: logEntry.filename,
      errors: logEntry.errorCount,
      warnings: logEntry.warnings
    });
  }

  getRecentLogs(limit: number = 50): ImportLog[] {
    return this.logs.slice(-limit);
  }

  getLogsByType(type: string): ImportLog[] {
    return this.logs.filter(log => log.type === type);
  }

  clearOldLogs(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
  }
}

const importLogger = new ImportLogger();

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  importedData: any[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ImportWarning {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ImportOptions {
  skipFirstRow?: boolean;
  dryRun?: boolean;
  batchSize?: number;
  updateExisting?: boolean;
}

export class ImportService {
  private validateAndParseData<T>(
    data: any[], 
    schema: z.ZodSchema<T>, 
    fieldMapping: Record<string, string>
  ): { 
    validData: T[], 
    errors: ImportError[], 
    warnings: ImportWarning[] 
  } {
    const validData: T[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 1;
      
      try {
        // Mapear campos del CSV a campos del esquema
        const mappedRow: any = {};
        Object.entries(fieldMapping).forEach(([csvField, schemaField]) => {
          if (row[csvField] !== undefined) {
            mappedRow[schemaField] = row[csvField];
          }
        });

        // Validar con el schema
        const validatedData = schema.parse(mappedRow);
        validData.push(validatedData);

        // Agregar advertencias para campos opcionales vacíos
        Object.keys(mappedRow).forEach(field => {
          if (mappedRow[field] === '' || mappedRow[field] === null) {
            warnings.push({
              row: rowNumber,
              field,
              message: `Campo vacío: ${field}`,
              data: row
            });
          }
        });

      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              row: rowNumber,
              field: err.path.join('.'),
              message: err.message,
              data: row
            });
          });
        } else {
          errors.push({
            row: rowNumber,
            message: `Error desconocido: ${error}`,
            data: row
          });
        }
      }
    });

    return { validData, errors, warnings };
  }

  async parseFileBuffer(buffer: Buffer, filename: string): Promise<any[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON con header en la primera fila
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false, // Convertir todo a string para manejo consistente
        defval: '' // Valor por defecto para celdas vacías
      });

      if (data.length === 0) {
        throw new Error('El archivo está vacío');
      }

      // Convertir primera fila como headers y resto como datos
      const headers = data[0] as string[];
      const rows = data.slice(1) as any[][];

      // Convertir a objetos con headers como keys
      const jsonData = rows.map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      return jsonData;
    } catch (error) {
      throw new Error(`Error al procesar archivo ${filename}: ${error}`);
    }
  }

  async importProducts(
    data: any[], 
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const { skipFirstRow = false, dryRun = false } = options;
    
    const processData = skipFirstRow ? data.slice(1) : data;
    
    // Mapeo de campos CSV a campos del esquema
    const fieldMapping = {
      'nombre': 'name',
      'sku': 'sku', 
      'descripcion': 'description',
      'categoria': 'category',
      'stock_actual': 'currentStock',
      'stock_minimo': 'minStock',
      'stock_maximo': 'maxStock',
      'precio_unitario': 'unitPrice',
      'zona_id': 'warehouseZoneId',
      'dias_entrega': 'leadTimeDays',
      'proveedor_id': 'supplierId',
      'nombre_proveedor': 'supplierName',
      'punto_reorden': 'reorderPoint',
      'cantidad_pedido': 'orderQuantity'
    };

    const { validData, errors, warnings } = this.validateAndParseData(
      processData, 
      insertProductSchema, 
      fieldMapping
    );

    const result: ImportResult = {
      success: errors.length === 0,
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      errors,
      warnings,
      importedData: validData
    };

    // Log the operation
    const duration = Date.now() - startTime;
    importLogger.log({
      timestamp: new Date(),
      operation: dryRun ? 'preview' : 'import',
      type: 'products',
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      warnings: warnings.length,
      errors,
      duration,
      metadata: { fieldMapping, dryRun }
    });

    return result;
  }

  async importCustomers(
    data: any[], 
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const { skipFirstRow = false, dryRun = false } = options;
    
    const processData = skipFirstRow ? data.slice(1) : data;
    
    const fieldMapping = {
      'nombre': 'name',
      'email': 'email',
      'telefono': 'phone',
      'direccion': 'address'
    };

    const { validData, errors, warnings } = this.validateAndParseData(
      processData, 
      insertCustomerSchema, 
      fieldMapping
    );

    const result: ImportResult = {
      success: errors.length === 0,
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      errors,
      warnings,
      importedData: validData
    };

    // Log the operation
    const duration = Date.now() - startTime;
    importLogger.log({
      timestamp: new Date(),
      operation: dryRun ? 'preview' : 'import',
      type: 'customers',
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      warnings: warnings.length,
      errors,
      duration,
      metadata: { fieldMapping, dryRun }
    });

    return result;
  }

  async importSuppliers(
    data: any[], 
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { skipFirstRow = false } = options;
    
    const processData = skipFirstRow ? data.slice(1) : data;
    
    const fieldMapping = {
      'nombre': 'name',
      'email_contacto': 'contactEmail',
      'telefono_contacto': 'contactPhone',
      'direccion': 'address',
      'dias_entrega': 'leadTimeDays',
      'confiabilidad': 'reliability'
    };

    const { validData, errors, warnings } = this.validateAndParseData(
      processData, 
      insertSupplierSchema, 
      fieldMapping
    );

    const result: ImportResult = {
      success: errors.length === 0,
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      errors,
      warnings,
      importedData: validData
    };

    return result;
  }

  async importWarehouseZones(
    data: any[], 
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { skipFirstRow = false } = options;
    
    const processData = skipFirstRow ? data.slice(1) : data;
    
    const fieldMapping = {
      'codigo': 'code',
      'nombre': 'name',
      'descripcion': 'description',
      'capacidad': 'capacity'
    };

    const { validData, errors, warnings } = this.validateAndParseData(
      processData, 
      insertWarehouseZoneSchema, 
      fieldMapping
    );

    const result: ImportResult = {
      success: errors.length === 0,
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      errors,
      warnings,
      importedData: validData
    };

    return result;
  }

  async importStockMovements(
    data: any[], 
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { skipFirstRow = false } = options;
    
    const processData = skipFirstRow ? data.slice(1) : data;
    
    const fieldMapping = {
      'producto_id': 'productId',
      'tipo': 'type',
      'cantidad': 'quantity',
      'zona_origen_id': 'fromZoneId',
      'zona_destino_id': 'toZoneId',
      'razon': 'reason',
      'notas': 'notes',
      'pedido_id': 'orderId'
    };

    const { validData, errors, warnings } = this.validateAndParseData(
      processData, 
      insertStockMovementSchema, 
      fieldMapping
    );

    const result: ImportResult = {
      success: errors.length === 0,
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      errors,
      warnings,
      importedData: validData
    };

    return result;
  }

  // Función específica para actualización masiva de inventario
  async importInventoryUpdates(
    data: any[], 
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { skipFirstRow = false } = options;
    
    const processData = skipFirstRow ? data.slice(1) : data;
    
    // Mapeo específico para actualizaciones de inventario
    const fieldMapping = {
      'producto_id': 'productId',
      'sku': 'sku',
      'nuevo_stock': 'newStock',
      'stock_minimo': 'minStock',
      'stock_maximo': 'maxStock',
      'zona_id': 'warehouseZoneId'
    };

    // Schema específico para actualizaciones de inventario
    const inventoryUpdateSchema = z.object({
      productId: z.number().optional(),
      sku: z.string().optional(),
      newStock: z.number().min(0, 'El stock no puede ser negativo'),
      minStock: z.number().optional(),
      maxStock: z.number().optional(),
      warehouseZoneId: z.number().optional()
    }).refine(data => data.productId || data.sku, {
      message: "Debe proporcionar producto_id o sku para identificar el producto"
    });

    const { validData, errors, warnings } = this.validateAndParseData(
      processData, 
      inventoryUpdateSchema, 
      fieldMapping
    );

    const result: ImportResult = {
      success: errors.length === 0,
      totalRows: processData.length,
      successCount: validData.length,
      errorCount: errors.length,
      errors,
      warnings,
      importedData: validData
    };

    return result;
  }

  generateTemplate(type: 'products' | 'customers' | 'suppliers' | 'zones' | 'movements' | 'inventory'): any[] {
    switch (type) {
      case 'products':
        return [{
          nombre: 'Ejemplo Producto',
          sku: 'EJ-001',
          descripcion: 'Descripción del producto',
          categoria: 'Deportes',
          stock_actual: 50,
          stock_minimo: 10,
          stock_maximo: 100,
          precio_unitario: 29.99,
          zona_id: 1,
          dias_entrega: 7,
          proveedor_id: 1,
          nombre_proveedor: 'Proveedor Ejemplo',
          punto_reorden: 15,
          cantidad_pedido: 50
        }];

      case 'customers':
        return [{
          nombre: 'Cliente Ejemplo',
          email: 'cliente@ejemplo.com',
          telefono: '+34 600 000 000',
          direccion: 'Calle Ejemplo 123, Madrid'
        }];

      case 'suppliers':
        return [{
          nombre: 'Proveedor Ejemplo',
          email_contacto: 'contacto@proveedor.com',
          telefono_contacto: '+34 900 000 000',
          direccion: 'Polígono Industrial 456, Barcelona',
          dias_entrega: 7,
          confiabilidad: 95.00
        }];

      case 'zones':
        return [{
          codigo: 'EJ-01',
          nombre: 'Zona Ejemplo',
          descripcion: 'Descripción de la zona',
          capacidad: 100
        }];

      case 'movements':
        return [{
          producto_id: 1,
          tipo: 'entry',
          cantidad: 10,
          zona_origen_id: null,
          zona_destino_id: 1,
          razon: 'Recepción de mercancía',
          notas: 'Movimiento de ejemplo',
          pedido_id: null
        }];

      case 'inventory':
        return [{
          producto_id: 1,
          sku: 'EJ-001',
          nuevo_stock: 75,
          stock_minimo: 10,
          stock_maximo: 150,
          zona_id: 1
        }];

      default:
        return [];
    }
  }
  // Generar plantilla Excel descargable
  generateExcelTemplate(type: 'products' | 'customers' | 'suppliers' | 'zones' | 'movements' | 'inventory'): Buffer {
    let headers: string[] = [];
    let exampleRows: any[][] = [];
    let sheetName = '';

    switch (type) {
      case 'products':
        sheetName = 'Productos';
        headers = ['nombre', 'sku', 'descripcion', 'categoria', 'stock_actual', 'stock_minimo', 'stock_maximo', 'precio_unitario'];
        exampleRows = [
          ['Balón de Fútbol Nike', 'NIKE-FUTBOL-001', 'Balón oficial talla 5', 'FUTBOL', 50, 10, 100, 29.99],
          ['Raqueta de Tenis Wilson', 'WILSON-TENIS-001', 'Raqueta profesional adulto', 'TENIS', 25, 5, 50, 89.99],
          ['Zapatillas Running Adidas', 'ADIDAS-RUNNING-001', 'Zapatillas running hombre talla 42', 'RUNNING', 30, 8, 80, 119.99],
          ['Guantes de Boxeo Everlast', 'EVERLAST-BOXEO-001', 'Guantes de boxeo 12 oz', 'BOXEO', 15, 3, 40, 45.50],
          ['Bicicleta de Montaña Trek', 'TREK-CICLISMO-001', 'Bicicleta MTB 29 pulgadas', 'CICLISMO', 8, 2, 20, 599.00]
        ];
        break;

      case 'customers':
        sheetName = 'Clientes';
        headers = ['nombre', 'email', 'telefono', 'direccion'];
        exampleRows = [
          ['Juan Pérez García', 'juan.perez@ejemplo.com', '+34 600 123 456', 'Calle Mayor 123, 28013 Madrid'],
          ['María López Fernández', 'maria.lopez@ejemplo.com', '+34 611 234 567', 'Avenida Diagonal 456, 08015 Barcelona'],
          ['Carlos Ruiz Martínez', 'carlos.ruiz@ejemplo.com', '+34 622 345 678', 'Calle Colón 78, 46004 Valencia'],
          ['Ana Sánchez Torres', 'ana.sanchez@ejemplo.com', '+34 633 456 789', 'Gran Vía 234, 41001 Sevilla']
        ];
        break;

      case 'suppliers':
        sheetName = 'Proveedores';
        headers = ['nombre', 'email_contacto', 'telefono_contacto', 'direccion', 'dias_entrega', 'confiabilidad'];
        exampleRows = [
          ['Nike España', 'pedidos@nike.es', '+34 902 100 101', 'Polígono Industrial Las Mercedes, 28022 Madrid', 7, 95.00],
          ['Adidas Iberia', 'ventas@adidas.es', '+34 902 200 202', 'Parque Empresarial La Moraleja, 28108 Alcobendas', 5, 98.50],
          ['Decathlon Logística', 'b2b@decathlon.es', '+34 902 300 303', 'Avenida de Europa 10, 28230 Las Rozas', 3, 92.00],
          ['Wilson Sports', 'pedidos@wilson.es', '+34 900 400 404', 'Calle Severo Ochoa 15, 28760 Tres Cantos', 10, 88.00]
        ];
        break;

      case 'zones':
        sheetName = 'Zonas';
        headers = ['codigo', 'nombre', 'descripcion', 'capacidad'];
        exampleRows = [
          ['FUTBOL-A1', 'Zona Fútbol A1', 'Nave A - Sección 1 - Balones y accesorios', 150],
          ['TENIS-A2', 'Zona Tenis A2', 'Nave A - Sección 2 - Raquetas y pelotas', 100],
          ['RUNNING-B1', 'Zona Running B1', 'Nave B - Sección 1 - Calzado deportivo', 200],
          ['BOXEO-C1', 'Zona Boxeo C1', 'Nave C - Sección 1 - Equipamiento de boxeo', 80],
          ['CICLISMO-D1', 'Zona Ciclismo D1', 'Nave D - Sección 1 - Bicicletas y componentes', 50]
        ];
        break;

      case 'movements':
        sheetName = 'Movimientos';
        headers = ['producto_id', 'tipo', 'cantidad', 'zona_origen_id', 'zona_destino_id', 'razon', 'notas'];
        exampleRows = [
          [1, 'entry', 50, null, 1, 'Recepción de mercancía', 'Pedido #1234 - Proveedor Nike'],
          [2, 'exit', 10, 1, null, 'Venta a cliente', 'Pedido cliente #5678'],
          [3, 'transfer', 15, 1, 2, 'Reubicación interna', 'Reorganización de almacén'],
          [1, 'adjustment', -5, null, 1, 'Ajuste de inventario', 'Productos dañados']
        ];
        break;

      case 'inventory':
        sheetName = 'Inventario';
        headers = ['producto_id', 'sku', 'nuevo_stock', 'stock_minimo', 'stock_maximo', 'zona_id'];
        exampleRows = [
          [1, 'NIKE-FUTBOL-001', 75, 10, 150, 1],
          [2, 'WILSON-TENIS-001', 40, 5, 80, 2],
          [3, 'ADIDAS-RUNNING-001', 55, 8, 100, 3],
          [4, 'EVERLAST-BOXEO-001', 20, 3, 50, 4]
        ];
        break;

      default:
        headers = [];
        exampleRows = [];
    }

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    
    // Crear datos: encabezados + filas de ejemplo
    const wsData = [headers, ...exampleRows];
    
    // Convertir a worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Configurar anchos de columna
    const colWidths = headers.map(() => ({ wch: 25 }));
    ws['!cols'] = colWidths;
    
    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generar buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return excelBuffer;
  }

  // Método para acceder a los logs
  getImportLogs(limit: number = 50): ImportLog[] {
    return importLogger.getRecentLogs(limit);
  }

  getLogsByType(type: string): ImportLog[] {
    return importLogger.getLogsByType(type);
  }
}

export const importService = new ImportService();
export { importLogger };