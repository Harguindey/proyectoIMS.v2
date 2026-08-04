import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Mail, 
  Plus, 
  Trash2, 
  CheckCircle,
  XCircle,
  Shield,
  Crown,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AuthorizedEmail } from "@shared/schema";

interface EmailFormData {
  email: string;
  plan: 'free' | 'premium';
  isActive: boolean;
}

const initialFormData: EmailFormData = {
  email: "",
  plan: "free",
  isActive: true
};

export default function AuthorizedEmailsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EmailFormData>(initialFormData);
  const [deleteEmail, setDeleteEmail] = useState<AuthorizedEmail | null>(null);

  const { data: emails = [], isLoading } = useQuery<AuthorizedEmail[]>({
    queryKey: ["/api/admin/authorized-emails"],
  });

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setFormData(initialFormData);
    }
  };

  const handleCloseDialog = () => {
    handleDialogChange(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      return await apiRequest("POST", "/api/admin/authorized-emails", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/authorized-emails"] });
      handleDialogChange(false);
      toast({
        title: "Email autorizado",
        description: "El email se ha agregado a la lista de autorizados",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "No se pudo agregar el email",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/authorized-emails/${id}`, { isActive: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/authorized-emails"] });
      toast({
        title: "Estado actualizado",
        description: "El estado del email se ha actualizado",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del email",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/authorized-emails/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/authorized-emails"] });
      setDeleteEmail(null);
      toast({
        title: "Email eliminado",
        description: "El email se ha eliminado de la lista de autorizados",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el email",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast({
        title: "Error",
        description: "El email es requerido",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Error",
        description: "El formato del email no es válido",
        variant: "destructive",
      });
      return;
    }

    // Normalize email to lowercase before sending
    const normalizedFormData = {
      ...formData,
      email: formData.email.toLowerCase().trim()
    };

    createMutation.mutate(normalizedFormData);
  };

  const handleToggle = (email: AuthorizedEmail) => {
    toggleMutation.mutate({ id: email.id, isActive: !!email.isActive });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Accesos Autorizados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los emails que tienen acceso a la aplicación
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-email">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Email
          </Button>
          
          <DialogContent data-testid="dialog-add-email">
            <DialogHeader>
              <DialogTitle>Agregar Email Autorizado</DialogTitle>
              <DialogDescription>
                Agrega un email a la lista de usuarios autorizados para acceder a la aplicación
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={formData.plan} onValueChange={(value: 'free' | 'premium') => setFormData({ ...formData, plan: value })}>
                    <SelectTrigger data-testid="select-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Free - Básico</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="premium">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-yellow-600" />
                          <span>Premium - Completo</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Free: Solo inventario básico. Premium: Acceso completo
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "Agregando..." : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Emails Autorizados</CardTitle>
          <CardDescription>
            {emails.length} {emails.length === 1 ? 'email autorizado' : 'emails autorizados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay emails autorizados</p>
              <p className="text-sm mt-2">Agrega emails para permitir el acceso a la aplicación</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Agregado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id} data-testid={`row-email-${email.id}`}>
                    <TableCell className="font-medium" data-testid={`text-email-${email.id}`}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {email.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={email.isActive ? "default" : "secondary"}
                        className="flex items-center gap-1 w-fit"
                        data-testid={`badge-status-${email.id}`}
                      >
                        {email.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Bloqueado
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {email.createdAt ? new Date(email.createdAt).toLocaleDateString('es-ES') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle(email)}
                          disabled={toggleMutation.isPending}
                          data-testid={`button-toggle-${email.id}`}
                        >
                          {email.isActive ? "Bloquear" : "Activar"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteEmail(email)}
                          data-testid={`button-delete-${email.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteEmail} onOpenChange={() => setDeleteEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el email <strong>{deleteEmail?.email}</strong> de la lista de autorizados.
              Este usuario ya no podrá acceder a la aplicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEmail && deleteMutation.mutate(deleteEmail.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
