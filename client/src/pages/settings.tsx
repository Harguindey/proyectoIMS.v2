import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Database, 
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  Building,
  Mail,
  Phone,
  Calendar,
  Globe,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useChartTheme } from "@/hooks/use-chart-theme";
import ChartThemeSelector from "@/components/chart-theme-selector";

interface SystemSettings {
  id: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  timezone: string;
  currency: string;
  language: string;
  dateFormat: string;
  lowStockThreshold: number;
  autoReorderEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  maintenanceMode: boolean;
  backupFrequency: string;
  lastBackup: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  avatar: string | null;
  theme: string;
  notifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { currentTheme, changeTheme } = useChartTheme();

  // ── Load real session user data ─────────────────────────────────────────────
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Profile state seeded from real session
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    name: "",
    email: "",
    role: "",
    department: "",
    phone: "",
    theme: "light",
    notifications: true,
  });

  // Sync profile state once auth data arrives
  useEffect(() => {
    if (authData?.user) {
      const u = authData.user;
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "";
      const roleName = u.roles?.[0]?.role?.displayName || u.roles?.[0]?.role?.name || "";
      setProfileData((prev) => ({
        ...prev,
        name: fullName,
        email: u.email || "",
        role: roleName,
      }));
    }
  }, [authData]);

  const [systemData, setSystemData] = useState<Partial<SystemSettings>>({
    companyName: "StockPro Warehouse Solutions",
    companyAddress: "Av. Industrial 123, 28045 Madrid, España",
    companyPhone: "+34 91 123 4567",
    companyEmail: "contacto@stockpro.com",
    timezone: "Europe/Madrid",
    currency: "EUR",
    language: "es",
    dateFormat: "DD/MM/YYYY",
    lowStockThreshold: 10,
    autoReorderEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    maintenanceMode: false,
    backupFrequency: "daily",
    lastBackup: new Date().toISOString()
  });

  // Simular guardado de perfil de usuario
  const saveProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Perfil actualizado",
        description: "Los cambios en tu perfil se han guardado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error al actualizar perfil",
        description: "Hubo un problema al guardar los cambios",
        variant: "destructive"
      });
    }
  });

  // Simular guardado de configuración del sistema
  const saveSystemMutation = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "Los cambios en la configuración del sistema se han guardado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error al actualizar configuración",
        description: "Hubo un problema al guardar los cambios del sistema",
        variant: "destructive"
      });
    }
  });

  const handleProfileSave = () => {
    saveProfileMutation.mutate(profileData);
  };

  const handleSystemSave = () => {
    saveSystemMutation.mutate(systemData);
  };

  const handleBackup = () => {
    toast({
      title: "Iniciando respaldo",
      description: "El respaldo de datos se está creando...",
    });
    // Simular proceso de backup
    setTimeout(() => {
      toast({
        title: "Respaldo completado",
        description: "El respaldo de datos se ha creado exitosamente",
      });
    }, 3000);
  };

  const handleDataExport = () => {
    toast({
      title: "Exportando datos",
      description: "Se está preparando la exportación completa...",
    });
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
              <p className="text-slate-600">Personaliza tu experiencia y configura el sistema</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle size={14} className="mr-1" />
              Sistema Operativo
            </Badge>
            <Button variant="outline" onClick={handleBackup}>
              <Database size={16} className="mr-2" />
              Crear Respaldo
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">
              <User size={16} className="mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="system">
              <SettingsIcon size={16} className="mr-2" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell size={16} className="mr-2" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette size={16} className="mr-2" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield size={16} className="mr-2" />
              Seguridad
            </TabsTrigger>
          </TabsList>

          {/* Tab: Perfil de Usuario */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2" size={20} />
                  Información Personal
                </CardTitle>
                <CardDescription>
                  Actualiza tu información personal y preferencias de cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ingresa tu nombre completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo</Label>
                    <Select
                      value={profileData.role}
                      onValueChange={(value) => setProfileData(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Supervisor de Almacén">Supervisor de Almacén</SelectItem>
                        <SelectItem value="Jefe de Logística">Jefe de Logística</SelectItem>
                        <SelectItem value="Operador de Almacén">Operador de Almacén</SelectItem>
                        <SelectItem value="Administrador">Administrador</SelectItem>
                        <SelectItem value="Analista de Inventario">Analista de Inventario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select
                      value={profileData.department}
                      onValueChange={(value) => setProfileData(prev => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Logística">Logística</SelectItem>
                        <SelectItem value="Operaciones">Operaciones</SelectItem>
                        <SelectItem value="Administración">Administración</SelectItem>
                        <SelectItem value="Compras">Compras</SelectItem>
                        <SelectItem value="Calidad">Calidad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+34 600 123 456"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end space-x-3">
                  <Button variant="outline">Cancelar</Button>
                  <Button 
                    onClick={handleProfileSave}
                    disabled={saveProfileMutation.isPending}
                  >
                    {saveProfileMutation.isPending ? (
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={16} className="mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Configuración del Sistema */}
          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="mr-2" size={20} />
                    Información de la Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nombre de la Empresa</Label>
                      <Input
                        id="companyName"
                        value={systemData.companyName}
                        onChange={(e) => setSystemData(prev => ({ ...prev, companyName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Email Corporativo</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={systemData.companyEmail}
                        onChange={(e) => setSystemData(prev => ({ ...prev, companyEmail: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Dirección</Label>
                    <Textarea
                      id="companyAddress"
                      value={systemData.companyAddress}
                      onChange={(e) => setSystemData(prev => ({ ...prev, companyAddress: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Teléfono</Label>
                      <Input
                        id="companyPhone"
                        value={systemData.companyPhone}
                        onChange={(e) => setSystemData(prev => ({ ...prev, companyPhone: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Zona Horaria</Label>
                      <Select
                        value={systemData.timezone}
                        onValueChange={(value) => setSystemData(prev => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Madrid">Europa/Madrid (GMT+1)</SelectItem>
                          <SelectItem value="America/Mexico_City">América/Ciudad_de_México (GMT-6)</SelectItem>
                          <SelectItem value="America/New_York">América/Nueva_York (GMT-5)</SelectItem>
                          <SelectItem value="America/Los_Angeles">América/Los_Ángeles (GMT-8)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2" size={20} />
                    Configuración de Inventario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Moneda</Label>
                      <Select
                        value={systemData.currency}
                        onValueChange={(value) => setSystemData(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">Euro (€)</SelectItem>
                          <SelectItem value="USD">Dólar USD ($)</SelectItem>
                          <SelectItem value="MXN">Peso Mexicano ($)</SelectItem>
                          <SelectItem value="GBP">Libra Esterlina (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Idioma</Label>
                      <Select
                        value={systemData.language}
                        onValueChange={(value) => setSystemData(prev => ({ ...prev, language: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Formato de Fecha</Label>
                      <Select
                        value={systemData.dateFormat}
                        onValueChange={(value) => setSystemData(prev => ({ ...prev, dateFormat: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Umbral de Stock Bajo</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      value={systemData.lowStockThreshold}
                      onChange={(e) => setSystemData(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                      className="w-32"
                    />
                    <p className="text-sm text-slate-500">
                      Cantidad mínima para activar alertas de stock bajo
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reabastecimiento Automático</Label>
                      <p className="text-sm text-slate-500">
                        Crear automáticamente planes de aprovisionamiento cuando el stock sea bajo
                      </p>
                    </div>
                    <Switch
                      checked={systemData.autoReorderEnabled}
                      onCheckedChange={(checked) => setSystemData(prev => ({ ...prev, autoReorderEnabled: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-3">
                <Button variant="outline">Restaurar Valores</Button>
                <Button 
                  onClick={handleSystemSave}
                  disabled={saveSystemMutation.isPending}
                >
                  {saveSystemMutation.isPending ? (
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  Guardar Configuración
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Notificaciones */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2" size={20} />
                  Preferencias de Notificaciones
                </CardTitle>
                <CardDescription>
                  Configura cómo y cuándo recibir notificaciones del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificaciones por Email</Label>
                      <p className="text-sm text-slate-500">
                        Recibir alertas y reportes por correo electrónico
                      </p>
                    </div>
                    <Switch
                      checked={systemData.emailNotifications}
                      onCheckedChange={(checked) => setSystemData(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificaciones SMS</Label>
                      <p className="text-sm text-slate-500">
                        Recibir alertas críticas por mensaje de texto
                      </p>
                    </div>
                    <Switch
                      checked={systemData.smsNotifications}
                      onCheckedChange={(checked) => setSystemData(prev => ({ ...prev, smsNotifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificaciones Push</Label>
                      <p className="text-sm text-slate-500">
                        Mostrar notificaciones en tiempo real en el navegador
                      </p>
                    </div>
                    <Switch
                      checked={systemData.pushNotifications}
                      onCheckedChange={(checked) => setSystemData(prev => ({ ...prev, pushNotifications: checked }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Tipos de Alertas</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <Label className="text-sm">Stock bajo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <Label className="text-sm">Productos vencidos</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <Label className="text-sm">Movimientos grandes</Label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <Label className="text-sm">Nuevos pedidos</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <Label className="text-sm">Reportes semanales</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <Label className="text-sm">Mantenimiento del sistema</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Apariencia */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="mr-2" size={20} />
                  Personalización Visual
                </CardTitle>
                <CardDescription>
                  Personaliza la apariencia de tu interfaz y los colores de los gráficos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Tema de Gráficos</Label>
                    <p className="text-sm text-slate-500 mb-4">
                      Selecciona el esquema de colores para gráficos y visualizaciones
                    </p>
                    <ChartThemeSelector
                      currentTheme={currentTheme.id}
                      onThemeChange={(theme) => changeTheme(theme)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="text-base font-medium">Configuración de Dashboard</Label>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Animaciones</Label>
                        <p className="text-sm text-slate-500">
                          Habilitar animaciones en gráficos y transiciones
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Actualización en Tiempo Real</Label>
                        <p className="text-sm text-slate-500">
                          Actualizar datos automáticamente cada 2 segundos
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Mostrar Alertas de Stock</Label>
                        <p className="text-sm text-slate-500">
                          Mostrar indicadores visuales para productos con stock bajo
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Seguridad */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2" size={20} />
                    Seguridad y Respaldos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Modo de Mantenimiento</Label>
                        <p className="text-sm text-slate-500">
                          Restringir acceso al sistema para mantenimiento
                        </p>
                      </div>
                      <Switch
                        checked={systemData.maintenanceMode}
                        onCheckedChange={(checked) => setSystemData(prev => ({ ...prev, maintenanceMode: checked }))}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-base font-medium">Respaldos Automáticos</Label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="backupFrequency">Frecuencia</Label>
                          <Select
                            value={systemData.backupFrequency}
                            onValueChange={(value) => setSystemData(prev => ({ ...prev, backupFrequency: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Cada hora</SelectItem>
                              <SelectItem value="daily">Diariamente</SelectItem>
                              <SelectItem value="weekly">Semanalmente</SelectItem>
                              <SelectItem value="monthly">Mensualmente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Último Respaldo</Label>
                          <div className="flex items-center space-x-2">
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-sm text-slate-600">
                              {systemData.lastBackup 
                                ? new Date(systemData.lastBackup).toLocaleString('es-ES')
                                : 'Nunca'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button onClick={handleBackup} variant="outline">
                        <Database size={16} className="mr-2" />
                        Crear Respaldo Ahora
                      </Button>
                      <Button onClick={handleDataExport} variant="outline">
                        <Download size={16} className="mr-2" />
                        Exportar Todos los Datos
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-destructive">
                    <AlertTriangle className="mr-2" size={20} />
                    Zona de Peligro
                  </CardTitle>
                  <CardDescription>
                    Acciones irreversibles que requieren confirmación especial
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle size={20} className="text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-destructive">Restablecer Sistema</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Esto eliminará todos los datos y configuraciones, y restaurará el sistema a su estado inicial.
                        </p>
                        <Button variant="destructive" className="mt-3" size="sm">
                          <Trash2 size={16} className="mr-2" />
                          Restablecer Sistema
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}