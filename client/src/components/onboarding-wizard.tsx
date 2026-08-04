import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Layers, UserPlus, Package, CheckCircle2,
  ChevronRight, ChevronLeft, Zap, Globe, Factory,
  Loader2, X, Mail, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WizardData {
  orgName: string;
  industry: string;
  country: string;
  currency: string;
  inviteEmails: string[];
}

interface Props {
  open: boolean;
  onComplete: () => void;
  initialOrgName?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { value: "retail", label: "Retail / Comercio" },
  { value: "manufacturing", label: "Manufactura" },
  { value: "logistics", label: "Logística / Distribución" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "wholesale", label: "Mayorista" },
  { value: "automotive", label: "Automoción" },
  { value: "electronics", label: "Electrónica" },
  { value: "food", label: "Alimentación" },
  { value: "pharma", label: "Farmacéutica" },
  { value: "construction", label: "Construcción" },
  { value: "other", label: "Otro" },
];

const COUNTRIES = [
  { value: "ES", label: "España" },
  { value: "MX", label: "México" },
  { value: "AR", label: "Argentina" },
  { value: "CO", label: "Colombia" },
  { value: "CL", label: "Chile" },
  { value: "PE", label: "Perú" },
  { value: "DE", label: "Alemania" },
  { value: "FR", label: "Francia" },
  { value: "GB", label: "Reino Unido" },
  { value: "US", label: "Estados Unidos" },
  { value: "PT", label: "Portugal" },
  { value: "IT", label: "Italia" },
];

const CURRENCIES = [
  { value: "EUR", label: "€ Euro (EUR)" },
  { value: "USD", label: "$ Dólar (USD)" },
  { value: "MXN", label: "$ Peso Mexicano (MXN)" },
  { value: "ARS", label: "$ Peso Argentino (ARS)" },
  { value: "COP", label: "$ Peso Colombiano (COP)" },
  { value: "CLP", label: "$ Peso Chileno (CLP)" },
  { value: "PEN", label: "S/ Sol Peruano (PEN)" },
  { value: "GBP", label: "£ Libra Esterlina (GBP)" },
  { value: "BRL", label: "R$ Real Brasileño (BRL)" },
];

