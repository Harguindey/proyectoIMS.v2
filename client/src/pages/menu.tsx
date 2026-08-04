import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Map, 
  ArrowRightLeft, 
  ArrowUpDown, 
  Calendar, 
  Truck, 
  BarChart3, 
  Settings,
  Grid3X3,
  HelpCircle,
  User,
  Users,
  ChevronRight,
  Shield,
  Barcode,
  ShoppingCart,
  Sparkles,
  Receipt,
  ShoppingBag,
  Calculator,
  Target,
  Building,
  ClipboardList
} from "lucide-react";
import { Link } from "wouter";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { useAuth } from "@/hooks/useAuth";

export default function MenuPage() {
  const { startTour } = useOnboarding();
  const { isMobile } = useDeviceDetection();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();

  const menuSections = [
    {
      title: "Ventas e Inventario",
      items: [
        {
          name: "Punto de Venta (TPV)",
          href: "/pos",
          icon: ShoppingCart,
          description: "Registro de ventas en mostrador",
          color: "text-green-600 bg-green-50"
        },
        {
          name: "Mapa del Almacén",
          href: "/warehouse-map",
          icon: Map,
          description: "Vista visual de las zonas del almacén",
          color: "text-blue-600 bg-blue-50"
        },
        {
          name: "Gestión de Inventario",
          href: "/inventory-management",
          icon: ArrowRightLeft,
          description: "Drag & drop para mover productos",
          color: "text-amber-600 bg-amber-50"
        },
        {
          name: "Entrada Rápida",
          href: "/quick-scan",
          icon: Barcode,
          description: "Escanea códigos para entradas rápidas",
          color: "text-cyan-600 bg-cyan-50"
        },
        {
          name: "Movimientos",
          href: "/movements",
          icon: ArrowUpDown,
          description: "Historial de movimientos de stock",
          color: "text-purple-600 bg-purple-50"
        }
      ]
    },
    {
      title: "Gestión de Compras",
      items: [
        {
          name: "Aprovisionamiento",
          href: "/procurement",
          icon: Calendar,
          description: "Planifica tus compras futuras",
          color: "text-orange-600 bg-orange-50"
        },
        {
          name: "Proveedores",
          href: "/suppliers",
          icon: Truck,
          description: "Gestiona tus proveedores",
          color: "text-indigo-600 bg-indigo-50"
        },
        {
          name: "Clientes",
          href: "/customers",
          icon: Users,
          description: "Gestiona tus clientes",
          color: "text-teal-600 bg-teal-50"
        }
      ]
    },
    {
      title: "Análisis y Configuración",
      items: [
        {
          name: "Reportes",
          href: "/reports",
          icon: BarChart3,
          description: "Analytics y métricas detalladas",
          color: "text-rose-600 bg-rose-50"
        },
        {
          name: "Análisis de Inventario",
          href: "/inventory-analytics",
          icon: BarChart3,
          description: "Velocidad de ventas, ABC, puntos de reorden",
          color: "text-blue-600 bg-blue-50"
        },
        {
          name: "Configuración",
          href: "/settings",
          icon: Settings,
          description: "Configuraciones del sistema",
          color: "text-slate-600 bg-slate-50"
        }
      ]
    },
    {
      title: "ERP",
      items: [
        {
          name: "Facturación",
          href: "/erp/invoices",
          icon: Receipt,
          description: "Facturas, albaranes y notas de crédito",
          color: "text-emerald-600 bg-emerald-50"
        },
        {
          name: "Compras",
          href: "/erp/purchases",
          icon: ShoppingBag,
          description: "Órdenes de compra a proveedores",
          color: "text-violet-600 bg-violet-50"
        },
        {
          name: "Contabilidad",
          href: "/erp/accounting",
          icon: Calculator,
          description: "Plan contable, asientos y ejercicios",
          color: "text-sky-600 bg-sky-50"
        },
        {
          name: "CRM",
          href: "/erp/crm",
          icon: Target,
          description: "Pipeline de ventas y actividades",
          color: "text-pink-600 bg-pink-50"
        },
        {
          name: "Recursos Humanos",
          href: "/erp/hr",
          icon: Building,
          description: "Empleados, departamentos y contratos",
          color: "text-amber-600 bg-amber-50"
        },
        {
          name: "Cumplimiento Fiscal",
          href: "/erp/fiscal",
          icon: Shield,
          description: "Control SII/AEAT, plazos y alertas",
          color: "text-red-600 bg-red-50"
        }
      ]
    },
    {
      title: "SGA - Almacen",
      items: [
        {
          name: "Picking / Packing / Recepcion",
          href: "/sga",
          icon: ClipboardList,
          description: "Gestion operativa de almacen",
          color: "text-teal-600 bg-teal-50"
        }
      ]
    },
    ...(isAdmin ? [{
      title: "Administración",
      items: [
        {
          name: "Accesos Autorizados",
          href: "/admin/authorized-emails",
          icon: Shield,
          description: "Gestiona los emails autorizados",
          color: "text-red-600 bg-red-50"
        },
        {
          name: "Simulación de Datos",
          href: "/admin/data-simulation",
          icon: Sparkles,
          description: "Genera movimientos históricos de prueba",
          color: "text-purple-600 bg-purple-50"
        }
      ]
    }] : [])
  ];

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="max-w-4xl mx-auto p-3 sm:p-8 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Menú Principal</h1>
          <p className="text-sm sm:text-base text-slate-600">Accede a todas las funcionalidades de SportMax Pro</p>
        </div>

        {/* Menu Sections */}
        <div className="space-y-6 sm:space-y-8">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 sm:mb-4">{section.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.name} href={item.href}>
                      <Card 
                        className="border-0 shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                        data-testid={`menu-item-${item.href.replace('/', '').replace('-', '')}`}
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 sm:space-x-4">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                                <Icon size={20} />
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-900 text-sm sm:text-base">{item.name}</h3>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">{item.description}</p>
                              </div>
                            </div>
                            <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors" size={18} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-8 sm:mt-12">
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <HelpCircle className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm sm:text-base">Ayuda y Tutorial</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Aprende a usar todas las funciones</p>
                  </div>
                </div>
                <Button 
                  onClick={startTour}
                  size={isMobile ? "default" : "sm"}
                  className={`bg-blue-600 hover:bg-blue-700 ${isMobile ? 'text-sm h-10' : 'text-xs sm:text-sm'}`}
                  data-testid="button-start-tour"
                >
                  Iniciar Tutorial
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Profile Section */}
        <div className="mt-6 sm:mt-8">
          <UserProfileSection isLoading={isLoading} isAuthenticated={isAuthenticated} user={user} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}

