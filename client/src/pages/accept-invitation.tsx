import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Zap, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

type InvitationInfo = {
  valid: boolean;
  email: string;
  organizationName: string;
  roleId: number | null;
};

export default function AcceptInvitationPage() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Validate token on mount
  useEffect(() => {
    if (!token) { setLoadError("Token de invitación no encontrado."); setLoading(false); return; }
    fetch(`/api/invitations/accept?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) setInfo(data);
        else setLoadError(data.message ?? "Invitación inválida.");
      })
      .catch(() => setLoadError("Error al validar la invitación."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setSubmitError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await apiRequest("POST", "/api/invitations/accept", {
        token, firstName, lastName, password,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error");
      setSuccess(true);
      setTimeout(() => { window.location.href = "/"; }, 2500);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
          <Zap size={17} className="text-white" />
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">LogiPro</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm text-slate-500">Validando invitación…</p>
          </div>
        )}

        {/* Error validating */}
        {!loading && loadError && (
          <div className="flex flex-col items-center py-6 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={26} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Invitación no válida</h2>
              <p className="text-sm text-slate-500">{loadError}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/"} className="mt-2">
              Ir al inicio
            </Button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex flex-col items-center py-6 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={26} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">¡Cuenta creada!</h2>
              <p className="text-sm text-slate-500">Accediendo a tu empresa…</p>
            </div>
          </div>
        )}

        {/* Form */}
        {!loading && !loadError && !success && info && (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Únete a {info.organizationName}</h1>
              <p className="text-sm text-slate-500">
                Has sido invitado a <strong>{info.organizationName}</strong>.<br />
                Crea tu contraseña para empezar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <Label className="text-sm font-medium text-slate-700">Email</Label>
                <Input value={info.email} readOnly className="mt-1 bg-slate-50 text-slate-500" />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Nombre</Label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Ana"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Apellidos</Label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="García"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <Label className="text-sm font-medium text-slate-700">Contraseña</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={15} className="shrink-0" />
                  {submitError}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold py-2.5"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin mr-2" />Creando cuenta…</>
                ) : (
                  "Crear cuenta y acceder →"
                )}
              </Button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        LogiPro ERP · WMS · SaaS · Hecho en España
      </p>
    </div>
  );
}
