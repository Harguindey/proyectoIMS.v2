import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateRelatedQueries } from "@/lib/queryClient";
import { insertStockMovementSchema } from "@shared/schema";
import type { Product, WarehouseZone, InsertStockMovement } from "@shared/schema";
import { z } from "zod";

const formSchema = insertStockMovementSchema;

type FormData = z.infer<typeof formSchema>;

interface StockMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "entry" | "exit";
}

export default function StockMovementModal({ open, onOpenChange, type }: StockMovementModalProps) {
  const { isMobile } = useDeviceDetection();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: 0,
      type,
      quantity: 1,
      fromZoneId: undefined,
      toZoneId: undefined,
      reason: "",
      notes: "",
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data: InsertStockMovement) => {
      const response = await apiRequest("POST", "/api/stock-movements", data);
      return response.json();
    },
    onSuccess: async () => {
      await invalidateRelatedQueries("movements");
      toast({
        title: "Movimiento registrado",
        description: `${type === "entry" ? "Entrada" : "Salida"} de stock registrada correctamente.`,
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo registrar el movimiento. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const movementData: InsertStockMovement = {
      ...data,
      type,
    };
    createMovementMutation.mutate(movementData);
  };

  const title = type === "entry" ? "Entrada de Stock" : "Salida de Stock";
  const submitText = type === "entry" ? "Registrar Entrada" : "Registrar Salida";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${
          isMobile 
            ? 'max-w-[95vw] max-h-[90vh] w-full mx-2' 
            : 'max-w-lg max-h-[85vh]'
        } overflow-y-auto`}
        data-testid="modal-stock-movement"
      >
        <DialogHeader className={isMobile ? 'pb-2' : ''}>
          <DialogTitle className={isMobile ? 'text-base' : 'text-lg'}>{title}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={isMobile ? 'space-y-4' : 'space-y-3'}>
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger 
                        className={isMobile ? 'h-12 touch-manipulation' : ''}
                        data-testid="select-product"
                      >
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} (Stock: {product.currentStock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="1" 
                      min="1"
                      className={isMobile ? 'h-12 text-base touch-manipulation' : ''}
                      data-testid="input-quantity"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === "entry" ? (
              <FormField
                control={form.control}
                name="toZoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona de Destino</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger 
                          className={isMobile ? 'h-12 touch-manipulation' : ''}
                          data-testid="select-zone-destination"
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
            ) : (
              <FormField
                control={form.control}
                name="fromZoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona de Origen</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger 
                          className={isMobile ? 'h-12 touch-manipulation' : ''}
                          data-testid="select-zone-origin"
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
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Motivo del movimiento..." 
                      className={isMobile ? 'h-12 text-base touch-manipulation' : ''}
                      data-testid="input-reason"
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionales..."
                      className={`${isMobile ? 'h-20 text-base touch-manipulation' : 'h-16'} resize-none`}
                      data-testid="textarea-notes"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={`flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 ${isMobile ? 'flex-col space-y-3 space-x-0' : ''}`}>
              <Button 
                type="button" 
                variant="outline" 
                size={isMobile ? 'default' : 'sm'}
                className={isMobile ? 'w-full h-12 touch-manipulation order-2' : ''}
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size={isMobile ? 'default' : 'sm'}
                className={isMobile ? 'w-full h-12 touch-manipulation order-1' : ''}
                disabled={createMovementMutation.isPending}
                data-testid="button-submit"
              >
                {createMovementMutation.isPending ? "Registrando..." : submitText}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
