import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Package, User, Clock, Search, Plus, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ProductReservation, Customer, Product } from "@shared/schema";
import AddReservationModal from "@/components/add-reservation-modal";

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: reservations = [], isLoading } = useQuery<ProductReservation[]>({
    queryKey: ["/api/reservations"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/reservations/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      // If converting to order, also invalidate orders queries
      if (variables.status === "converted") {
        queryClient.invalidateQueries({ queryKey: ["/api/customer-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/order-items"] });
      }
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Activa", variant: "default" as const },
      expired: { label: "Expirada", variant: "destructive" as const },
      converted: { label: "Convertida", variant: "outline" as const },
      cancelled: { label: "Cancelada", variant: "secondary" as const },
    };
    return statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "default" as const };
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : "Cliente desconocido";
  };

  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : "Producto desconocido";
  };

  const filteredReservations = reservations.filter((reservation: ProductReservation) => {
    const matchesSearch = 
      getCustomerName(reservation.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProductName(reservation.productId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || reservation.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const handleStatusUpdate = (id: number, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const getExpirationStatus = (expirationDate: string | Date) => {
    const expiry = new Date(expirationDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: "Expirada", color: "text-red-600" };
    if (diffDays === 0) return { text: "Expira hoy", color: "text-orange-600" };
    if (diffDays <= 3) return { text: `Expira en ${diffDays} días`, color: "text-yellow-600" };
    return { text: `Expira en ${diffDays} días`, color: "text-green-600" };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reservas de Productos</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 bg-gray-100 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reservas de Productos</h1>
          <p className="text-muted-foreground">
            Gestiona las reservas de productos de los clientes
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Reserva
        </Button>
      </div>

      {/* Búsqueda y filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, producto o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pestañas de estado */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="expired">Expiradas</TabsTrigger>
          <TabsTrigger value="converted">Convertidas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay reservas
                </h3>
                <p className="text-gray-500">
                  {activeTab === "all" 
                    ? "No se encontraron reservas que coincidan con tu búsqueda."
                    : `No hay reservas ${getStatusBadge(activeTab).label.toLowerCase()}.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredReservations.map((reservation: ProductReservation) => {
                const statusBadge = getStatusBadge(reservation.status);
                const expirationStatus = getExpirationStatus(reservation.expirationDate);
                const createdDate = reservation.reservationDate || reservation.createdAt || new Date();
                
                return (
                  <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">
                                {getCustomerName(reservation.customerId)}
                              </span>
                            </div>
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-gray-600">
                              {getProductName(reservation.productId)}
                            </span>
                            <span className="text-sm text-gray-500">
                              • Cantidad: {reservation.quantity}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Creada: {format(new Date(createdDate), "dd/MM/yyyy", { locale: es })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span className={expirationStatus.color}>
                                {expirationStatus.text}
                              </span>
                            </div>
                          </div>

                          {reservation.notes && (
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {reservation.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          {reservation.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(reservation.id, "converted")}
                                disabled={updateStatusMutation.isPending}
                              >
                                Convertir a Pedido
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(reservation.id, "cancelled")}
                                disabled={updateStatusMutation.isPending}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                          {reservation.status === "expired" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(reservation.id, "active")}
                              disabled={updateStatusMutation.isPending}
                            >
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddReservationModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        customers={customers}
        products={products}
      />
    </div>
  );
}
