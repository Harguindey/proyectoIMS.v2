import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Clock, Package, Truck, CheckCircle, User, Phone, Mail, MapPin, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from "@/hooks/use-toast";
import type { CustomerOrder, Customer, Product, OrderItem, WarehouseZone } from "@shared/schema";

interface OrderDetailModalProps {
  order: CustomerOrder;
  customers: Customer[];
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (orderId: number, status: string) => void;
}

export default function OrderDetailModal({ 
  order, 
  customers, 
  products, 
  open, 
  onOpenChange,
  onStatusUpdate 
}: OrderDetailModalProps) {
  
  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ["/api/order-items/by-order", order.id],
    queryFn: () => fetch(`/api/order-items/by-order/${order.id}`).then(res => res.json()),
    enabled: !!order.id,
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
    queryFn: () => fetch("/api/warehouse-zones").then(res => res.json()),
  });

  const customer = customers.find(c => c.id === order.customerId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'preparing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'preparing': return 'Preparando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const generatePreparationSheet = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const currentDate = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });
      
      // Header simple
      doc.setFontSize(18);
      doc.text('HOJA DE PREPARACIÓN', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('SportMax Pro', pageWidth / 2, 30, { align: 'center' });
      
      // Línea separadora
      doc.line(20, 35, pageWidth - 20, 35);
      
      // Información básica del pedido
      doc.setFontSize(11);
      doc.text('Pedido: ' + (order.orderNumber || 'N/A'), 20, 50);
      doc.text('Fecha: ' + currentDate, pageWidth - 60, 50);
      
      // Información del cliente
      doc.setFontSize(12);
      doc.text('CLIENTE:', 20, 65);
      doc.setFontSize(10);
      if (customer) {
        doc.text(customer.name || 'N/A', 20, 75);
        doc.text(customer.address || 'Dirección no disponible', 20, 82);
        doc.text('Tel: ' + (customer.phone || 'N/A'), 20, 89);
      }
      
      // Información de envío
      doc.setFontSize(12);
      doc.text('ENVÍO:', 20, 105);
      doc.setFontSize(10);
      doc.text('Agencia: Correos Express', 20, 115);
      doc.text('Recogida: ' + format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'dd/MM/yyyy', { locale: es }), 20, 122);
      
      // Tabla de productos simplificada
      doc.setFontSize(12);
      doc.text('MATERIAL A PREPARAR:', 20, 140);
      
      // Encabezados de tabla
      doc.setFontSize(10);
      doc.text('CANTIDAD', 20, 155);
      doc.text('PRODUCTO', 50, 155);
      doc.text('ZONA', 140, 155);
      doc.text('✓', 170, 155);
      
      // Línea debajo de encabezados
      doc.line(20, 158, pageWidth - 20, 158);
      
      // Productos
      let yPos = 170;
      orderItems.forEach((item, index) => {
        const product = products.find(p => p.id === item.productId);
        const zone = zones.find(z => z.id === product?.warehouseZoneId);
        
        doc.setFontSize(9);
        doc.text(item.quantity.toString(), 25, yPos);
        doc.text((product?.name || 'Producto').substring(0, 40), 50, yPos);
        doc.text(zone?.name || 'N/A', 140, yPos);
        
        // Checkbox para marcar
        doc.rect(170, yPos - 3, 4, 4);
        
        yPos += 12;
      });
      
      // Línea final
      doc.line(20, yPos, pageWidth - 20, yPos);
      
      // Espacio para firmas
      yPos += 30;
      doc.setFontSize(10);
      doc.text('Preparado por: _________________________', 20, yPos);
      doc.text('Fecha: ___________', 20, yPos + 15);
      
      // Save
      const fileName = `Preparacion_${order.orderNumber || 'ORDEN'}_${format(new Date(), 'ddMMyyyy')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Hoja de preparación generada",
        description: `Archivo ${fileName} descargado exitosamente.`,
      });
      
      console.log('PDF generado exitosamente');
      
    } catch (error) {
      console.error('Error generando hoja de preparación:', error);
      toast({
        title: "Error al generar PDF",
        description: "Hubo un problema al generar la hoja de preparación. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return { 
          text: 'Preparar Pedido', 
          action: () => {
            // Generar hoja de preparación automáticamente
            generatePreparationSheet();
            onStatusUpdate(order.id, 'preparing');
            onOpenChange(false);
          }
        };
      case 'preparing':
        return { 
          text: 'Marcar como Enviado', 
          action: () => {
            // Generar hoja de preparación para el envío
            generatePreparationSheet();
            onStatusUpdate(order.id, 'shipped');
            onOpenChange(false);
          }
        };
      case 'shipped':
        return { 
          text: 'Marcar como Entregado', 
          action: () => {
            onStatusUpdate(order.id, 'delivered');
            onOpenChange(false);
          }
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <DialogTitle className="text-lg sm:text-xl">Pedido {order.orderNumber}</DialogTitle>
            <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
              {getStatusIcon(order.status)}
              {getStatusText(order.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base sm:text-lg">{customer.name}</h3>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="break-all">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        {customer.phone}
                      </div>
                    )}
                  </div>
                  {customer.address && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">Dirección de Entrega</span>
                      </div>
                      <p className="text-sm bg-muted p-3 rounded">{customer.address}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Cliente no encontrado</p>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Pedido</label>
                  <p className="text-sm">
                    {order.orderDate ? format(new Date(order.orderDate), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es }) : '-'}
                  </p>
                </div>
                {order.shippedDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Envío</label>
                    <p className="text-sm">
                      {format(new Date(order.shippedDate), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                )}
                {order.deliveredDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Entrega</label>
                    <p className="text-sm">
                      {format(new Date(order.deliveredDate), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                )}
              </div>

              {order.notes && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium text-muted-foreground">Notas del Pedido</label>
                    </div>
                    <p className="text-sm bg-muted p-3 rounded">{order.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Productos del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile view */}
              <div className="block sm:hidden space-y-3">
                {orderItems.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="font-medium text-sm">
                        {product?.name || 'Producto no encontrado'}
                      </div>
                      <div className="text-xs text-slate-500">
                        SKU: {product?.sku || '-'}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Cantidad: {item.quantity}</span>
                        <span>€{item.unitPrice ? Number(item.unitPrice).toFixed(2) : '0.00'}/ud</span>
                      </div>
                      <div className="text-right font-medium text-sm">
                        Total: €{item.totalPrice ? Number(item.totalPrice).toFixed(2) : '0.00'}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Desktop view */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {product?.name || 'Producto no encontrado'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product?.sku || '-'}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            €{item.unitPrice ? Number(item.unitPrice).toFixed(2) : '0.00'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            €{item.totalPrice ? Number(item.totalPrice).toFixed(2) : '0.00'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Separator className="my-4" />
              
              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <div className="text-lg font-bold">
                    Total: €{order.totalAmount ? Number(order.totalAmount).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cerrar
              </Button>
              <Button 
                variant="outline" 
                onClick={generatePreparationSheet}
                className="w-full sm:w-auto flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar Hoja de Preparación
              </Button>
            </div>
            
            {nextAction && (
              <Button onClick={nextAction.action} className="w-full sm:w-auto">
                {nextAction.text}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}