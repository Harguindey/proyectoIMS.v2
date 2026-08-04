import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ExternalLink,
  Zap,
  Rocket,
  Building2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Subscription {
  id?: number;
  plan: string;
  status: string;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

const PLAN_META: Record<string, { name: string; Icon: any; color: string }> = {
  free:       { name: "Gratis",     Icon: Zap,       color: "text-slate-500" },
  starter:    { name: "Starter",    Icon: Zap,       color: "text-blue-500"  },
  pro:        { name: "Pro",        Icon: Rocket,    color: "text-purple-600"},
  enterprise: { name: "Enterprise", Icon: Building2, color: "text-orange-600"},
};

const STATUS_META: Record<string, { label: string; color: string; Icon: any }> = {
  trialing:   { label: "Periodo de prueba",  color: "bg-blue-100 text-blue-700",   Icon: Clock         },
  active:     { label: "Activa",             color: "bg-green-100 text-green-700", Icon: CheckCircle2  },
  past_due:   { label: "Pago vencido",       color: "bg-red-100 text-red-700",     Icon: AlertCircle   },
  canceled:   { label: "Cancelada",          color: "bg-slate-100 text-slate-600", Icon: XCircle       },
  incomplete: { label: "Incompleta",         color: "bg-yellow-100 text-yellow-700", Icon: AlertCircle },
  paused:     { label: "Pausada",            color: "bg-slate-100 text-slate-600", Icon: Clock         },
  none:       { label: "Sin suscripción",    color: "bg-slate-100 text-slate-600", Icon: XCircle       },
};

const UPGRADE_PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: "29€/mes",
    Icon: Zap,
    features: ["3 usuarios", "1 almacén", "TPV + inventario", "Soporte email"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "79€/mes",
    Icon: Rocket,
    highlight: true,
    features: ["10 usuarios", "3 almacenes", "SGA + ERP completo", "API + webhooks", "Soporte prioritario"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "199€/mes",
    Icon: Building2,
    features: ["Usuarios ilimitados", "SSO / SAML", "SLA 99.9%", "Soporte dedicado"],
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function daysLeft(dateStr?: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [upgradeInterval, setUpgradeInterval] = useState<"monthly" | "yearly">("monthly");

  const urlParams = new URLSearchParams(window.location.search);
  const checkoutSuccess = urlParams.get("success") === "1";
  const checkoutCanceled = urlParams.get("canceled") === "1";

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: sub, isLoading, refetch } = useQuery<Subscription>({
    queryKey: ["/api/billing/subscription"],
    refetchInterval: checkoutSuccess ? 3000 : false, // Poll briefly after checkout
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: string }) => {
      const res = await apiRequest("POST", "/api/billing/create-checkout", { plan, interval });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({
        title: "Error al procesar pago",
        description: err.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/customer-portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({
        title: "Error abriendo portal",
        description: err.message ?? "Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // ── Render helpers ───────────────────────────────────────────────────────────

  const status = sub?.status ?? "none";
  const statusMeta = STATUS_META[status] ?? STATUS_META.none;
  const planMeta = PLAN_META[sub?.plan ?? "free"] ?? PLAN_META.free;
  const StatusIcon = statusMeta.Icon;
  const PlanIcon = planMeta.Icon;

  const isActive = ["active", "trialing"].includes(status);
  const hasStripe = !!sub?.stripeSubscriptionId;
  const trialDays = status === "trialing" ? daysLeft(sub?.trialEnd) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Facturación y suscripción</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona tu plan, pagos y facturas desde aquí.
        </p>
      </div>

      {/* Post-checkout banners */}
      {checkoutSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          <CheckCircle2 size={18} className="shrink-0" />
          ¡Pago completado! Tu suscripción está activa. Puede tardar unos segundos en reflejarse.
        </div>
      )}
      {checkoutCanceled && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <PlanIcon size={22} className={planMeta.color} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-lg">{planMeta.name}</span>
                  <Badge className={`text-xs ${statusMeta.color}`}>
                    <StatusIcon size={11} className="mr-1" />
                    {statusMeta.label}
                  </Badge>
                </div>
                {status === "trialing" && trialDays !== null && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {trialDays > 0
                      ? `Quedan ${trialDays} días de prueba gratuita · caduca ${formatDate(sub?.trialEnd)}`
                      : "Periodo de prueba finalizado"}
                  </p>
                )}
                {status === "active" && sub?.currentPeriodEnd && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {sub.cancelAtPeriodEnd
                      ? `Cancela el ${formatDate(sub.currentPeriodEnd)}`
                      : `Se renueva el ${formatDate(sub.currentPeriodEnd)}`}
                  </p>
                )}
                {status === "past_due" && (
                  <p className="text-sm text-red-600 mt-0.5">
                    Pago pendiente · actualiza tu método de pago
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {hasStripe && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <RefreshCw size={14} className="animate-spin mr-1" />
                  ) : (
                    <ExternalLink size={14} className="mr-1" />
                  )}
                  Portal de facturación
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade / Change plan */}
      {!isActive || sub?.plan === "free" || sub?.plan === "starter" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isActive && sub?.plan !== "free" ? "Cambiar de plan" : "Activar suscripción"}
            </CardTitle>
            <CardDescription>
              {status === "trialing"
                ? "Tu prueba gratuita está activa. Suscríbete ahora para no perder el acceso."
                : "Elige un plan para acceder a todas las funcionalidades."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Interval toggle */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setUpgradeInterval("monthly")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  upgradeInterval === "monthly"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setUpgradeInterval("yearly")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  upgradeInterval === "yearly"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Anual
                <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  -17%
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {UPGRADE_PLANS.map((plan) => {
                const Icon = plan.Icon;
                const isCurrent = sub?.plan === plan.key && isActive;
                return (
                  <div
                    key={plan.key}
                    className={`rounded-xl border p-5 flex flex-col gap-3 ${
                      plan.highlight
                        ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/30"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={plan.highlight ? "text-blue-600" : "text-slate-500"} />
                      <span className="font-semibold text-slate-800">{plan.name}</span>
                      {plan.highlight && (
                        <Badge className="text-xs bg-blue-600 text-white hover:bg-blue-600 ml-auto">Popular</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                      {upgradeInterval === "yearly"
                        ? `${Math.round(parseInt(plan.price) * 10 / 12)}€`
                        : plan.price.split("€")[0] + "€"}
                      <span className="text-sm font-normal text-slate-400">/mes</span>
                    </p>
                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Check size={12} className="text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant={plan.highlight ? "default" : "outline"}
                      className="w-full mt-1"
                      disabled={isCurrent || checkoutMutation.isPending}
                      onClick={() => {
                        if (plan.key === "enterprise") {
                          window.open("mailto:ventas@logipro.app");
                        } else {
                          // Go to landing pricing section first, then checkout
                          window.location.href = `/landing#pricing`;
                        }
                      }}
                    >
                      {isCurrent ? (
                        "Plan actual"
                      ) : checkoutMutation.isPending ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : plan.key === "enterprise" ? (
                        "Contactar"
                      ) : (
                        <>
                          Suscribirse
                          <ArrowRight size={14} className="ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Customer portal promo (when active + has Stripe) */}
      {isActive && hasStripe && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-slate-500 shrink-0" />
                <div>
                  <p className="font-medium text-slate-700 text-sm">Portal de facturación Stripe</p>
                  <p className="text-xs text-slate-500">
                    Ver facturas, cambiar tarjeta, cancelar suscripción o actualizar datos fiscales.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="shrink-0"
              >
                {portalMutation.isPending ? (
                  <RefreshCw size={14} className="animate-spin mr-1" />
                ) : (
                  <ExternalLink size={14} className="mr-1" />
                )}
                Abrir portal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link to public pricing */}
      <p className="text-center text-sm text-slate-400">
        ¿Quieres comparar todos los planes?{" "}
        <button
          className="text-blue-600 hover:underline"
          onClick={() => navigate("/pricing")}
        >
          Ver página de precios
        </button>
      </p>
    </div>
  );
}

// Missing import for Check used inside component
function Check({ size, className }: { size: number; className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
