import { useState, useEffect } from "react";
import {
  Zap, Rocket, Building2, Check, ArrowRight, Menu, X,
  Package, BarChart3, ShoppingCart, Truck, FileText,
  Users, Shield, Globe, ChevronDown,
  Star, CheckCircle2, TrendingUp, Clock, Database,
  Cpu, BarChart2,
} from "lucide-react";

// ── Utility ───────────────────────────────────────────────────────────────────
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const go = (path: string) => { window.location.href = path; };

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled
          ? "bg-[#08090a]/90 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">LogiPro</span>
          <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400 bg-blue-500/10 ml-1">
            ERP · WMS · SaaS
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          {["#features", "#how", "#pricing", "#faq"].map((href, i) => (
            <a key={href} href={href} className="hover:text-white transition-colors duration-200">
              {["Funcionalidades", "Cómo funciona", "Precios", "FAQ"][i]}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => go("/login")}
            className="text-sm text-slate-300 hover:text-white px-4 py-2 transition-colors"
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => go("/signup")}
            className="text-sm bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-5 py-2 rounded-full font-medium transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
          >
            Prueba gratis
          </button>
        </div>

        <button className="md:hidden p-2 text-slate-400" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0d0e10]/95 backdrop-blur-xl border-t border-white/5 px-6 py-5 space-y-4 text-sm">
          {[["#features","Funcionalidades"],["#how","Cómo funciona"],["#pricing","Precios"],["#faq","FAQ"]].map(([h,l]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="block text-slate-400 hover:text-white py-1">{l}</a>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-white/5">
            <button onClick={() => go("/login")} className="text-slate-300 py-2 text-left">Iniciar sesión</button>
            <button onClick={() => go("/signup")} className="bg-gradient-to-r from-blue-600 to-violet-600 text-white py-2 rounded-full text-center font-medium">Prueba gratis 14 días</button>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function FloatingCard({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div
      style={style}
      className={cn(
        "absolute bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl",
        "animate-float",
        className
      )}
    >
      {children}
    </div>
  );
}

function Hero() {
  const go = (path: string) => { window.location.href = path; };
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#08090a] pt-16">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[100px] animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-900/20 blur-[150px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating 3D cards */}
      <div className="absolute inset-0 hidden lg:block pointer-events-none">
        <FloatingCard className="top-32 left-[8%] w-52" style={{ animationDelay: "0s" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <span className="text-xs text-white/60">Ventas hoy</span>
          </div>
          <p className="text-2xl font-bold text-white">€12,480</p>
          <p className="text-xs text-green-400 mt-1">↑ 23% vs ayer</p>
        </FloatingCard>

        <FloatingCard className="top-44 right-[7%] w-56" style={{ animationDelay: "0.5s" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Package size={14} className="text-blue-400" />
            </div>
            <span className="text-xs text-white/60">Stock en tiempo real</span>
          </div>
          <div className="space-y-1.5">
            {[["Producto A", 85],["Producto B", 62],["Producto C", 91]].map(([n,v]) => (
              <div key={n as string} className="flex items-center gap-2">
                <span className="text-xs text-white/50 w-20">{n}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${v}%` }} />
                </div>
                <span className="text-xs text-white/50">{v}%</span>
              </div>
            ))}
          </div>
        </FloatingCard>

        <FloatingCard className="bottom-32 left-[10%] w-48" style={{ animationDelay: "1s" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-violet-400" />
            </div>
            <span className="text-xs text-white/60">Pedidos pendientes</span>
          </div>
          <p className="text-2xl font-bold text-white">34</p>
          <div className="flex gap-1 mt-2">
            {["En tránsito","Listos"].map((l, i) => (
              <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full ${i===0?"bg-orange-500/20 text-orange-400":"bg-green-500/20 text-green-400"}`}>{l}</span>
            ))}
          </div>
        </FloatingCard>

        <FloatingCard className="bottom-40 right-[9%] w-52" style={{ animationDelay: "1.5s" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Cpu size={14} className="text-amber-400" />
            </div>
            <span className="text-xs text-white/60">IA Predictiva</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            "Reponer <span className="text-blue-400 font-medium">SKU-2041</span> en 3 días. Rotación alta detectada."
          </p>
        </FloatingCard>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
          El ERP que{" "}
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            transforma
          </span>
          <br />tu operativa
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Inventario, almacén, ventas, logística y facturación en una sola plataforma.
          Cumplimiento fiscal español integrado. Listo en minutos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => go("/signup")}
            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-8 py-4 rounded-full font-semibold text-base transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
          >
            Empezar gratis ahora
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#features"
            className="flex items-center gap-2 text-slate-300 hover:text-white px-6 py-4 rounded-full border border-white/10 hover:border-white/20 transition-all text-base hover:bg-white/5"
          >
            Ver funcionalidades
          </a>
        </div>

        {/* Trust logos placeholder */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 text-xs uppercase tracking-widest">
          <span>Stripe</span>
          <span className="w-px h-3 bg-slate-700" />
          <span>Verifactu</span>
          <span className="w-px h-3 bg-slate-700" />
          <span>SII AEAT</span>
          <span className="w-px h-3 bg-slate-700" />
          <span>RGPD</span>
          <span className="w-px h-3 bg-slate-700" />
          <span>PostgreSQL</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
        <span className="text-xs tracking-widest uppercase">Descubrir</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Package,   color: "from-blue-500 to-cyan-500",    title: "Gestión de Inventario",   desc: "Stock en tiempo real, zonas, movimientos, alertas y trazabilidad por lote y serie." },
  { Icon: ShoppingCart, color: "from-green-500 to-emerald-500", title: "Punto de Venta (TPV)", desc: "Caja táctil, métodos de pago, tickets legales y cierre diario con informes." },
  { Icon: Truck,     color: "from-orange-500 to-amber-500", title: "SGA — Almacén",          desc: "Recepción, ubicaciones, picking optimizado, expedición y control de devoluciones." },
  { Icon: FileText,  color: "from-purple-500 to-violet-500",title: "ERP Facturación",        desc: "Facturas PDF legales, SII (AEAT) y Verifactu para cumplimiento fiscal en España." },
  { Icon: Users,     color: "from-pink-500 to-rose-500",    title: "CRM y Clientes",         desc: "Ficha completa, historial, pipeline de oportunidades y segmentación avanzada." },
  { Icon: BarChart3, color: "from-indigo-500 to-blue-500",  title: "IA Predictiva",          desc: "Forecasting de demanda, rotación de stock y sugerencias de compra automatizadas." },
  { Icon: Globe,     color: "from-teal-500 to-cyan-500",    title: "Logística",              desc: "Agencias de transporte, tracking en vivo, rutas y gestión de incidencias." },
  { Icon: Shield,    color: "from-slate-500 to-gray-500",   title: "Multi-empresa y RBAC",   desc: "Espacios aislados por empresa, roles granulares y permisos por módulo y acción." },
];

function Features() {
  return (
    <section id="features" className="py-32 bg-[#0a0b0d] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-xs uppercase tracking-[4px] text-blue-400 font-medium">Funcionalidades</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-5 tracking-tight">
            Todo en un solo sistema
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Cada módulo diseñado para el flujo operativo real de tu empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ Icon, color, title, desc }, i) => (
            <div
              key={title}
              className="group relative bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-1 cursor-default"
            >
              {/* Gradient glow on hover */}
              <div className={cn("absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10 bg-gradient-to-br", color)} style={{ opacity: 0 }} />

              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br shadow-lg", color)}>
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-white mb-2 text-[15px]">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  const items = [
    { value: "500+",    label: "Empresas activas",       Icon: Building2, gradient: "from-blue-500 to-cyan-500",   shadow: "shadow-blue-500/40"   },
    { value: "2M+",     label: "Movimientos gestionados", Icon: Database,  gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/40" },
    { value: "99.9%",   label: "Uptime garantizado",      Icon: Clock,     gradient: "from-emerald-500 to-teal-500",  shadow: "shadow-emerald-500/40"},
    { value: "< 5min",  label: "Para estar operativo",    Icon: Zap,       gradient: "from-amber-500 to-orange-500",  shadow: "shadow-amber-500/40"  },
  ];
  return (
    <section className="py-16 bg-[#08090a] border-y border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map(({ value, label, Icon, gradient, shadow }) => (
          <div key={label} className="flex flex-col items-center text-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              gradient, shadow
            )}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-3xl sm:text-4xl font-black text-white leading-none">{value}</p>
            <p className="text-sm text-slate-500 leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
const STEPS = [
  { n: "01", title: "Crea tu empresa", desc: "Regístrate con email. Configura tu empresa, moneda y país en 2 minutos. Sin instalaciones.", Icon: Zap },
  { n: "02", title: "Importa tus datos", desc: "Sube productos, clientes y proveedores desde Excel. O usa los datos de ejemplo para explorar.", Icon: Database },
  { n: "03", title: "Invita a tu equipo", desc: "Añade usuarios con roles predefinidos: admin, supervisor, operador. Cada uno ve lo que necesita.", Icon: Users },
  { n: "04", title: "Opera en tiempo real", desc: "Gestiona stock, ventas, logística y facturación desde el navegador. En cualquier dispositivo.", Icon: BarChart2 },
];

function HowItWorks() {
  return (
    <section id="how" className="py-32 bg-[#08090a] relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-xs uppercase tracking-[4px] text-violet-400 font-medium">Cómo funciona</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-5 tracking-tight">
            Operativo en un día
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-lg">Sin consultores, sin semanas de implementación.</p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-blue-600/0 via-blue-600/50 to-blue-600/0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(({ n, title, desc, Icon }, i) => (
              <div key={n} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/10 flex flex-col items-center justify-center gap-1 shadow-xl">
                    <Icon size={22} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-slate-500">{n}</span>
                  </div>
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 blur-lg -z-10" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: "starter", Icon: Zap, name: "Starter", monthly: 29, yearly: 290,
    desc: "Para pequeñas empresas que empiezan a digitalizar.",
    features: ["3 usuarios", "1 almacén", "Inventario + TPV + Compras", "Exportación Excel/PDF", "Soporte por email"],
    cta: "Empezar gratis",
    gradient: "from-slate-800 to-slate-900",
    border: "border-white/10",
  },
  {
    key: "pro", Icon: Rocket, name: "Pro", monthly: 79, yearly: 790,
    desc: "ERP completo para empresas en crecimiento.",
    features: ["10 usuarios", "3 almacenes", "Todo de Starter", "SGA + ERP completo", "SII / Verifactu", "IA predictiva", "API + webhooks", "Soporte prioritario"],
    cta: "Empezar gratis",
    highlight: true,
    badge: "Más popular",
    gradient: "from-blue-900 to-violet-900",
    border: "border-blue-500/50",
  },
  {
    key: "enterprise", Icon: Building2, name: "Enterprise", monthly: 199, yearly: 1990,
    desc: "Para grandes organizaciones con máxima potencia.",
    features: ["Usuarios ilimitados", "Almacenes ilimitados", "Todo de Pro", "SSO / SAML", "Multi-empresa", "SLA 99.9%", "Soporte dedicado"],
    cta: "Contactar ventas",
    gradient: "from-slate-800 to-slate-900",
    border: "border-white/10",
  },
];

function Pricing() {
  const go = (path: string) => { window.location.href = path; };
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-32 bg-[#0a0b0d] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-[4px] text-green-400 font-medium">Precios</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-5 tracking-tight">
            Precios transparentes
          </h2>
          <p className="text-slate-400 mb-8 text-lg">14 días gratis · Sin tarjeta · Sin permanencia</p>

          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1 gap-1">
            {["Mensual","Anual"].map((l, i) => (
              <button
                key={l}
                onClick={() => setYearly(i === 1)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  (i === 1) === yearly
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {l}
                {i === 1 && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">-17%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {PLANS.map((plan, idx) => {
            const Icon = plan.Icon;
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.key}
                className={cn(
                  "relative rounded-3xl border p-8 flex flex-col bg-gradient-to-b transition-transform duration-300 hover:-translate-y-2",
                  plan.gradient, plan.border,
                  plan.highlight ? "shadow-2xl shadow-blue-500/20 scale-105" : ""
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {plan.highlight && (
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-500/5 to-violet-500/5 pointer-events-none" />
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", plan.highlight ? "from-blue-500 to-violet-500 shadow-blue-500/30" : "from-slate-600 to-slate-700")}>
                    <Icon size={19} className="text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                </div>

                <p className="text-sm text-slate-400 mb-6">{plan.desc}</p>

                <div className="mb-7">
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-black text-white">{price}</span>
                    <span className="text-slate-400 mb-1.5">€/{yearly?"año":"mes"}</span>
                  </div>
                  {yearly && <p className="text-xs text-slate-500 mt-1">{Math.round(price/12)}€/mes · facturado anualmente</p>}
                </div>

                <button
                  onClick={() => plan.key === "enterprise" ? window.location.href = "mailto:ventas@logipro.app" : go("/signup")}
                  className={cn(
                    "w-full py-3 rounded-2xl font-semibold text-sm mb-7 transition-all duration-200 hover:scale-[1.02]",
                    plan.highlight
                      ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                      : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                  )}
                >
                  {plan.cta} {plan.key !== "enterprise" && "→"}
                </button>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", plan.highlight ? "bg-blue-500/20" : "bg-white/10")}>
                        <Check size={10} className={plan.highlight ? "text-blue-400" : "text-slate-400"} />
                      </div>
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-600 mt-10">
          Precios sin IVA · Facturación en EUR · Pago seguro vía Stripe
        </p>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Carlos M.", role: "Director de Operaciones", company: "Distribuciones Iberia", text: "Pasamos de hojas de cálculo caóticas a tener el stock controlado en tiempo real. La migración fue en un día y el equipo lo adoptó sin formación.", stars: 5 },
  { name: "Laura P.", role: "Responsable de Almacén", company: "TechParts SL", text: "El módulo SGA nos ahorró contratar a un operario extra. Las rutas de picking optimizadas cambiaron completamente nuestra operativa.", stars: 5 },
  { name: "Javier R.", role: "CEO", company: "Grupo Ferretería Norte", text: "Por fin un ERP que no necesita meses de consultoría. Lo montamos solos en una semana. El soporte en español es excelente.", stars: 5 },
];

function Testimonials() {
  return (
    <section className="py-28 bg-[#08090a]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-[4px] text-yellow-400 font-medium">Testimonios</span>
          <h2 className="text-4xl font-black text-white mt-3 tracking-tight">Lo que dicen nuestros clientes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ name, role, company, text, stars }) => (
            <div key={name} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-7 hover:border-white/15 transition-colors">
              <div className="flex mb-4">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  {name[0]}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{name}</p>
                  <p className="text-slate-500 text-xs">{role} · {company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "¿Necesito tarjeta de crédito para empezar?", a: "No. Los 14 días de prueba son completamente gratuitos y sin compromiso alguno." },
  { q: "¿Funciona para cualquier sector?", a: "Sí. Distribución, fabricación, retail, ferretería, alimentación y cualquier empresa con inventario físico." },
  { q: "¿Cumplo con la normativa fiscal española?", a: "Absolutamente. Facturas PDF legales, XML para SII (AEAT) y XML Verifactu. Actualización continua." },
  { q: "¿Puedo importar mis datos actuales?", a: "Sí. Importación desde Excel/CSV para productos, clientes, proveedores y stock. También API REST." },
  { q: "¿Qué pasa si cancelo?", a: "Exportas todos tus datos en cualquier momento antes de cancelar. Sin permanencia ni penalizaciones." },
  { q: "¿Tienen soporte en español?", a: "Todo el soporte es en español: email en todos los planes, prioritario en Pro y teléfono en Enterprise." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="py-28 bg-[#0a0b0d]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-[4px] text-slate-400 font-medium">FAQ</span>
          <h2 className="text-4xl font-black text-white mt-3 tracking-tight">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02] hover:border-white/[0.12] transition-colors">
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between text-white font-medium hover:bg-white/[0.03] transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="pr-4">{q}</span>
                <div className={cn("w-6 h-6 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform", open===i?"rotate-180":"")}>
                  <ChevronDown size={13} className="text-slate-400" />
                </div>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/[0.07] pt-4">
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Final ─────────────────────────────────────────────────────────────────
function CTAFinal() {
  const go = (path: string) => { window.location.href = path; };
  return (
    <section className="py-32 bg-[#08090a] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-violet-950/30 to-[#08090a]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-green-300 text-sm mb-8">
          <CheckCircle2 size={14} />
          Más de 500 empresas ya confían en LogiPro
        </div>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">
          Empieza a controlar tu
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent"> negocio hoy</span>
        </h2>
        <p className="text-slate-400 text-lg mb-10">
          14 días gratis, sin tarjeta de crédito. Configura tu empresa en menos de 5 minutos.
        </p>
        <button
          onClick={() => go("/signup")}
          className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-10 py-4 rounded-full font-bold text-base transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
        >
          Crear mi cuenta gratis
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="mt-5 text-sm text-slate-600">Sin tarjeta · Sin permanencia · Datos en Europa</p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#05060a] border-t border-white/5 py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Zap size={15} className="text-white" />
              </div>
              <span className="font-bold text-white text-lg">LogiPro</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              ERP · WMS · SaaS para empresas con inventario físico. Hecho en España. Datos en la UE.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-10 text-sm">
            {[
              { title: "Producto", links: [["#features","Funcionalidades"],["#pricing","Precios"],["#faq","FAQ"]] },
              { title: "Empresa", links: [["mailto:hola@logipro.app","Contacto"],["mailto:ventas@logipro.app","Ventas"]] },
              { title: "Legal", links: [["#","Privacidad"],["#","Términos"],["#","RGPD"]] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="font-semibold text-white mb-4">{title}</p>
                <ul className="space-y-2.5">
                  {links.map(([href, label]) => (
                    <li key={label}><a href={href} className="text-slate-500 hover:text-white transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} LogiPro. Todos los derechos reservados.</p>
          <p>Hecho con ❤️ en España · Alojado en la UE</p>
        </div>
      </div>
    </footer>
  );
}

// ── CSS animations (injected once) ────────────────────────────────────────────
const STYLES = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-12px) rotate(0.5deg); }
    66% { transform: translateY(-6px) rotate(-0.5deg); }
  }
  @keyframes pulse-slow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }
  .animate-float { animation: float 7s ease-in-out infinite; }
  .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
`;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen font-sans">
        <Nav />
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTAFinal />
        <Footer />
      </div>
    </>
  );
}
