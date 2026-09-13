import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Package,
  TrendingUp,
  Warehouse,
  BarChart3,
  ShoppingCart,
  Truck,
  FileText,
  CheckCircle,
  Search
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  position: "center" | "top" | "bottom" | "left" | "right";
  action?: {
    type: "highlight" | "click" | "navigate";
    element?: string;
    route?: string;
  };
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "¡Bienvenido a LogiPro!",
    description: "Te enseñamos en un minuto las áreas principales de tu plataforma de gestión de inventario, almacén y operaciones. Puedes saltarte el tour cuando quieras.",
    icon: <Package className="h-8 w-8 text-primary" />,
    position: "center"
  },
  {
    id: "dashboard",
    title: "Panel de Control",
    description: "Tu vista general: productos totales, stock bajo, movimientos del día y las métricas clave del negocio.",
    icon: <BarChart3 className="h-6 w-6 text-primary" />,
    position: "center",
    action: { type: "navigate", route: "/" }
  },
  {
    id: "search",
    title: "Búsqueda inteligente",
    description: "Encuentra productos, clientes, pedidos o zonas desde la barra de búsqueda, disponible en cualquier página.",
    icon: <Search className="h-6 w-6 text-primary" />,
    position: "top",
    target: "[data-tour='search']",
    action: { type: "highlight", element: "[data-tour='search']" }
  },
  {
    id: "products",
    title: "Inventario y productos",
    description: "Gestiona tu catálogo: alta individual o masiva, SKU, categorías, stock mínimo y punto de reorden.",
    icon: <Package className="h-6 w-6 text-primary" />,
    position: "center",
    action: { type: "navigate", route: "/products" }
  },
  {
    id: "warehouse",
    title: "Almacén y zonas (SGA)",
    description: "Visualiza el almacén con zonas interactivas y registra movimientos de stock: entradas, salidas y transferencias.",
    icon: <Warehouse className="h-6 w-6 text-primary" />,
    position: "center",
    action: { type: "navigate", route: "/warehouse-map" }
  },
  {
    id: "pos",
    title: "TPV / Punto de venta",
    description: "Cobra en tienda con descuento de stock en tiempo real, con soporte para stock propio y dropshipping.",
    icon: <ShoppingCart className="h-6 w-6 text-primary" />,
    position: "center",
    action: { type: "navigate", route: "/pos" }
  },
  {
    id: "shipping",
    title: "Pedidos y envíos",
    description: "Procesa pedidos de principio a fin: preparación, agencias de transporte, seguimiento de envíos y devoluciones.",
    icon: <Truck className="h-6 w-6 text-primary" />,
    position: "center",
    action: { type: "navigate", route: "/orders" }
  },
  {
    id: "erp",
    title: "ERP y facturación",
    description: "Contabilidad, CRM, compras y facturación con cumplimiento fiscal español (SII / Verifactu), todo integrado.",
    icon: <FileText className="h-6 w-6 text-primary" />,
    position: "center",
    action: { type: "navigate", route: "/erp/invoices" }
  },
  {
    id: "complete",
    title: "¡Todo listo!",
    description: "Ya conoces lo esencial de LogiPro. Puedes volver a ver este tour cuando quieras desde el menú lateral o la página de menú.",
    icon: <CheckCircle className="h-8 w-8 text-green-600" />,
    position: "center"
  }
];

interface OnboardingTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function OnboardingTour({ open, onOpenChange, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [open]);

  const currentTourStep = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextStep = tourSteps[currentStep + 1];
      if (nextStep.action?.type === "navigate" && nextStep.action.route) {
        // Navigate to the route
        window.history.pushState(null, "", nextStep.action.route);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
    onOpenChange(false);
  };

  const handleSkip = () => {
    setIsVisible(false);
    onOpenChange(false);
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / tourSteps.length) * 100;
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      {/* Tour Dialog */}
      <Dialog open={isVisible} onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleSkip();
        }
      }}>
        <DialogContent className="sm:max-w-md z-50">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {currentTourStep.icon}
                <div>
                  <DialogTitle className="text-xl">{currentTourStep.title}</DialogTitle>
                  <Badge variant="outline" className="mt-1">
                    Paso {currentStep + 1} de {tourSteps.length}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* Step Description */}
            <DialogDescription className="text-base leading-relaxed">
              {currentTourStep.description}
            </DialogDescription>

            {/* Special content for specific steps */}
            {currentStep === 0 && (
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Inventario, almacén y operaciones</h4>
                      <p className="text-sm text-slate-600">Inventario, SGA, TPV, envíos y ERP en una sola plataforma</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === tourSteps.length - 1 && (
              <div className="space-y-3">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <h4 className="font-semibold text-green-900">¡Listo para empezar!</h4>
                        <p className="text-sm text-green-700">Tu sistema está configurado y listo para usar</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="text-center text-sm text-slate-600">
                  <p>💡 <strong>Consejo:</strong> Comienza creando algunas zonas de almacén y luego agrega tus primeros productos.</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-slate-500"
                >
                  Saltar tour
                </Button>
                <Button onClick={handleNext}>
                  {isLastStep ? "Finalizar" : "Siguiente"}
                  {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}