// User Profile Component for Menu Page
function UserProfileSection({ isLoading, isAuthenticated, user, isMobile }: {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any;
  isMobile: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="text-white" size={20} />
              </div>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 text-sm sm:text-base mb-2">¡Bienvenido a SportMax Pro!</h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">
                Inicia sesión para acceder a todas las funciones de gestión de inventario
              </p>
              <Button
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                size={isMobile ? "default" : "sm"}
                data-testid="mobile-login-button"
              >
                <User className="mr-2" size={16} />
                Iniciar Sesión
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email?.split('@')[0] || 'Usuario';
  
  const userRole = user.roles?.[0]?.role?.displayName || 'Usuario';

  return (
    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              {user.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                />
              ) : (
                <User className="text-white" size={18} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900 text-sm sm:text-base">{displayName}</h3>
              <p className="text-xs sm:text-sm text-slate-500">{user.email}</p>
            </div>
            <Badge variant="secondary" className="text-xs">{userRole}</Badge>
          </div>
          
          <Button
            onClick={() => window.location.href = '/api/logout'}
            variant="outline"
            size={isMobile ? "default" : "sm"}
            className="w-full text-slate-600 hover:text-slate-900"
            data-testid="mobile-logout-button"
          >
            <User className="mr-2" size={16} />
            <span className="text-sm">Cerrar Sesión</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}