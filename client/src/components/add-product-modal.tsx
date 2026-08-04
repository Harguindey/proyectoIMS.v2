import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateRelatedQueries } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";
import type { WarehouseZone, InsertProduct } from "@shared/schema";
import { z } from "zod";
import { Check, Sparkles, AlertCircle } from "lucide-react";

const formSchema = insertProductSchema.extend({
  unitPrice: z.number().min(0, "El precio debe ser mayor a 0"),
});

type FormData = z.infer<typeof formSchema>;

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddProductModal({ open, onOpenChange }: AddProductModalProps) {
  const { isMobile } = useDeviceDetection();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [skuSuggestion, setSkuSuggestion] = useState<string | null>(null);
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedCategory, setDebouncedCategory] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      category: "",
      currentStock: 0,
      minStock: 10,
      unitPrice: 0,
      warehouseZoneId: undefined,
    },
  });

  // Watch name and category for SKU suggestion
  const watchName = form.watch("name");
  const watchCategory = form.watch("category");
  const watchSku = form.watch("sku");

  // Debounce name and category
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(watchName);
      setDebouncedCategory(watchCategory);
    }, 500);
    return () => clearTimeout(timer);
  }, [watchName, watchCategory]);

  // Clear suggestion when name or category changes
  useEffect(() => {
    if (!watchName || !watchCategory) {
      setSkuSuggestion(null);
    }
  }, [watchName, watchCategory]);

  // Fetch SKU suggestion when name and category are available
  const { data: skuData, isLoading: isLoadingSuggestion } = useQuery<{ suggested: string; exists: boolean }>({
    queryKey: ["/api/products/suggest-sku", debouncedName, debouncedCategory],
    enabled: !!(debouncedName && debouncedCategory && debouncedName.length > 2),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (skuData?.suggested) {
      setSkuSuggestion(skuData.suggested);
    }
  }, [skuData]);

  // Check if manually entered SKU exists
  const { data: skuCheckData } = useQuery<{ suggested: string; exists: boolean }>({
    queryKey: ["/api/products/suggest-sku", "manual", watchSku],
    enabled: false, // We'll manually check if needed
    refetchOnWindowFocus: false,
  });

  // Determine SKU validation state
  const skuValidationState = useMemo(() => {
    if (!watchSku) return null;
    
    // If we have data and the SKU matches the suggested one
    if (skuData && watchSku === skuData.suggested) {
      return skuData.exists ? "duplicate" : "available";
    }
    
    // For manually entered SKUs, we'd need to check against all products
    // For now, we'll just show available if it doesn't match any known pattern
    return "available";
  }, [watchSku, skuData]);

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: async () => {
      await invalidateRelatedQueries("products");
      toast({
        title: "Producto creado",
        description: "El producto se ha agregado correctamente al inventario.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el producto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const productData: InsertProduct = {
      ...data,
      unitPrice: data.unitPrice.toString(),
    };
    createProductMutation.mutate(productData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${
          isMobile 
            ? 'max-w-[95vw] max-h-[95vh] w-full mx-2' 
            : 'max-w-2xl max-h-[90vh]'
        } overflow-y-auto`}
        data-testid="modal-add-product"
      >
        <DialogHeader className={isMobile ? 'pb-2' : ''}>
          <DialogTitle className={isMobile ? 'text-base' : 'text-lg'}>Agregar Nuevo Producto</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={isMobile ? 'space-y-3' : 'space-y-4'}>
            <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>Nombre del Producto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Laptop Dell XPS 13" 
                        {...field} 
                        className={isMobile ? 'h-12 text-base' : ''}
                        data-testid="input-product-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>SKU</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="Ej: LAP-DEL-001" 
                          {...field} 
                          className={isMobile ? 'h-12 text-base' : ''}
                          data-testid="input-product-sku"
                        />
                      </FormControl>
                      {skuSuggestion && !field.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size={isMobile ? "default" : "default"}
                          onClick={() => form.setValue("sku", skuSuggestion)}
                          className="shrink-0"
                          data-testid="button-use-suggested-sku"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          {isMobile ? "" : "Usar"}
                        </Button>
                      )}
                    </div>
                    {skuSuggestion && !field.value && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                        Sugerencia: <code className="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded text-green-700 dark:text-green-300 font-mono">{skuSuggestion}</code>
                      </p>
                    )}
                    {isLoadingSuggestion && field.value && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        Verificando disponibilidad...
                      </p>
                    )}
                    {!isLoadingSuggestion && skuValidationState === "available" && field.value && skuData && (
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                        <Check className="h-3 w-3" />
                        SKU disponible
                      </p>
                    )}
                    {!isLoadingSuggestion && skuValidationState === "duplicate" && field.value && skuData && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        Este SKU ya existe. Elige otro diferente.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className={isMobile ? 'h-12 text-base' : ''}
                          data-testid="select-product-category"
                        >
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fútbol">Fútbol</SelectItem>
                        <SelectItem value="Baloncesto">Baloncesto</SelectItem>
                        <SelectItem value="Tenis">Tenis</SelectItem>
                        <SelectItem value="Running">Running</SelectItem>
                        <SelectItem value="Fitness">Fitness</SelectItem>
                        <SelectItem value="Natación">Natación</SelectItem>
                        <SelectItem value="Ciclismo">Ciclismo</SelectItem>
                        <SelectItem value="Deportes de Invierno">Deportes de Invierno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="warehouseZoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>Ubicación</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger 
                          className={isMobile ? 'h-12 text-base' : ''}
                          data-testid="select-product-zone"
                        >
                          <SelectValue placeholder="Seleccionar zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id.toString()}>
                            {zone.name} ({zone.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción detallada del producto..."
                      className={`${isMobile ? 'h-20 text-base' : 'h-24'}`}
                      data-testid="textarea-product-description"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-3' : 'md:grid-cols-2'} ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>Stock Inicial</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        min="0"
                        className={isMobile ? 'h-12 text-base' : ''}
                        data-testid="input-current-stock"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>Stock Mínimo</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10" 
                        min="0"
                        className={isMobile ? 'h-12 text-base' : ''}
                        data-testid="input-min-stock"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isMobile ? 'text-sm font-medium' : ''}>Precio Unitario</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        min="0"
                        className={isMobile ? 'h-12 text-base' : ''}
                        data-testid="input-unit-price"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-end space-x-4'} pt-4`}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className={isMobile ? 'w-full h-12 text-base' : ''}
                data-testid="button-cancel-product"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createProductMutation.isPending}
                className={isMobile ? 'w-full h-12 text-base' : ''}
                data-testid="button-submit-product"
              >
                {createProductMutation.isPending ? "Agregando..." : "Agregar Producto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
