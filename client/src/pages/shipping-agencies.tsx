import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Truck, 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Mail, 
  Phone,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShippingAgency } from "@shared/schema";

interface AgencyFormData {
  name: string;
  code: string;
  website: string;
  contactPhone: string;
  contactEmail: string;
  apiEndpoint: string;
  trackingUrlTemplate: string;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  isActive: boolean;
}

const initialFormData: AgencyFormData = {
  name: "",
  code: "",
  website: "",
  contactPhone: "",
  contactEmail: "",
  apiEndpoint: "",
  trackingUrlTemplate: "",
  deliveryTimeMin: 1,
  deliveryTimeMax: 7,
  isActive: true
};

export default function ShippingAgenciesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<ShippingAgency | null>(null);
  const [formData, setFormData] = useState<AgencyFormData>(initialFormData);
  const [deleteAgency, setDeleteAgency] = useState<ShippingAgency | null>(null);

  const { data: agencies = [], isLoading } = useQuery<ShippingAgency[]>({
    queryKey: ["/api/shipping-agencies"],
  });

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingAgency(null);
      setFormData(initialFormData);
    }
  };

  const handleCloseDialog = () => {
    handleDialogChange(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data: AgencyFormData) => {
      return await apiRequest("POST", "/api/shipping-agencies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-agencies"] });
      handleDialogChange(false);
      toast({
        title: "Transportista creado",
        description: "El transportista se ha creado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el transportista",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AgencyFormData }) => {
      return await apiRequest("PUT", `/api/shipping-agencies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-agencies"] });
      handleDialogChange(false);
      toast({
        title: "Transportista actualizado",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el transportista",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/shipping-agencies/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-agencies"] });
      toast({
        title: "Estado actualizado",
        description: "El estado del transportista se ha actualizado",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del transportista",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/shipping-agencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-agencies"] });
      setDeleteAgency(null);
      toast({
        title: "Transportista eliminado",
        description: "El transportista se ha eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el transportista",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgency) {
      updateMutation.mutate({ id: editingAgency.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (agency: ShippingAgency) => {
    setEditingAgency(agency);
    setFormData({
      name: agency.name,
      code: agency.code,
      website: agency.website || "",
      contactPhone: agency.contactPhone || "",
      contactEmail: agency.contactEmail || "",
      apiEndpoint: agency.apiEndpoint || "",
      trackingUrlTemplate: agency.trackingUrlTemplate || "",
      deliveryTimeMin: agency.deliveryTimeMin || 1,
      deliveryTimeMax: agency.deliveryTimeMax || 7,
      isActive: agency.isActive ?? true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (agency: ShippingAgency) => {
    setDeleteAgency(agency);
  };

  const confirmDelete = () => {
    if (deleteAgency) {
      deleteMutation.mutate(deleteAgency.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando transportistas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Agencias de Transporte
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las agencias de envío y sus configuraciones
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-agency">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Transportista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAgency ? "Editar Transportista" : "Nuevo Transportista"}
              </DialogTitle>
              <DialogDescription>
                {editingAgency 
                  ? "Modifica la información del transportista" 
                  : "Añade una nueva agencia de transporte al sistema"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      data-testid="input-agency-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Correos Express"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      data-testid="input-agency-code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ej: CORREOS"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    data-testid="input-agency-website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.ejemplo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email de Contacto</Label>
                    <Input
                      id="contactEmail"
                      data-testid="input-agency-email"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="contacto@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
                    <Input
                      id="contactPhone"
                      data-testid="input-agency-phone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="+34 900 000 000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint (opcional)</Label>
                  <Input
                    id="apiEndpoint"
                    data-testid="input-agency-api"
                    type="url"
                    value={formData.apiEndpoint}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    placeholder="https://api.ejemplo.com/v1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trackingUrl">Plantilla URL de Seguimiento</Label>
                  <Input
                    id="trackingUrl"
                    data-testid="input-agency-tracking"
                    value={formData.trackingUrlTemplate}
                    onChange={(e) => setFormData({ ...formData, trackingUrlTemplate: e.target.value })}
                    placeholder="https://tracking.ejemplo.com/track/{trackingNumber}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{trackingNumber}"} como marcador para el número de seguimiento
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryMin">Tiempo Mínimo (días)</Label>
                    <Input
                      id="deliveryMin"
                      data-testid="input-agency-min-days"
                      type="number"
                      min="1"
                      value={formData.deliveryTimeMin}
                      onChange={(e) => setFormData({ ...formData, deliveryTimeMin: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryMax">Tiempo Máximo (días)</Label>
                    <Input
                      id="deliveryMax"
                      data-testid="input-agency-max-days"
                      type="number"
                      min="1"
                      value={formData.deliveryTimeMax}
                      onChange={(e) => setFormData({ ...formData, deliveryTimeMax: parseInt(e.target.value) || 7 })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    data-testid="switch-agency-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Agencia activa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-save"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingAgency ? "Guardar Cambios" : "Crear Transportista"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Transportistas</CardTitle>
          <CardDescription>
            {agencies.length} {agencies.length === 1 ? "transportista registrado" : "transportistas registrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tiempo de Entrega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay transportistas registrados. Añade uno para comenzar.
                  </TableCell>
                </TableRow>
              ) : (
                agencies.map((agency) => (
                  <TableRow key={agency.id} data-testid={`row-agency-${agency.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {agency.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agency.code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {agency.contactEmail && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {agency.contactEmail}
                          </div>
                        )}
                        {agency.contactPhone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {agency.contactPhone}
                          </div>
                        )}
                        {agency.website && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <a 
                              href={agency.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              Ver sitio
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {agency.deliveryTimeMin}-{agency.deliveryTimeMax} días
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate(agency.id)}
                        disabled={toggleMutation.isPending}
                        data-testid={`button-toggle-${agency.id}`}
                      >
                        {agency.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inactivo
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(agency)}
                          data-testid={`button-edit-${agency.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(agency)}
                          data-testid={`button-delete-${agency.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteAgency} onOpenChange={() => setDeleteAgency(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transportista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente <strong>{deleteAgency?.name}</strong>.
              Si hay envíos asociados a este transportista, esto podría causar problemas.
              ¿Estás seguro de que deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
