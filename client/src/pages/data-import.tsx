import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiRequestJson } from "@/lib/queryClient";

// Helper function for file uploads
async function uploadFile(url: string, formData: FormData): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
  }
  
  return await res.json();
}
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Users,
  Package,
  MapPin,
  ArrowRightLeft,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

interface ImportWarning {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

interface PreviewResponse {
  filename: string;
  type: string;
  preview: ImportResult;
  canProceed: boolean;
}

const importTypes = [
  { 
    value: 'products', 
    label: 'Productos', 
    icon: Package,
    description: 'Importar productos con SKU, precios, stock y categorías',
    fields: ['nombre', 'sku', 'descripcion', 'categoria', 'stock_actual', 'precio_unitario']
  },
  { 
    value: 'customers', 
    label: 'Clientes', 
    icon: Users,
    description: 'Importar información de clientes y contacto',
    fields: ['nombre', 'email', 'telefono', 'direccion']
  },
  { 
    value: 'suppliers', 
    label: 'Proveedores', 
    icon: FileText,
    description: 'Importar proveedores con datos de contacto y confiabilidad',
    fields: ['nombre', 'email_contacto', 'telefono_contacto', 'direccion', 'dias_entrega']
  },
  { 
    value: 'zones', 
    label: 'Zonas de Almacén', 
    icon: MapPin,
    description: 'Importar zonas del almacén con capacidades',
    fields: ['codigo', 'nombre', 'descripcion', 'capacidad']
  },
  { 
    value: 'movements', 
    label: 'Movimientos de Stock', 
    icon: ArrowRightLeft,
    description: 'Importar movimientos históricos de inventario',
    fields: ['producto_id', 'tipo', 'cantidad', 'razon']
  },
  { 
    value: 'inventory', 
    label: 'Actualización de Inventario', 
    icon: RefreshCw,
    description: 'Actualizar niveles de stock existentes masivamente',
    fields: ['producto_id', 'sku', 'nuevo_stock', 'stock_minimo', 'stock_maximo']
  }
];

export default function DataImport() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'upload' | 'preview' | 'result'>('select');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }): Promise<PreviewResponse> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      return uploadFile('/api/import/preview', formData);
    },
    onSuccess: (data: PreviewResponse) => {
      setPreview(data);
      setStep('preview');
    },
    onError: (error: any) => {
      toast({
        title: "Error al procesar archivo",
        description: error.message || "No se pudo procesar el archivo seleccionado",
        variant: "destructive",
      });
    }
  });

  const importMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }): Promise<any> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      return uploadFile('/api/import/execute', formData);
    },
    onSuccess: (data: any) => {
      setImportResult(data);
      setStep('result');
      // Invalidar caché para actualizar datos
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouse-zones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-movements'] });
      
      toast({
        title: "Importación completada",
        description: `Se procesaron ${data.result.successCount} registros exitosamente`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en la importación",
        description: error.message || "No se pudo completar la importación",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStep('upload');
    }
  };

  const handlePreview = () => {
    if (file && selectedType) {
      previewMutation.mutate({ file, type: selectedType });
    }
  };

  const handleImport = () => {
    if (file && selectedType) {
      importMutation.mutate({ file, type: selectedType });
    }
  };

  const handleDownloadTemplate = async (type: string) => {
    try {
      window.open(`/api/import/template/${type}`, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar la plantilla",
        variant: "destructive",
      });
    }
  };

  const resetImport = () => {
    setSelectedType('');
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setStep('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedTypeInfo = importTypes.find(t => t.value === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Importación de Datos
          </h1>
          <p className="text-gray-600">
            Importa datos masivamente desde archivos Excel o CSV
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'select' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>1</div>
              <span>Seleccionar Tipo</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>2</div>
              <span>Subir Archivo</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>3</div>
              <span>Vista Previa</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'result' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'result' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>4</div>
              <span>Resultado</span>
            </div>
          </div>
        </div>

        {/* Step 1: Select Type */}
        {step === 'select' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Selecciona el tipo de datos a importar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {importTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card 
                      key={type.value} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                        selectedType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedType(type.value)}
                      data-testid={`import-type-${type.value}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Icon className="h-6 w-6 text-blue-600 mt-1" />
                          <div>
                            <h3 className="font-semibold text-gray-900">{type.label}</h3>
                            <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {type.fields.map((field) => (
                                <Badge key={field} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadTemplate(type.value);
                              }}
                              data-testid={`download-template-${type.value}`}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Descargar Plantilla
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {selectedType && (
                <div className="mt-6 flex justify-center">
                  <Button 
                    onClick={() => setStep('upload')}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="continue-to-upload"
                  >
                    Continuar con {selectedTypeInfo?.label}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload File */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Subir archivo para {selectedTypeInfo?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Selecciona tu archivo
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Archivos permitidos: Excel (.xlsx, .xls) o CSV (.csv)
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="file-input"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="select-file-button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                </div>
                
                {file && (
                  <div className="mt-6">
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Archivo seleccionado: <strong>{file.name}</strong>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="mt-4 flex justify-center space-x-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep('select')}
                        data-testid="back-to-select"
                      >
                        Volver
                      </Button>
                      <Button
                        onClick={handlePreview}
                        disabled={previewMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="preview-file"
                      >
                        {previewMutation.isPending ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Vista Previa
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa - {preview.filename}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {preview.preview.totalRows}
                        </div>
                        <div className="text-sm text-blue-800">Total de Filas</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {preview.preview.successCount}
                        </div>
                        <div className="text-sm text-green-800">Válidos</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {preview.preview.errorCount}
                        </div>
                        <div className="text-sm text-red-800">Con Errores</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progreso de validación</span>
                    <span>{Math.round((preview.preview.successCount / preview.preview.totalRows) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(preview.preview.successCount / preview.preview.totalRows) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Errors */}
                {preview.preview.errors.length > 0 && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      <div className="text-red-800">
                        <div className="font-semibold mb-2">Se encontraron {preview.preview.errors.length} errores:</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {preview.preview.errors.slice(0, 5).map((error, idx) => (
                            <div key={idx} className="text-xs">
                              Fila {error.row}: {error.message}
                            </div>
                          ))}
                          {preview.preview.errors.length > 5 && (
                            <div className="text-xs font-semibold">
                              ... y {preview.preview.errors.length - 5} errores más
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {preview.preview.warnings.length > 0 && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      <div className="text-yellow-800">
                        <div className="font-semibold mb-2">Se encontraron {preview.preview.warnings.length} advertencias:</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {preview.preview.warnings.slice(0, 3).map((warning, idx) => (
                            <div key={idx} className="text-xs">
                              Fila {warning.row}: {warning.message}
                            </div>
                          ))}
                          {preview.preview.warnings.length > 3 && (
                            <div className="text-xs font-semibold">
                              ... y {preview.preview.warnings.length - 3} advertencias más
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('upload')}
                    data-testid="back-to-upload"
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!preview.canProceed || importMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="execute-import"
                  >
                    {importMutation.isPending ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Importando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Ejecutar Importación
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Result */}
        {step === 'result' && importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Importación Completada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  importResult.result.success 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                }`}>
                  {importResult.result.success ? (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  {importResult.message}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.result.successCount}
                    </div>
                    <div className="text-sm text-gray-600">Registros Importados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.result.errorCount}
                    </div>
                    <div className="text-sm text-gray-600">Errores</div>
                  </div>
                </div>

                <Button
                  onClick={resetImport}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="new-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Nueva Importación
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}