import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, CreditCard, Banknote, Trash2, Plus, Minus, Search, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiRequestJson, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export default function POSPage() {
  const { toast } = useToast();
  const [searchCode, setSearchCode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Spain",
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const hasDropshippingItems = () => {
    return cart.some(item => item.product.isDropshipping);
  };

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      return await apiRequest("POST", "/api/sales", saleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      
      toast({
        title: "Venta completada",
        description: "La venta se registró correctamente",
      });
      
      setCart([]);
      setPaymentMethod("cash");
      setCashReceived("");
      setSearchCode("");
      setShippingAddress({
        fullName: "",
        phone: "",
        email: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Spain",
      });
      
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "No se pudo completar la venta",
        variant: "destructive",
      });
    },
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * parseFloat(product.unitPrice || "0") }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        subtotal: parseFloat(product.unitPrice || "0")
      }]);
    }
    
    setSearchCode("");
    searchInputRef.current?.focus();
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.product.id === productId
        ? { 
            ...item, 
            quantity: newQuantity, 
            subtotal: newQuantity * parseFloat(item.product.unitPrice || "0") 
          }
        : item
    ));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchCode.trim()) {
      const trimmedCode = searchCode.trim().toUpperCase();
      const foundProduct = products.find(
        p => p.sku.toUpperCase() === trimmedCode || p.id.toString() === trimmedCode
      );
      
      if (foundProduct) {
        addToCart(foundProduct);
      } else {
        toast({
          title: "Producto no encontrado",
          description: `No existe producto con código "${searchCode}"`,
          variant: "destructive",
        });
      }
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateChange = () => {
    if (paymentMethod !== "cash") return 0;
    const received = parseFloat(cashReceived) || 0;
    const total = calculateTotal();
    return Math.max(0, received - total);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "El carrito está vacío",
        variant: "destructive",
      });
      return;
    }

    const total = calculateTotal();

    if (paymentMethod === "cash") {
      const received = parseFloat(cashReceived) || 0;
      if (received < total) {
        toast({
          title: "Error",
          description: "El efectivo recibido es insuficiente",
          variant: "destructive",
        });
        return;
      }
    }

    if (hasDropshippingItems()) {
      if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.email ||
          !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode) {
        toast({
          title: "Error",
          description: "Completa la información de envío para productos dropshipping",
          variant: "destructive",
        });
        return;
      }
    }

    let shippingAddressId = null;
    
    if (hasDropshippingItems()) {
      try {
        const addressResponse = await apiRequestJson("POST", "/api/customer-addresses", shippingAddress);
        shippingAddressId = addressResponse.id;
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "No se pudo crear la dirección de envío",
          variant: "destructive",
        });
        return;
      }
    }

    const saleData = {
      sale: {
        total: total.toFixed(2),
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? parseFloat(cashReceived).toFixed(2) : null,
        cashChange: paymentMethod === "cash" ? calculateChange().toFixed(2) : null,
        shippingAddressId: shippingAddressId,
        customerName: hasDropshippingItems() ? shippingAddress.fullName : null,
        customerEmail: hasDropshippingItems() ? shippingAddress.email : null,
        customerPhone: hasDropshippingItems() ? shippingAddress.phone : null,
      },
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.product.unitPrice,
        subtotal: item.subtotal.toFixed(2),
      }))
    };

    createSaleMutation.mutate(saleData);
  };

  const total = calculateTotal();
  const change = calculateChange();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
          <ShoppingCart className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Punto de Venta (TPV)</h1>
          <p className="text-muted-foreground">Registro de ventas en mostrador</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel de búsqueda y productos */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Producto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="search">Código o SKU</Label>
                <Input
                  id="search"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escanea o escribe el código..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                  autoComplete="off"
                  className="text-lg font-mono"
                  data-testid="input-search-product"
                />
                <p className="text-xs text-muted-foreground">
                  Presiona Enter para agregar al carrito
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Carrito */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito ({cart.length} {cart.length === 1 ? 'producto' : 'productos'})
                </span>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCart([])}
                    data-testid="button-clear-cart"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Vaciar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>El carrito está vacío</p>
                  <p className="text-sm mt-1">Escanea productos para agregar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                      data-testid={`cart-item-${index}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.product.name}</p>
                          {item.product.isDropshipping && (
                            <Badge 
                              variant="secondary" 
                              className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                              data-testid={`badge-dropshipping-${item.product.id}`}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              DROPSHIPPING
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.product.sku} • ${parseFloat(item.product.unitPrice || "0").toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          data-testid={`button-decrease-${index}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          data-testid={`button-increase-${index}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-right min-w-[80px]">
                        <p className="font-semibold">${item.subtotal.toFixed(2)}</p>
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                        data-testid={`button-remove-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario de dirección de envío */}
          {hasDropshippingItems() && (
            <Card data-testid="form-shipping-address">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Información de Envío
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="fullName">Nombre Completo *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Juan Pérez"
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                      data-testid="input-customer-fullname"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+52 123 456 7890"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      data-testid="input-customer-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={shippingAddress.email}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                      data-testid="input-customer-email"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressLine1">Dirección Línea 1 *</Label>
                    <Input
                      id="addressLine1"
                      type="text"
                      placeholder="Calle Principal 123"
                      value={shippingAddress.addressLine1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })}
                      data-testid="input-address-line1"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressLine2">Dirección Línea 2</Label>
                    <Input
                      id="addressLine2"
                      type="text"
                      placeholder="Piso, departamento, etc. (opcional)"
                      value={shippingAddress.addressLine2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="Ciudad de México"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      data-testid="input-city"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado/Provincia</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="CDMX"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Código Postal *</Label>
                    <Input
                      id="postalCode"
                      type="text"
                      placeholder="01000"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      data-testid="input-postal-code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      type="text"
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4">
                  * Campos requeridos para productos dropshipping
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel de pago */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${total.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">${total.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="payment-method">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method" data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        <span>Efectivo</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Tarjeta</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="transfer">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Transferencia</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <Label htmlFor="cash-received">Efectivo Recibido</Label>
                  <Input
                    id="cash-received"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="text-lg"
                    data-testid="input-cash-received"
                  />
                  
                  {cashReceived && parseFloat(cashReceived) >= total && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-900 dark:text-green-100">Cambio:</span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          ${change.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0 || createSaleMutation.isPending}
                onClick={handleCompleteSale}
                data-testid="button-complete-sale"
              >
                {createSaleMutation.isPending ? "Procesando..." : "Completar Venta"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