// ── Step indicator ─────────────────────────────────────────────────────────────
const STEPS = [
  { icon: Building2, label: "Empresa" },
  { icon: Factory, label: "Sector" },
  { icon: UserPlus, label: "Equipo" },
  { icon: Package, label: "Productos" },
  { icon: CheckCircle2, label: "Listo" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = step.icon;
        return (
          <div key={i} className="flex items-center">
            <div className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
              ${done ? "bg-gradient-to-br from-blue-600 to-violet-600 shadow-md" :
                active ? "bg-gradient-to-br from-blue-600 to-violet-600 ring-4 ring-blue-200 shadow-lg" :
                "bg-slate-100"}
            `}>
              {done ? (
                <CheckCircle2 size={16} className="text-white" />
              ) : (
                <Icon size={15} className={active ? "text-white" : "text-slate-400"} />
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-10 h-0.5 transition-colors duration-300 ${done ? "bg-gradient-to-r from-blue-500 to-violet-500" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Company name ───────────────────────────────────────────────────────
function Step1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Building2 size={24} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Configura tu empresa</h2>
        <p className="text-slate-500 text-sm mt-1">Personaliza el nombre de tu organización en LogiPro.</p>
      </div>
      <div>
        <Label className="text-sm font-medium text-slate-700">Nombre de la empresa</Label>
        <Input
          value={data.orgName}
          onChange={e => onChange({ orgName: e.target.value })}
          placeholder="Ej: Distribuciones García S.L."
          className="mt-1.5 text-lg h-12"
          autoFocus
        />
        <p className="text-xs text-slate-400 mt-1.5">Aparecerá en facturas, reportes y emails a clientes.</p>
      </div>
    </div>
  );
}

// ── Step 2: Sector / type ──────────────────────────────────────────────────────
function Step2({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Factory size={24} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Tu sector y región</h2>
        <p className="text-slate-500 text-sm mt-1">Ajustamos LogiPro a tu industria y moneda local.</p>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">Sector / Industria</Label>
        <SelectWithCustom
          options={INDUSTRIES}
          value={data.industry}
          onValueChange={v => onChange({ industry: v })}
          placeholder="Selecciona tu sector…"
          customPlaceholder="Ej: Servicios veterinarios"
          className="mt-1.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium text-slate-700">País</Label>
          <Select value={data.country} onValueChange={v => onChange({ country: v })}>
            <SelectTrigger className="mt-1.5 h-11">
              <SelectValue placeholder="País…" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Moneda</Label>
          <Select value={data.currency} onValueChange={v => onChange({ currency: v })}>
            <SelectTrigger className="mt-1.5 h-11">
              <SelectValue placeholder="Moneda…" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Invite team ────────────────────────────────────────────────────────
function Step3({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const [input, setInput] = useState("");

  const addEmail = () => {
    const e = input.trim().toLowerCase();
    if (e && e.includes("@") && !data.inviteEmails.includes(e)) {
      onChange({ inviteEmails: [...data.inviteEmails, e] });
    }
    setInput("");
  };

  const removeEmail = (email: string) => {
    onChange({ inviteEmails: data.inviteEmails.filter(e => e !== email) });
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <UserPlus size={24} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Invita a tu equipo</h2>
        <p className="text-slate-500 text-sm mt-1">Opcional. Puedes invitar más tarde desde Configuración.</p>
      </div>

      <div className="flex gap-2">
        <Input
          type="email"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
          placeholder="correo@empresa.com"
          className="flex-1 h-10"
        />
        <Button
          type="button"
          onClick={addEmail}
          disabled={!input.includes("@")}
          className="bg-blue-600 text-white hover:bg-blue-700 px-3"
        >
          <Plus size={16} />
        </Button>
      </div>

      {data.inviteEmails.length > 0 ? (
        <div className="space-y-2 max-h-44 overflow-y-auto">
          {data.inviteEmails.map(email => (
            <div key={email} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <span className="text-sm text-slate-700">{email}</span>
              </div>
              <button
                onClick={() => removeEmail(email)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <Mail size={22} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Añade emails para invitar</p>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Import products (optional) ────────────────────────────────────────
function Step4() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Package size={24} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Importar productos</h2>
        <p className="text-slate-500 text-sm mt-1">Carga tu catálogo de productos desde Excel o CSV.</p>
      </div>

      <div
        onClick={() => window.location.href = "/data-import"}
        className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-50/80 rounded-2xl p-8 text-center cursor-pointer transition-all group"
      >
        <Package size={28} className="text-blue-400 group-hover:text-blue-600 mx-auto mb-3 transition-colors" />
        <p className="font-semibold text-slate-700 group-hover:text-slate-900">Ir a Importación de datos</p>
        <p className="text-sm text-slate-500 mt-1">Excel, CSV, JSON — múltiples formatos soportados</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-200">
        <p className="font-medium mb-1 text-slate-700">También puedes añadir productos manualmente</p>
        <p className="text-slate-500">Ve a <strong>Productos → Nuevo producto</strong> desde el menú lateral en cualquier momento.</p>
      </div>
    </div>
  );
}

// ── Step 5: Completion ─────────────────────────────────────────────────────────
function Step5({ orgName }: { orgName: string }) {
  return (
    <div className="text-center py-4">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-xl">
          <CheckCircle2 size={36} className="text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-md">
          <Zap size={12} className="text-yellow-900" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo, {orgName || "equipo"}!</h2>
      <p className="text-slate-500 mb-8">Tu espacio de trabajo está configurado y listo para usar.<br />Accede al dashboard para empezar.</p>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { emoji: "📦", label: "Inventario en tiempo real" },
          { emoji: "🚚", label: "Seguimiento de envíos" },
          { emoji: "📊", label: "Analítica avanzada" },
        ].map(item => (
          <div key={item.label} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-2xl mb-2">{item.emoji}</div>
            <p className="text-xs text-slate-600 font-medium">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────────
export default function OnboardingWizard({ open, onComplete, initialOrgName = "" }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    orgName: initialOrgName,
    industry: "",
    country: "ES",
    currency: "EUR",
    inviteEmails: [],
  });

  const update = (partial: Partial<WizardData>) => setData(prev => ({ ...prev, ...partial }));

  // Send invitations
  const sendInvitations = async (emails: string[]) => {
    const results = await Promise.allSettled(
      emails.map(email =>
        apiRequest("POST", "/api/invitations", { email, roleId: 3 })
      )
    );
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed > 0) {
      toast({ title: `${emails.length - failed}/${emails.length} invitaciones enviadas`, variant: "destructive" });
    }
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      // Send invitations in parallel
      if (data.inviteEmails.length > 0) {
        await sendInvitations(data.inviteEmails);
      }
      // Mark onboarding complete + update org
      const res = await apiRequest("POST", "/api/onboarding/complete", {
        orgName: data.orgName || undefined,
        industry: data.industry || undefined,
        country: data.country || undefined,
        currency: data.currency || undefined,
      });
      if (!res.ok) throw new Error("Error al guardar configuración");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setStep(4);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLastSetupStep = step === 3;
  const isDone = step === 4;

  const canNext = () => {
    if (step === 0) return data.orgName.trim().length >= 2;
    return true; // other steps optional
  };

  const handleNext = () => {
    if (isLastSetupStep) {
      completeMutation.mutate();
    } else if (isDone) {
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">LogiPro</span>
            </div>
            {isDone && (
              <button onClick={onComplete} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
          <StepIndicator current={step} />
        </div>

        {/* Content */}
        <div className="px-8 py-7">
          {step === 0 && <Step1 data={data} onChange={update} />}
          {step === 1 && <Step2 data={data} onChange={update} />}
          {step === 2 && <Step3 data={data} onChange={update} />}
          {step === 3 && <Step4 />}
          {step === 4 && <Step5 orgName={data.orgName} />}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between">
          {step > 0 && !isDone ? (
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              className="text-slate-500 hover:text-slate-700"
            >
              <ChevronLeft size={16} className="mr-1" />
              Atrás
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {/* Skip button for optional steps */}
            {(step === 2 || step === 3) && !isDone && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (isLastSetupStep) completeMutation.mutate();
                  else setStep(s => s + 1);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm"
                disabled={completeMutation.isPending}
              >
                Saltar
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={(!canNext() && !isDone) || completeMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-90 px-6"
            >
              {completeMutation.isPending ? (
                <><Loader2 size={15} className="animate-spin mr-2" />Guardando…</>
              ) : isDone ? (
                <>Ir al dashboard <Zap size={14} className="ml-1" /></>
              ) : isLastSetupStep ? (
                <>Finalizar <CheckCircle2 size={14} className="ml-1" /></>
              ) : (
                <>Siguiente <ChevronRight size={14} className="ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
