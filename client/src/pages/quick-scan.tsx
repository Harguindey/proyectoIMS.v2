import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Barcode, Package, Plus, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

export default function QuickScanPage() {
  const { toast } = useToast();
  const [scannedCode, setScannedCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentEntries, setRecentEntries] = useState<Array<{ product: Product; quantity: number; timestamp: Date }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number }) => {
      return await apiRequest("POST", "/api/stock-movements", {
        productId: data.productId,
        quantity: data.quantity,
        type: "entry",
        reason: "Entrada por escaneo rápido",
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
      
      if (selectedProduct) {
        setRecentEntries(prev => [{
          product: selectedProduct,
          quantity: variables.quantity,
          timestamp: new Date()
        }, ...prev.slice(0, 9)]);
      }
      
      toast({
        title: "Entrada registrada",
        description: `Se agregaron ${variables.quantity} unidades al inventario`,
      });
      
      // Reset para siguiente escaneo
      setScannedCode("");
      setQuantity("1");
      setSelectedProduct(null);
      
      // Focus automático para siguiente escaneo
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "No se pudo registrar la entrada",
        variant: "destructive",
      });
    },
  });

  // Búsqueda automática cuando se ingresa código
  useEffect(() => {
    if (!scannedCode.trim()) {
      setSelectedProduct(null);
      return;
    }

    const trimmedCode = scannedCode.trim().toUpperCase();
    
    // Buscar por SKU o por ID
    const foundProduct = products.find(
      p => p.sku.toUpperCase() === trimmedCode || p.id.toString() === trimmedCode
    );

    if (foundProduct) {
      setSelectedProduct(foundProduct);
    } else {
      setSelectedProduct(null);
    }
  }, [scannedCode, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "No se encontró ningún producto con ese código",
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    createMovementMutation.mutate({
      productId: selectedProduct.id,
      quantity: qty,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedProduct && !createMovementMutation.isPending) {
      handleSubmit(e);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
          <Barcode className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Entrada Rápida</h1>
          <p className="text-muted-foreground">Escanea códigos para registrar entradas</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de escaneo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Escáner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Producto (SKU o ID)</Label>
                <Input
                  id="code"
                  ref={inputRef}
                  type="text"
                  placeholder="Escanea o escribe el código..."
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  autoComplete="off"
                  className="text-lg font-mono"
                  data-testid="input-scan-code"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Escanea con pistola, cámara o escribe manualmente
                </p>
              </div>

              {selectedProduct && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-900 dark:text-green-100">
                        Producto encontrado
                      </span>
                    </div>
                    <Badge variant="outline">{selectedProduct.sku}</Badge>
                  </div>
                  
                  <div>
                    <p className="font-medium text-lg">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduct.category}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Stock actual: </span>
                      <span className="font-semibold">{selectedProduct.currentStock}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ID: </span>
                      <span className="font-mono">{selectedProduct.id}</span>
                    </div>
                  </div>
                </div>
              )}

              {scannedCode && !selectedProduct && (
                <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
                    <X className="h-5 w-5" />
                    <span className="font-semibold">Producto no encontrado</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    No existe ningún producto con el código "{scannedCode}"
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad a Ingresar</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-lg"
                  data-testid="input-quantity"
                />
              </div>

              <Button
                type="submit"
                disabled={!selectedProduct || createMovementMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-register-entry"
              >
                {createMovementMutation.isPending ? (
                  "Registrando..."
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Registrar Entrada
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Panel de entradas recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Entradas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay entradas registradas aún</p>
                <p className="text-sm mt-1">Las entradas aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                    data-testid={`recent-entry-${index}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {entry.product.sku} • {entry.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        +{entry.quantity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instrucciones */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
            📖 Instrucciones de Uso
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">1.</span>
              <span>Coloca el cursor en el campo "Código de Producto"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">2.</span>
              <span>Escanea el código de barras con tu pistola escáner (o escribe manualmente)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">3.</span>
              <span>El producto aparecerá automáticamente si existe en el sistema</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">4.</span>
              <span>Ajusta la cantidad si es necesario (por defecto 1)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">5.</span>
              <span>Presiona Enter o click en "Registrar Entrada"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold min-w-[20px]">6.</span>
              <span>El sistema está listo para escanear el siguiente producto</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
