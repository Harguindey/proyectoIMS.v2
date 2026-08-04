import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingSpinner } from "@/components/loading/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AdminOnly } from "@/components/protected-component";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { 
  Users, 
  Shield, 
  UserPlus, 
  Search, 
  Settings,
  Crown,
  Eye,
  UserCheck,
  AlertTriangle
} from "lucide-react";

const assignRoleSchema = z.object({
  roleId: z.coerce.number(),
});

type AssignRoleData = z.infer<typeof assignRoleSchema>;

export default function AdminUsersPage() {
  const { isLoading: authLoading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<any[]>({
    queryKey: ["/api/roles"],
    enabled: isAdmin,
  });

  // Form setup
  const form = useForm<AssignRoleData>({
    resolver: zodResolver(assignRoleSchema),
  });

  // Mutations
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleData }: { userId: string; roleData: AssignRoleData }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/roles`, {
        roleId: roleData.roleId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setAssignRoleDialogOpen(false);
      toast({
        title: "Rol asignado",
        description: "El rol se asignó correctamente al usuario.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo asignar el rol al usuario.",
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: number }) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Rol removido",
        description: "El rol se removió correctamente del usuario.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo remover el rol del usuario.",
        variant: "destructive",
      });
    },
  });

  // Loading states
  if (authLoading || usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === "all" || 
      user.roles?.some((userRole: any) => userRole.role.name === selectedRole);

    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin': return <Crown className="w-4 h-4" />;
      case 'supervisor': return <Shield className="w-4 h-4" />;
      case 'operador': return <UserCheck className="w-4 h-4" />;
      case 'viewer': return <Eye className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'supervisor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'operador': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const onAssignRole = async (data: AssignRoleData) => {
    if (!selectedUserId) return;
    assignRoleMutation.mutate({ userId: selectedUserId, roleData: data });
  };

  return (
    <AdminOnly fallback={
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Acceso Denegado
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Solo los administradores pueden acceder a esta página.
        </p>
      </div>
    }>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Gestión de Usuarios
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Administra usuarios y asigna roles y permisos
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar usuarios por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-role">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuarios del Sistema ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.profileImageUrl ? (
                            <img 
                              src={user.profileImageUrl} 
                              alt={user.firstName || user.email}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.email
                              }
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.length > 0 ? (
                            user.roles.map((userRole: any) => (
                              <Badge 
                                key={userRole.id}
                                className={`${getRoleColor(userRole.role.name)} flex items-center gap-1`}
                              >
                                {getRoleIcon(userRole.role.name)}
                                {userRole.role.displayName}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1 hover:bg-red-200 dark:hover:bg-red-800"
                                  onClick={() => removeRoleMutation.mutate({ 
                                    userId: user.id, 
                                    roleId: userRole.roleId 
                                  })}
                                  data-testid={`button-remove-role-${userRole.role.name}`}
                                >
                                  ×
                                </Button>
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">Sin roles</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <Dialog 
                          open={assignRoleDialogOpen && selectedUserId === user.id}
                          onOpenChange={(open) => {
                            setAssignRoleDialogOpen(open);
                            if (open) setSelectedUserId(user.id);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" data-testid={`button-assign-role-${user.id}`}>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Asignar Rol
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Asignar Rol a Usuario</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit(onAssignRole)} className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="roleId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Seleccionar Rol</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value?.toString()}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid="select-role-assignment">
                                            <SelectValue placeholder="Selecciona un rol" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {roles.map((role: any) => (
                                            <SelectItem key={role.id} value={role.id.toString()}>
                                              <div className="flex items-center gap-2">
                                                {getRoleIcon(role.name)}
                                                {role.displayName}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAssignRoleDialogOpen(false)}
                                    data-testid="button-cancel-assignment"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    type="submit"
                                    disabled={assignRoleMutation.isPending}
                                    data-testid="button-confirm-assignment"
                                  >
                                    {assignRoleMutation.isPending ? (
                                      <>
                                        <LoadingSpinner />
                                        Asignando...
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Asignar Rol
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron usuarios con los filtros aplicados.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminOnly>
  );
}
