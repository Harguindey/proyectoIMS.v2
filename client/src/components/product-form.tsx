import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { insertProductSchema } from "@shared/schema";
import type { WarehouseZone, Product, InsertProduct, Supplier } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";
import { Package } from "lucide-react";

const formSchema = insertProductSchema.extend({
  unitPrice: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: InsertProduct) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitText?: string;
}

export default function ProductForm({ 
  product, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  submitText = "Guardar Producto"
}: ProductFormProps) {

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      description: product?.description || "",
      category: product?.category || "",
      currentStock: product?.currentStock || 0,
      minStock: product?.minStock || 10,
      unitPrice: product?.unitPrice?.toString() || "0",
      warehouseZoneId: product?.warehouseZoneId || undefined,
      isDropshipping: product?.isDropshipping || false,
      dropshippingSupplierId: product?.dropshippingSupplierId || undefined,
      dropshippingLeadTimeDays: product?.dropshippingLeadTimeDays || 30,
    },
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const isDropshipping = form.watch("isDropshipping");

  const handleSubmit = (data: FormData) => {
    const productData: InsertProduct = {
      ...data,
      unitPrice: data.unitPrice,
    };
    onSubmit(productData);
  };

  const categories = [
    { value: "electronics", label: "Electrónicos" },
    { value: "accessories", label: "Accesorios" },
    { value: "components", label: "Componentes" },
    { value: "office", label: "Oficina" },
    { value: "tools", label: "Herramientas" },
    { value: "furniture", label: "Mobiliario" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Laptop Dell XPS 13" {...field} />
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
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: LAP-DEL-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <SelectWithCustom
                    options={categories}
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
            name="warehouseZoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : parseInt(value))} 
                  value={field.value?.toString() || "unassigned"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
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
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descripción detallada del producto..."
                  className="h-24"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="currentStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Actual</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
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
            name="minStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Mínimo</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="10" 
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
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio Unitario</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Sección Dropshipping */}
        <div className="border-t pt-4 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Configuración de Dropshipping</h3>
          </div>

          <FormField
            control={form.control}
            name="isDropshipping"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-is-dropshipping"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Es producto dropshipping
                  </FormLabel>
                  <FormDescription>
                    Los productos dropshipping se envían directamente del proveedor al cliente sin pasar por tu inventario
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {isDropshipping && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
              <FormField
                control={form.control}
                name="dropshippingSupplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor de Dropshipping *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-dropshipping-supplier">
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name} ({supplier.leadTimeDays} días)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Proveedor que enviará directamente al cliente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dropshippingLeadTimeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de Entrega desde China</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30" 
                        min="1"
                        {...field}
                        value={field.value ?? 30}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                        data-testid="input-dropshipping-lead-time"
                      />
                    </FormControl>
                    <FormDescription>
                      Tiempo estimado de envío desde el proveedor en China
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Guardando..." : submitText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
