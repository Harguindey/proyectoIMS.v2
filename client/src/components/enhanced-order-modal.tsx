import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiRequestJson } from "@/lib/queryClient";
import { Truck, Package, Calculator, MapPin, Clock, Shield, AlertCircle } from "lucide-react";
import type { Customer, Product, ShippingAgency } from "@shared/schema";

const orderFormSchema = z.object({
  customerId: z.string().transform(Number),
  orderNumber: z.string().min(1, "Número de pedido requerido"),
  totalAmount: z.string().transform(Number),
  notes: z.string().optional(),
  
  // Datos de envío
  recipientName: z.string().min(1, "Nombre del destinatario requerido"),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email("Email inválido").optional(),
  shippingAddress: z.string().min(1, "Dirección de envío requerida"),
  shippingCity: z.string().min(1, "Ciudad requerida"),
  shippingPostalCode: z.string().min(1, "Código postal requerido"),
  shippingCountry: z.string().default("España"),
  shippingZone: z.string().min(1, "Zona de envío requerida"),
  
  // Información del paquete
  estimatedWeight: z.string().transform(Number),
  packageDimensions: z.string().optional(),
  isFragile: z.boolean().default(false),
  requiresSignature: z.boolean().default(false),
  insuranceValue: z.string().transform(Number).optional(),
  specialInstructions: z.string().optional(),
  
  // Agencia seleccionada
  selectedShippingOption: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface EnhancedOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ShippingOption {
  agency: any;
  rate: any;
  totalCost: string;
  deliveryTime: string;
}

export function EnhancedOrderModal({ isOpen, onClose, onSuccess }: EnhancedOrderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      shippingCountry: "España",
      shippingZone: "Península",
      estimatedWeight: 1,
      isFragile: false,
      requiresSignature: false,
    },
  });

  // Consultas de datos
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: shippingAgencies = [] } = useQuery<ShippingAgency[]>({
    queryKey: ["/api/shipping-agencies/active"],
  });

  // Mutación para crear pedido
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // Crear el pedido principal
      const orderResponse = await apiRequestJson("POST", "/api/customer-orders", {
        customerId: data.customerId,
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
        notes: data.notes,
      });

      // Crear items del pedido
      for (const item of orderItems) {
        await apiRequest("POST", "/api/order-items", {
          orderId: orderResponse.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }

      // Crear información de envío si hay una opción seleccionada
      if (selectedOption) {
        const shippingData = {
          orderId: orderResponse.id,
          shippingAgencyId: selectedOption.agency.id,
          shippingCost: parseFloat(selectedOption.totalCost),
          estimatedWeight: data.estimatedWeight,
          packageDimensions: data.packageDimensions,
          shippingZone: data.shippingZone,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          recipientEmail: data.recipientEmail,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingPostalCode: data.shippingPostalCode,
          shippingCountry: data.shippingCountry,
          specialInstructions: data.specialInstructions,
          requiresSignature: data.requiresSignature,
          isFragile: data.isFragile,
          insuranceValue: data.insuranceValue,
          status: "pending",
        };

        const shippingResponse = await apiRequestJson("POST", "/api/order-shipping", shippingData);

        // Generar número de tracking
        const trackingResponse = await apiRequestJson("POST", "/api/shipping/generate-tracking", {
          agencyCode: selectedOption.agency.code,
        });

        // Actualizar con número de tracking
        await apiRequest("PATCH", `/api/order-shipping/${shippingResponse.id}`, {
          trackingNumber: trackingResponse.trackingNumber,
        });

        // Crear evento inicial de tracking
        await apiRequest("POST", "/api/shipping-events", {
          orderShippingId: shippingResponse.id,
          eventType: "created",
          eventDescription: "Pedido creado y preparándose para envío",
          eventLocation: "Almacén SportMax Pro",
          eventDate: new Date(),
          isPublic: true,
        });
      }

      return orderResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-shipping"] });
      toast({
        title: "Pedido creado",
        description: "El pedido se ha creado correctamente con información logística completa.",
      });
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el pedido",
        variant: "destructive",
      });
    },
  });

  // Función para calcular costos de envío
  const calculateShipping = async () => {
    const weight = form.getValues("estimatedWeight");
    const zone = form.getValues("shippingZone");
    
    console.log("Calculating shipping with:", { weight, zone });
    
    if (!weight || !zone) {
      toast({
        title: "Datos incompletos",
        description: "Por favor, completa el peso y la zona de envío",
        variant: "destructive",
      });
      return;
    }

    setIsCalculatingShipping(true);
    try {
      console.log("Making API request to calculate shipping cost...");
      const options = await apiRequestJson("POST", "/api/shipping/calculate-cost", {
        weight,
        zoneName: zone,
      });
      
      console.log("Shipping options received:", options);
      
      if (Array.isArray(options) && options.length > 0) {
        setShippingOptions(options);
        setCurrentStep(3);
        toast({
          title: "Opciones de envío calculadas",
          description: `Se encontraron ${options.length} opciones de envío disponibles`,
        });
      } else {
        toast({
          title: "Sin opciones",
          description: "No se encontraron opciones de envío para los datos proporcionados",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error calculating shipping:", error);
      toast({
        title: "Error",
        description: error.message || "Error al calcular los costos de envío",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  // Agregar item al pedido
  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: null,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    }]);
  };

  // Actualizar item del pedido
  const updateOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calcular precio total automáticamente
    if (field === "quantity" || field === "unitPrice") {
      const quantity = field === "quantity" ? value : updatedItems[index].quantity;
      const unitPrice = field === "unitPrice" ? value : updatedItems[index].unitPrice;
      updatedItems[index].totalPrice = quantity * unitPrice;
    }
    
    setOrderItems(updatedItems);
    
    // Actualizar total del pedido
    const total = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    form.setValue("totalAmount", total.toString());
  };

  // Eliminar item del pedido
  const removeOrderItem = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
    
    // Recalcular total
    const total = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    form.setValue("totalAmount", total.toString());
  };

  const handleClose = () => {
    setCurrentStep(1);
    setOrderItems([]);
    setShippingOptions([]);
    setSelectedOption(null);
    form.reset();
    onClose();
  };

  const onSubmit = (data: OrderFormData) => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto al pedido",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (orderItems.length === 0) {
        toast({
          title: "Error",
          description: "Debe agregar al menos un producto al pedido",
          variant: "destructive",
        });
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Crear Pedido con Logística Avanzada
          </DialogTitle>
          <p id="dialog-description" className="sr-only">
            Modal para crear pedidos con información logística completa incluyendo productos, datos de envío y selección de transportista
          </p>
        </DialogHeader>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 ${step < currentStep ? "bg-blue-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Paso 1: Información del Pedido */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Información del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerId">Cliente</Label>
                      <Select onValueChange={(value) => form.setValue("customerId", Number(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="orderNumber">Número de Pedido</Label>
                      <Input
                        {...form.register("orderNumber")}
                        placeholder="PED-2025-001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas del Pedido</Label>
                    <Textarea
                      {...form.register("notes")}
                      placeholder="Notas adicionales del pedido..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Items del Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos del Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  {orderItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-4 items-end mb-4 p-4 border rounded">
                      <div>
                        <Label>Producto</Label>
                        <Select
                          onValueChange={(value) => {
                            const product = products.find((p: any) => p.id.toString() === value);
                            updateOrderItem(index, "productId", parseInt(value));
                            if (product) {
                              updateOrderItem(index, "unitPrice", parseFloat(product.unitPrice || "0"));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product: any) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - €{product.unitPrice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label>Precio Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label>Total</Label>
                        <Input
                          value={`€${item.totalPrice.toFixed(2)}`}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                  
                  <Button type="button" onClick={addOrderItem} variant="outline">
                    Agregar Producto
                  </Button>
                  
                  {orderItems.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded">
                      <p className="text-lg font-semibold">
                        Total del Pedido: €{orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="button" onClick={nextStep}>
                  Siguiente: Datos de Envío
                </Button>
              </div>
            </div>
          )}

          {/* Paso 2: Datos de Envío */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Información de Envío
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recipientName">Nombre del Destinatario</Label>
                      <Input {...form.register("recipientName")} />
                    </div>
                    
                    <div>
                      <Label htmlFor="recipientPhone">Teléfono</Label>
                      <Input {...form.register("recipientPhone")} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="recipientEmail">Email</Label>
                    <Input {...form.register("recipientEmail")} type="email" />
                  </div>

                  <div>
                    <Label htmlFor="shippingAddress">Dirección de Envío</Label>
                    <Input {...form.register("shippingAddress")} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="shippingCity">Ciudad</Label>
                      <Input {...form.register("shippingCity")} />
                    </div>
                    
                    <div>
                      <Label htmlFor="shippingPostalCode">Código Postal</Label>
                      <Input {...form.register("shippingPostalCode")} />
                    </div>
                    
                    <div>
                      <Label htmlFor="shippingZone">Zona de Envío</Label>
                      <Select onValueChange={(value) => form.setValue("shippingZone", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar zona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Península">Península</SelectItem>
                          <SelectItem value="Baleares">Islas Baleares</SelectItem>
                          <SelectItem value="Canarias">Islas Canarias</SelectItem>
                          <SelectItem value="Internacional">Internacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedWeight">Peso Estimado (kg)</Label>
                      <Input
                        {...form.register("estimatedWeight")}
                        type="number"
                        step="0.1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="packageDimensions">Dimensiones del Paquete</Label>
                      <Input
                        {...form.register("packageDimensions")}
                        placeholder="30x20x15 cm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={form.watch("isFragile")}
                        onCheckedChange={(checked) => form.setValue("isFragile", checked)}
                      />
                      <Label>Producto frágil</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={form.watch("requiresSignature")}
                        onCheckedChange={(checked) => form.setValue("requiresSignature", checked)}
                      />
                      <Label>Requiere firma al entregar</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="specialInstructions">Instrucciones Especiales</Label>
                    <Textarea
                      {...form.register("specialInstructions")}
                      placeholder="Instrucciones especiales para la entrega..."
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Anterior
                </Button>
                <Button
                  type="button"
                  onClick={calculateShipping}
                  disabled={isCalculatingShipping}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {isCalculatingShipping ? "Calculando..." : "Calcular Envío"}
                </Button>
              </div>
            </div>
          )}

          {/* Paso 3: Selección de Agencia */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Opciones de Envío
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingOptions.length > 0 ? (
                    <div className="space-y-4">
                      {shippingOptions.map((option, index) => (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedOption === option
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedOption(option)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                {selectedOption === option && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold">{option.agency.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {option.agency.website}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">€{option.totalCost}</p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {option.deliveryTime}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex gap-2">
                            <Badge variant="outline">
                              Zona: {option.rate.zoneName}
                            </Badge>
                            <Badge variant="outline">
                              Peso: {form.getValues("estimatedWeight")}kg
                            </Badge>
                            {form.getValues("isFragile") && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Frágil
                              </Badge>
                            )}
                            {form.getValues("requiresSignature") && (
                              <Badge variant="secondary">
                                <Shield className="h-3 w-3 mr-1" />
                                Firma requerida
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        No hay opciones de envío disponibles para los datos proporcionados.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Anterior
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!selectedOption}
                >
                  Siguiente: Resumen
                </Button>
              </div>
            </div>
          )}

          {/* Paso 4: Resumen y Confirmación */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Datos del Pedido</h4>
                      <p><strong>Cliente:</strong> {customers.find((c: any) => c.id.toString() === form.getValues("customerId"))?.name}</p>
                      <p><strong>Número:</strong> {form.getValues("orderNumber")}</p>
                      <p><strong>Total Productos:</strong> €{orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}</p>
                      {selectedOption && (
                        <p><strong>Costo Envío:</strong> €{selectedOption.totalCost}</p>
                      )}
                      <p className="text-lg font-bold">
                        <strong>Total Final:</strong> €{(
                          orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0) +
                          (selectedOption ? parseFloat(selectedOption.totalCost) : 0)
                        ).toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Datos de Envío</h4>
                      <p><strong>Destinatario:</strong> {form.getValues("recipientName")}</p>
                      <p><strong>Dirección:</strong> {form.getValues("shippingAddress")}</p>
                      <p><strong>Ciudad:</strong> {form.getValues("shippingCity")}, {form.getValues("shippingPostalCode")}</p>
                      {selectedOption && (
                        <>
                          <p><strong>Agencia:</strong> {selectedOption.agency.name}</p>
                          <p><strong>Tiempo de entrega:</strong> {selectedOption.deliveryTime}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Productos</h4>
                    {orderItems.map((item, index) => {
                      const product = products.find((p: any) => p.id === item.productId);
                      return (
                        <div key={index} className="flex justify-between items-center py-2">
                          <span>{product?.name || "Producto"} x{item.quantity}</span>
                          <span>€{item.totalPrice.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Anterior
                </Button>
                <Button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createOrderMutation.isPending ? "Creando..." : "Confirmar Pedido"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
