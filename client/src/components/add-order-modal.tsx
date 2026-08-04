import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { Customer, Product, InsertCustomerOrder, InsertOrderItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const orderSchema = z.object({
  customerId: z.number().min(1, "Selecciona un cliente"),
  orderNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof orderSchema>;

interface AddOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  products: Product[];
}

export default function AddOrderModal({ open, onOpenChange, customers, products }: AddOrderModalProps) {
  const [items, setItems] = useState([{ productId: null as number | null, quantity: 1, unitPrice: 0 }]);
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: 0,
      orderNumber: "",
      notes: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("Creating order with data:", data);
        
        // Calculate total amount
        const totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
        
        const orderData: InsertCustomerOrder = {
          customerId: data.customerId,
          notes: data.notes || null,
          totalAmount: totalAmount.toString(),
          status: "pending",
          orderNumber: data.orderNumber,
        };

        console.log("Creating order with payload:", orderData);
        const response = await apiRequest("POST", "/api/customer-orders", orderData);
        const order = await response.json();
        console.log("Order created:", order);

        // Create order items
        for (const item of data.items) {
          const itemData: InsertOrderItem = {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            totalPrice: (item.quantity * item.unitPrice).toString(),
          };
          console.log("Creating order item:", itemData);
          await apiRequest("POST", "/api/order-items", itemData);
        }

        return order;
      } catch (error) {
        console.error("Error creating order:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });
      onOpenChange(false);
      form.reset();
      setItems([{ productId: null, quantity: 1, unitPrice: 0 }]);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      alert(`Error al crear el pedido: ${error.message || 'Error desconocido'}`);
    },
  });

  const addItem = () => {
    setItems([...items, { productId: null, quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof typeof items[0], value: number | null) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    console.log("Updated items:", newItems);
    setItems(newItems);
  };

  const getProductPrice = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.unitPrice ? Number(product.unitPrice) : 0;
  };



  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Pedido</DialogTitle>
          <DialogDescription>
            Completa los datos del pedido y selecciona los productos que desea el cliente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
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
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Orden (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ej: ORD-2025-001 (se genera automáticamente si se deja vacío)"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Instrucciones especiales, observaciones..."
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Productos del Pedido</CardTitle>
                <Button 
                  type="button" 
                  onClick={addItem}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => {
                  console.log(`Item ${index}:`, item);
                  return (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
                    <div className="col-span-4">
                      <label className="text-sm font-medium">Producto</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={item.productId || ""}
                        onChange={(e) => {
                          console.log("Select changed:", e.target.value);
                          if (e.target.value) {
                            const productId = parseInt(e.target.value);
                            const price = getProductPrice(productId);
                            console.log("Updating productId:", productId, "price:", price);
                            
                            // Update both values at once to avoid race condition
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], productId: productId, unitPrice: price };
                            setItems(newItems);
                          } else {
                            // Clear selection
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], productId: null, unitPrice: 0 };
                            setItems(newItems);
                          }
                        }}
                      >
                        <option value="">Selecciona producto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (Stock: {product.currentStock})
                          </option>
                        ))}
                      </select>
                      {item.productId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Seleccionado: {products.find(p => p.id === item.productId)?.name || 'Producto no encontrado'}
                        </div>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-medium">Cantidad</label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-medium">Precio Unit.</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="text-sm font-medium">Total</label>
                      <div className="text-lg font-semibold">
                        €{(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>

                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  )
                })}

                <div className="flex justify-end pt-4 border-t">
                  <div className="text-xl font-bold">
                    Total del Pedido: €{calculateTotal().toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={createOrderMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={async () => {
                  const formData = form.getValues();
                  
                  // Filter out items with null productId and validate
                  const validItems = items.filter(item => item.productId !== null && item.productId > 0 && item.quantity > 0);
                  
                  if (validItems.length === 0) {
                    alert("Por favor, agrega al menos un producto válido con cantidad mayor a 0");
                    return;
                  }
                  
                  if (!formData.customerId || formData.customerId === 0) {
                    alert("Por favor, selecciona un cliente");
                    return;
                  }

                  const orderPayload = {
                    ...formData,
                    items: validItems.map(item => ({
                      productId: item.productId!,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice
                    }))
                  };
                  
                  createOrderMutation.mutate(orderPayload);
                }}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Crear Pedido
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}