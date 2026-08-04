import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import DotField from "@/components/DotField";

// SVG icons for Google and Microsoft
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M13 1h10v10H13z"/>
      <path fill="#7fba00" d="M1 13h10v10H1z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Show error from OAuth redirect (e.g. ?error=google)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError === "google") setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
    if (oauthError === "microsoft") setError("No se pudo iniciar sesión con Microsoft. Inténtalo de nuevo.");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Error iniciando sesión");
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020817] flex items-center justify-center px-4">
      {/* Fondo animado */}
      <div className="absolute inset-0 z-0">
        <DotField
          dotRadius={2}
          dotSpacing={18}
          cursorRadius={420}
          cursorForce={0.1}
          bulgeOnly={true}
          bulgeStrength={70}
          glowRadius={180}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="rgba(59, 130, 246, 0.45)"
          gradientTo="rgba(147, 197, 253, 0.22)"
          glowColor="#1d4ed8"
        />
      </div>

      {/* Capa oscura para legibilidad */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950/65 via-slate-950/65 to-blue-950/40" />

      {/* Card login */}
      <div className="relative z-20 w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/30">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 shadow-lg">
            <Package className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">IMS Services</h1>

          <p className="text-sm text-slate-500 mt-1">
            Acceso al sistema de gestión
          </p>
        </div>

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>

            <input
              autoComplete="off"
              name="ims_login_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>

            <input
              autoComplete="new-password"
              name="ims_login_password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              required
            />
          </div>

          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm hover:shadow-md"
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Separador */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 whitespace-nowrap">o continúa con</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Social login buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <GoogleIcon />
            Google
          </a>
          <a
            href="/api/auth/microsoft"
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <MicrosoftIcon />
            Microsoft
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Sin cuenta?{" "}
          <a href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
            Regístrate gratis
          </a>
        </p>
      </div>
    </div>
  );
}