import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Trash2, Package } from "lucide-react";

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
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import type { WarehouseZone, InsertProduct } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  sku: z.string().min(1, "SKU es requerido"),
  description: z.string().optional(),
  category: z.string().optional(),
  currentStock: z.number().min(0, "Stock debe ser mayor o igual a 0"),
  minStock: z.number().min(0, "Stock mínimo debe ser mayor o igual a 0"),
  unitPrice: z.number().min(0, "Precio debe ser mayor o igual a 0"),
  warehouseZoneId: z.string().min(1, "Zona de almacén es requerida"),
  leadTimeDays: z.number().min(1, "Tiempo de entrega debe ser mayor a 0"),
});

const bulkFormSchema = z.object({
  products: z.array(productSchema).min(1, "Debe agregar al menos un producto"),
});

type BulkFormData = z.infer<typeof bulkFormSchema>;

interface BulkAddProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREDEFINED_CATEGORIES = [
  "Electrónicos",
  "Herramientas",
  "Material",
  "Oficina",
  "Limpieza",
  "Seguridad",
  "Repuestos",
  "Consumibles"
];

export default function BulkAddProductsModal({ open, onOpenChange }: BulkAddProductsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const form = useForm<BulkFormData>({
    resolver: zodResolver(bulkFormSchema),
    defaultValues: {
      products: [
        {
          name: "",
          sku: "",
          description: "",
          category: "",
          currentStock: 0,
          minStock: 0,
          unitPrice: 0,
          warehouseZoneId: "",
          leadTimeDays: 7,
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (products: InsertProduct[]) => {
      const results = [];
      for (const product of products) {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(product),
        });
        if (!response.ok) {
          throw new Error(`Error creating product: ${response.statusText}`);
        }
        const result = await response.json();
        results.push(result);
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Productos creados exitosamente",
        description: `Se crearon ${data.length} productos correctamente`,
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al crear los productos",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkFormData) => {
    const productsData: InsertProduct[] = data.products.map((product, index) => ({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      category: product.category === "sin-categoria" ? "sin categoría" : (product.category || "sin categoría"),
      currentStock: product.currentStock,
      minStock: product.minStock,
      unitPrice: product.unitPrice.toString(),
      warehouseZoneId: parseInt(product.warehouseZoneId),
      leadTimeDays: product.leadTimeDays,
    }));

    bulkCreateMutation.mutate(productsData);
  };

  const addNewProduct = () => {
    append({
      name: "",
      sku: "",
      description: "",
      category: "",
      currentStock: 0,
      minStock: 0,
      unitPrice: 0,
      warehouseZoneId: "",
      leadTimeDays: 7,
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Agregar Múltiples Productos
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Producto {index + 1}</CardTitle>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`products.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Producto</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Laptop Dell" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`products.${index}.sku`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: LAP-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`products.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descripción del producto..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`products.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <FormControl>
                              <SelectWithCustom
                                options={[
                                  { value: "sin-categoria", label: "Sin categoría" },
                                  ...PREDEFINED_CATEGORIES.map(c => ({ value: c, label: c })),
                                ]}
                                value={field.value ?? ""}
                                onValueChange={field.onChange}
                                placeholder="Seleccionar categoría"
                                customPlaceholder="Ej: Productos artesanales"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`products.${index}.warehouseZoneId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zona de Almacén</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`products.${index}.currentStock`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Actual</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
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
                        name={`products.${index}.minStock`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Mínimo</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
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
                        name={`products.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio Unitario</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`products.${index}.leadTimeDays`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Días de Entrega</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={addNewProduct}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Otro Producto
              </Button>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={bulkCreateMutation.isPending}>
                {bulkCreateMutation.isPending ? "Creando..." : `Crear ${fields.length} Productos`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}