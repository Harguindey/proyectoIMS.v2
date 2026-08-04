import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateRelatedQueries } from "@/lib/queryClient";

import type { Product, InsertStockMovement } from "@shared/schema";

const movementSchema = z.object({
  productId: z.string().min(1, "Producto es requerido"),
  type: z.enum(["entry", "exit"], { required_error: "Tipo es requerido" }),
  quantity: z.number().min(1, "Cantidad debe ser mayor a 0"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const bulkMovementSchema = z.object({
  movements: z.array(movementSchema).min(1, "Debe agregar al menos un movimiento"),
});

type BulkMovementData = z.infer<typeof bulkMovementSchema>;

interface BulkStockMovementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "entry" | "exit" | "both";
}

export default function BulkStockMovementsModal({ 
  open, 
  onOpenChange, 
  type 
}: BulkStockMovementsModalProps) {
  const { isMobile } = useDeviceDetection();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<BulkMovementData>({
    resolver: zodResolver(bulkMovementSchema),
    defaultValues: {
      movements: [
        {
          productId: "",
          type: type !== "both" ? type : "entry",
          quantity: 1,
          reason: "",
          notes: "",
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "movements",
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (movements: InsertStockMovement[]) => {
      const results = [];
      for (const movement of movements) {
        const response = await apiRequest("POST", "/api/stock-movements", movement);
        const result = await response.json();
        results.push(result);
      }
      return results;
    },
    onSuccess: async (data) => {
      await invalidateRelatedQueries("movements");
      toast({
        title: "Movimientos creados",
        description: `Se crearon ${data.length} movimientos correctamente.`,
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron crear todos los movimientos.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkMovementData) => {
    const movementsData: InsertStockMovement[] = data.movements.map((movement) => ({
      productId: parseInt(movement.productId),
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason || null,
      notes: movement.notes || null,
      fromZoneId: movement.type === "exit" ? null : undefined,
      toZoneId: movement.type === "entry" ? null : undefined,
    }));

    bulkCreateMutation.mutate(movementsData);
  };

  const addNewMovement = () => {
    append({
      productId: "",
      type: type !== "both" ? type : "entry",
      quantity: 1,
      reason: "",
      notes: "",
    });
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    return product ? product.name : "Producto no encontrado";
  };

  const getMovementIcon = (movementType: "entry" | "exit") => {
    return movementType === "entry" ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getModalTitle = () => {
    if (type === "entry") return "Agregar Múltiples Entradas";
    if (type === "exit") return "Agregar Múltiples Salidas";
    return "Agregar Múltiples Movimientos";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${
          isMobile 
            ? 'max-w-[95vw] max-h-[95vh] w-full mx-2' 
            : 'max-w-6xl max-h-[90vh]'
        } overflow-y-auto`}
        data-testid="modal-bulk-stock-movements"
      >
        <DialogHeader className={isMobile ? 'pb-2' : ''}>
          <DialogTitle className={`flex items-center ${isMobile ? 'text-base' : 'text-lg'}`}>
            {type === "entry" ? <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2 text-green-600`} /> :
             type === "exit" ? <TrendingDown className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2 text-red-600`} /> :
             <Plus className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />}
            {isMobile ? (type === "entry" ? "Entradas Múltiples" : type === "exit" ? "Salidas Múltiples" : "Movimientos Múltiples") : getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="relative" data-testid={`card-movement-${index}`}>
                  <CardHeader className={isMobile ? 'pb-2 p-4' : 'pb-4'}>
                    <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-2' : ''}`}>
                      <CardTitle className={`${isMobile ? 'text-sm' : 'text-lg'} flex items-center ${isMobile ? 'w-full' : ''}`}>
                        {getMovementIcon(form.watch(`movements.${index}.type`))}
                        <span className="ml-2">Movimiento {index + 1}</span>
                        {form.watch(`movements.${index}.productId`) && (
                          <span className={`ml-2 ${isMobile ? 'text-xs' : 'text-sm'} font-normal text-slate-600 ${isMobile ? 'truncate' : ''}`}>
                            - {getProductName(form.watch(`movements.${index}.productId`))}
                          </span>
                        )}
                      </CardTitle>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size={isMobile ? 'sm' : 'sm'}
                          className={isMobile ? 'h-8 w-8 p-0 flex-shrink-0' : ''}
                          onClick={() => remove(index)}
                          data-testid={`button-remove-movement-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className={`${isMobile ? 'space-y-3 p-4' : 'space-y-4'}`}>
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                      <FormField
                        control={form.control}
                        name={`movements.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Producto</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className={isMobile ? 'h-12 touch-manipulation' : ''}
                                  data-testid={`select-product-${index}`}
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

                      {type === "both" && (
                        <FormField
                          control={form.control}
                          name={`movements.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Movimiento</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger 
                                    className={isMobile ? 'h-12 touch-manipulation' : ''}
                                    data-testid={`select-type-${index}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="entry">Entrada</SelectItem>
                                  <SelectItem value="exit">Salida</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name={`movements.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                className={isMobile ? 'h-12 text-base touch-manipulation' : ''}
                                data-testid={`input-quantity-${index}`}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`movements.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Notas adicionales sobre el movimiento..." 
                              className={`${isMobile ? 'h-16 text-base touch-manipulation' : 'h-20'} resize-none`}
                              data-testid={`textarea-notes-${index}`}
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={addNewMovement}
                className={`w-full ${isMobile ? 'h-12 touch-manipulation' : ''}`}
                data-testid="button-add-movement"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isMobile ? "Agregar Movimiento" : "Agregar Otro Movimiento"}
              </Button>
            </div>

            <div className={`flex pt-4 border-t ${isMobile ? 'flex-col space-y-3' : 'justify-end space-x-4'}`}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className={isMobile ? 'w-full h-12 touch-manipulation order-2' : ''}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={bulkCreateMutation.isPending}
                className={isMobile ? 'w-full h-12 touch-manipulation order-1' : ''}
                data-testid="button-submit"
              >
                {bulkCreateMutation.isPending ? "Creando..." : (isMobile ? `Crear ${fields.length}` : `Crear ${fields.length} Movimientos`)}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}