import { useState } from "react";
import { Package, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Dev only: show reset link in UI
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error procesando solicitud");
        return;
      }

      // Dev mode: backend returns the reset URL directly
      if (data.resetUrl) setResetUrl(data.resetUrl);
      setSent(true);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/30">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 shadow-lg">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <Mail className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">
                Si existe una cuenta con ese email, recibirás instrucciones en breve.
              </p>
            </div>

            {/* Dev mode helper */}
            {resetUrl && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs break-all">
                <p className="font-semibold text-amber-800 mb-1">⚠️ Modo desarrollo — enlace de reset:</p>
                <a href={resetUrl} className="text-blue-600 underline">{resetUrl}</a>
              </div>
            )}

            <a
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email de tu cuenta
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <a
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al login
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
