import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Zap, Building2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    icon: Zap,
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: "Para pequeñas empresas que empiezan a digitalizar su inventario.",
    features: [
      "Hasta 3 usuarios",
      "1 almacén",
      "Gestión de inventario completa",
      "Punto de venta (TPV)",
      "Proveedores y compras",
      "Clientes y pedidos",
      "Exportación Excel / PDF",
      "Soporte por email",
    ],
    cta: "Empezar prueba gratis",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    icon: Rocket,
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: "Para empresas en crecimiento con necesidades avanzadas de ERP.",
    features: [
      "Hasta 10 usuarios",
      "3 almacenes",
      "Todo lo de Starter",
      "Módulo SGA completo",
      "Rutas y planificación logística",
      "SII / Verifactu (España)",
      "Análisis predictivo con IA",
      "API REST + webhooks",
      "Soporte prioritario",
    ],
    cta: "Empezar prueba gratis",
    highlight: true,
    badge: "Más popular",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    icon: Building2,
    monthlyPrice: 199,
    yearlyPrice: 1990,
    description: "Para grandes organizaciones que necesitan máxima potencia y soporte.",
    features: [
      "Usuarios ilimitados",
      "Almacenes ilimitados",
      "Todo lo de Pro",
      "SSO / SAML",
      "Roles y permisos personalizados",
      "Multi-empresa / multi-país",
      "Onboarding dedicado",
      "SLA 99.9% garantizado",
      "Soporte telefónico dedicado",
    ],
    cta: "Contactar ventas",
    highlight: false,
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [, navigate] = useLocation();

  const handleCta = (planKey: string) => {
    if (planKey === "enterprise") {
      window.location.href = "mailto:ventas@logipro.app?subject=Enterprise%20Plan";
      return;
    }
    // Go to signup — billing upgrade happens post-registration
    navigate("/signup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">LogiPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Iniciar sesión
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>
              Prueba gratis 14 días
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
          14 días de prueba gratuita · Sin tarjeta de crédito
        </Badge>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Precios simples y transparentes
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8">
          Elige el plan que mejor se adapte a tu empresa. Cambia o cancela en cualquier momento.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3">
          <Label className={!yearly ? "font-semibold text-slate-800" : "text-slate-400"}>
            Mensual
          </Label>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <Label className={yearly ? "font-semibold text-slate-800" : "text-slate-400"}>
            Anual
            <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100 text-xs">
              2 meses gratis
            </Badge>
          </Label>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const period = yearly ? "año" : "mes";

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  plan.highlight
                    ? "border-blue-500 shadow-xl shadow-blue-100 bg-white ring-2 ring-blue-500"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white hover:bg-blue-600 px-4">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlight ? "bg-blue-600" : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={plan.highlight ? "text-white" : "text-slate-600"}
                    />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{plan.name}</h2>
                </div>

                <p className="text-sm text-slate-500 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    {price}€
                  </span>
                  <span className="text-slate-400 ml-1">/{period}</span>
                  {yearly && (
                    <p className="text-xs text-slate-400 mt-1">
                      {Math.round(price / 12)}€/mes · facturado anualmente
                    </p>
                  )}
                </div>

                <Button
                  className={`w-full mb-8 ${plan.highlight ? "" : "variant-outline"}`}
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handleCta(plan.key)}
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        size={16}
                        className={`mt-0.5 shrink-0 ${
                          plan.highlight ? "text-blue-600" : "text-green-600"
                        }`}
                      />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ / Trust */}
      <section className="bg-slate-50 border-t py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
            Preguntas frecuentes
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "¿Necesito tarjeta de crédito para la prueba?",
                a: "No. Los 14 días de prueba son completamente gratuitos y sin compromisos. Solo pedimos tu email.",
              },
              {
                q: "¿Puedo cambiar de plan más adelante?",
                a: "Sí, puedes subir o bajar de plan en cualquier momento desde tu panel de facturación. El cambio se aplica de forma inmediata.",
              },
              {
                q: "¿Qué pasa si cancelo?",
                a: "Puedes cancelar cuando quieras. Seguirás teniendo acceso hasta el final de tu período de facturación y podrás exportar todos tus datos.",
              },
              {
                q: "¿Los precios incluyen IVA?",
                a: "Los precios mostrados no incluyen IVA. Se aplicará el IVA correspondiente según tu país en el momento del pago.",
              },
              {
                q: "¿Hay descuentos para organizaciones sin ánimo de lucro?",
                a: "Sí, contacta con nuestro equipo de ventas y estudiaremos tu caso.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-2">{q}</h3>
                <p className="text-sm text-slate-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} LogiPro · ERP &amp; WMS SaaS ·{" "}
        <a href="mailto:hola@logipro.app" className="hover:text-slate-600 underline">
          hola@logipro.app
        </a>
      </footer>
    </div>
  );
}
