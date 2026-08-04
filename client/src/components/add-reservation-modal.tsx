import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductReservationSchema, type Customer, type Product, type InsertProductReservation } from "@shared/schema";
import { addDays, format } from "date-fns";

const formSchema = z.object({
  customerId: z.number().min(1, "Debes seleccionar un cliente"),
  productId: z.number().min(1, "Debes seleccionar un producto"),
  quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
  expirationDays: z.number().min(1).max(30),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  products: Product[];
}

export default function AddReservationModal({ open, onOpenChange, customers, products }: AddReservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openProductCombobox, setOpenProductCombobox] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: customers.length > 0 ? customers[0].id : 0,
      productId: products.length > 0 ? products[0].id : 0,
      quantity: 1,
      expirationDays: 7,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProductReservation) => {
      return apiRequest("POST", "/api/reservations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({
        title: "Reserva creada",
        description: "La reserva de producto se ha creado exitosamente.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la reserva.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("✅ Formulario enviado con datos:", data);
    console.log("❌ Errores del formulario:", form.formState.errors);
    
    // Validar que se hayan seleccionado cliente y producto
    if (!data.customerId || data.customerId === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.productId || data.productId === 0) {
      toast({
        title: "Error", 
        description: "Debes seleccionar un producto",
        variant: "destructive",
      });
      return;
    }
    
    const expirationDate = addDays(new Date(), data.expirationDays);
    
    const reservationData: InsertProductReservation = {
      customerId: data.customerId,
      productId: data.productId,
      quantity: data.quantity,
      expirationDate,
      notes: data.notes || undefined,
    };
    
    console.log("📤 Datos de reserva a enviar:", reservationData);
    createMutation.mutate(reservationData);
  };

  const selectedProduct = products.find(p => p.id === form.watch("productId"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Reserva de Producto</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
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
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto</FormLabel>
                    <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openProductCombobox}
                            className="w-full justify-between"
                          >
                            {field.value
                              ? products.find((product) => product.id === field.value)?.name
                              : "Buscar producto..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Escribir nombre del producto..." />
                          <CommandList>
                            <CommandEmpty>No se encontraron productos.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.sku}`}
                                  onSelect={() => {
                                    field.onChange(product.id);
                                    setOpenProductCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      field.value === product.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{product.name}</span>
                                    <span className="text-sm text-gray-500">
                                      {product.sku} - €{product.unitPrice} - Stock: {product.currentStock}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedProduct && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Información del Producto</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>SKU:</strong> {selectedProduct.sku}</p>
                  <p><strong>Stock actual:</strong> {selectedProduct.currentStock} unidades</p>
                  <p><strong>Precio:</strong> €{selectedProduct.unitPrice}</p>
                  <p><strong>Categoría:</strong> {selectedProduct.category}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad a Reservar</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expirationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días hasta Expiración</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Fecha de expiración:</strong> {format(addDays(new Date(), form.watch("expirationDays")), "dd/MM/yyyy")}
              </p>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Añadir notas sobre la reserva..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creando..." : "Crear Reserva"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}