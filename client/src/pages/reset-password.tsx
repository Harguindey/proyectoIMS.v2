import { useState, useEffect } from "react";
import { Package, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Extract token from URL query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token no encontrado. Solicita un nuevo enlace.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error restableciendo contraseña");
        return;
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => { window.location.href = "/login"; }, 3000);
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
          <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">Introduce tu nueva contraseña</p>
        </div>

        {!token && !success && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Enlace inválido</p>
              <p className="text-xs text-red-600 mt-1">
                Este enlace no es válido o ha expirado.{" "}
                <a href="/forgot-password" className="underline">Solicita uno nuevo</a>.
              </p>
            </div>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">
                ¡Contraseña actualizada correctamente!
              </p>
              <p className="text-xs text-green-600 mt-1">
                Redirigiendo al login en 3 segundos…
              </p>
            </div>
            <a
              href="/login"
              className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ir al login ahora
            </a>
          </div>
        ) : token ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? "Guardando..." : "Establecer nueva contraseña"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
