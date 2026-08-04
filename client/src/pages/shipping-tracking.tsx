import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search,
  ExternalLink,
  RefreshCw,
  Calendar,
  Phone,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ShippingInfo {
  id: number;
  orderId: number;
  order: {
    orderNumber: string;
    customer: {
      name: string;
    };
  };
  shippingAgency: {
    name: string;
    code: string;
    website: string;
    trackingUrlTemplate: string;
  };
  trackingNumber: string;
  status: string;
  shippingCost: number;
  estimatedWeight: number;
  recipientName: string;
  recipientPhone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
  events: ShippingEvent[];
}

interface ShippingEvent {
  id: number;
  eventType: string;
  eventDescription: string;
  eventLocation: string;
  eventDate: string;
  isPublic: boolean;
  createdAt: string;
}

export default function ShippingTrackingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedShipment, setSelectedShipment] = useState<ShippingInfo | null>(null);

  const { data: shipments = [], isLoading, refetch } = useQuery<ShippingInfo[]>({
    queryKey: ["/api/order-shipping"],
  });

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.recipientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { 
          label: "Pendiente", 
          color: "bg-yellow-500", 
          icon: Clock, 
          progress: 10,
          variant: "secondary" as const 
        };
      case "processing":
        return { 
          label: "Procesando", 
          color: "bg-blue-500", 
          icon: Package, 
          progress: 25,
          variant: "default" as const 
        };
      case "shipped":
        return { 
          label: "Enviado", 
          color: "bg-orange-500", 
          icon: Truck, 
          progress: 60,
          variant: "outline" as const 
        };
      case "in_transit":
        return { 
          label: "En Tránsito", 
          color: "bg-indigo-500", 
          icon: MapPin, 
          progress: 75,
          variant: "outline" as const 
        };
      case "delivered":
        return { 
          label: "Entregado", 
          color: "bg-green-500", 
          icon: CheckCircle, 
          progress: 100,
          variant: "default" as const 
        };
      case "failed":
        return { 
          label: "Fallido", 
          color: "bg-red-500", 
          icon: AlertCircle, 
          progress: 0,
          variant: "destructive" as const 
        };
      default:
        return { 
          label: "Desconocido", 
          color: "bg-gray-500", 
          icon: AlertCircle, 
          progress: 0,
          variant: "secondary" as const 
        };
    }
  };

  const openTrackingUrl = (shipment: ShippingInfo) => {
    if (shipment.trackingNumber && shipment.shippingAgency.trackingUrlTemplate) {
      const url = shipment.shippingAgency.trackingUrlTemplate.replace(
        '{trackingNumber}', 
        shipment.trackingNumber
      );
      window.open(url, '_blank');
    }
  };

  const getEventTypeInfo = (eventType: string) => {
    switch (eventType) {
      case "created":
        return { label: "Creado", color: "bg-blue-500", icon: Package };
      case "picked_up":
        return { label: "Recogido", color: "bg-yellow-500", icon: Truck };
      case "in_transit":
        return { label: "En Tránsito", color: "bg-indigo-500", icon: MapPin };
      case "out_for_delivery":
        return { label: "Reparto", color: "bg-orange-500", icon: Truck };
      case "delivered":
        return { label: "Entregado", color: "bg-green-500", icon: CheckCircle };
      case "failed_delivery":
        return { label: "Error Entrega", color: "bg-red-500", icon: AlertCircle };
      case "returned":
        return { label: "Devuelto", color: "bg-gray-500", icon: Package };
      default:
        return { label: "Evento", color: "bg-gray-400", icon: Clock };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seguimiento de Envíos</h1>
          <p className="text-muted-foreground">
            Rastrea y gestiona todos los envíos de pedidos
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de tracking, pedido, cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="processing">Procesando</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="in_transit">En Tránsito</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Envíos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Envíos Activos ({filteredShipments.length})
            </CardTitle>
            <CardDescription>
              Lista de todos los envíos con su estado actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredShipments.length > 0 ? (
                filteredShipments.map((shipment) => {
                  const statusInfo = getStatusInfo(shipment.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div
                      key={shipment.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:border-blue-300 ${
                        selectedShipment?.id === shipment.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedShipment(shipment)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <span className="font-medium">
                            {shipment.order.orderNumber}
                          </span>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {shipment.shippingAgency.name}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cliente:</span>
                          <span>{shipment.order.customer.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Destinatario:</span>
                          <span>{shipment.recipientName}</span>
                        </div>
                        {shipment.trackingNumber && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tracking:</span>
                            <span className="font-mono text-xs">
                              {shipment.trackingNumber}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Costo:</span>
                          <span>€{shipment.shippingCost.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progreso</span>
                          <span>{statusInfo.progress}%</span>
                        </div>
                        <Progress value={statusInfo.progress} className="h-2" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Cargando envíos..." : "No se encontraron envíos"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detalles del Envío Seleccionado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalles del Envío
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedShipment ? (
              <div className="space-y-6">
                {/* Información General */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Información General
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pedido:</span>
                      <p className="font-medium">{selectedShipment.order.orderNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <p>
                        <Badge variant={getStatusInfo(selectedShipment.status).variant}>
                          {getStatusInfo(selectedShipment.status).label}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agencia:</span>
                      <p className="font-medium">{selectedShipment.shippingAgency.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Peso:</span>
                      <p>{selectedShipment.estimatedWeight} kg</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Información de Contacto */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Destinatario
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground min-w-20">Nombre:</span>
                      <span className="font-medium">{selectedShipment.recipientName}</span>
                    </div>
                    {selectedShipment.recipientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{selectedShipment.recipientPhone}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                      <div>
                        <p>{selectedShipment.shippingAddress}</p>
                        <p>{selectedShipment.shippingCity}, {selectedShipment.shippingPostalCode}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tracking */}
                {selectedShipment.trackingNumber && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Seguimiento
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-mono text-sm">{selectedShipment.trackingNumber}</p>
                            <p className="text-xs text-muted-foreground">Número de seguimiento</p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => openTrackingUrl(selectedShipment)}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Rastrear
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Historial de Eventos */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Historial de Eventos
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedShipment.events && selectedShipment.events.length > 0 ? (
                      selectedShipment.events
                        .filter(event => event.isPublic)
                        .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
                        .map((event, index) => {
                          const eventInfo = getEventTypeInfo(event.eventType);
                          const EventIcon = eventInfo.icon;
                          
                          return (
                            <div key={event.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full ${eventInfo.color} flex items-center justify-center`}>
                                  <EventIcon className="h-4 w-4 text-white" />
                                </div>
                                {index < selectedShipment.events.length - 1 && (
                                  <div className="w-0.5 h-8 bg-gray-200 mt-1"></div>
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{eventInfo.label}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {format(new Date(event.eventDate), "dd MMM, HH:mm", { locale: es })}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {event.eventDescription}
                                </p>
                                {event.eventLocation && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.eventLocation}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No hay eventos de seguimiento disponibles
                      </div>
                    )}
                  </div>
                </div>

                {/* Fechas */}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha de envío:
                    </span>
                    <p>{format(new Date(selectedShipment.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}</p>
                  </div>
                  {selectedShipment.estimatedDeliveryDate && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Entrega estimada:
                      </span>
                      <p>{format(new Date(selectedShipment.estimatedDeliveryDate), "dd MMM yyyy", { locale: es })}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona un envío para ver sus detalles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}