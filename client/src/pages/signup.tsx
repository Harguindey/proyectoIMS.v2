import { useState } from "react";
import { Package, Eye, EyeOff, Building2, Globe } from "lucide-react";

export default function SignupPage() {
  const [form, setForm] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "Spain",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          companyName: form.companyName,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          country: form.country,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Error creando la cuenta");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/30">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 shadow-lg">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">LogiPro ERP</h1>
          <p className="text-sm text-slate-500 mt-1">Crea tu cuenta gratuita · 14 días de prueba</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Building2 className="inline h-4 w-4 mr-1 text-slate-400" />
              Nombre de empresa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Distribuciones García S.L."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="Carlos"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="García López"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="carlos@empresa.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Globe className="inline h-4 w-4 mr-1 text-slate-400" />
              País
            </label>
            <select
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Spain">🇪🇸 España</option>
              <option value="Mexico">🇲🇽 México</option>
              <option value="Colombia">🇨🇴 Colombia</option>
              <option value="Argentina">🇦🇷 Argentina</option>
              <option value="Chile">🇨🇱 Chile</option>
              <option value="Peru">🇵🇪 Perú</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
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
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
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
            className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>

          <p className="text-xs text-center text-slate-400">
            Al registrarte aceptas los{" "}
            <a href="/terms" className="underline hover:text-slate-600">Términos de servicio</a>
            {" "}y la{" "}
            <a href="/privacy" className="underline hover:text-slate-600">Política de privacidad</a>.
          </p>
        </form>

        {/* Separador social */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 whitespace-nowrap">o regístrate con</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </a>
          <a
            href="/api/auth/microsoft"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#f25022" d="M1 1h10v10H1z"/>
              <path fill="#00a4ef" d="M13 1h10v10H13z"/>
              <path fill="#7fba00" d="M1 13h10v10H1z"/>
              <path fill="#ffb900" d="M13 13h10v10H13z"/>
            </svg>
            Microsoft
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}
