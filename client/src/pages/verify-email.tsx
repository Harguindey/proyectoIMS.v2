import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error" | "expired";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No se encontró el token de verificación en la URL.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message ?? "Email verificado correctamente.");
        } else if (data.message?.includes("caducado")) {
          setStatus("expired");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.message ?? "Token inválido.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Error de conexión. Inténtalo de nuevo.");
      });
  }, []);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (res.ok) {
        setResent(true);
      }
    } catch { /* ignore */ }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-md w-full p-10 text-center">
        {/* Logo */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-4 py-2 rounded-xl font-bold text-lg mb-8">
          ⚡ LogiPro
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="w-14 h-14 text-blue-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Verificando tu email…</h1>
            <p className="text-slate-500 text-sm">Un momento, por favor.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">¡Email verificado!</h1>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <Button
              className="bg-gradient-to-r from-blue-600 to-violet-600 text-white w-full"
              onClick={() => { window.location.href = "/"; }}
            >
              Ir a mi empresa →
            </Button>
          </>
        )}

        {(status === "error" || status === "expired") && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              {status === "expired" ? "Enlace caducado" : "Enlace inválido"}
            </h1>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            {!resent ? (
              <Button
                variant="outline"
                className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={handleResend}
                disabled={resending}
              >
                {resending
                  ? <><Loader2 size={14} className="animate-spin mr-2" />Enviando…</>
                  : <><Mail size={14} className="mr-2" />Reenviar email de verificación</>
                }
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle2 size={16} />
                Revisa tu bandeja de entrada
              </div>
            )}
            <p className="text-xs text-slate-400 mt-4">
              ¿Sigues teniendo problemas?{" "}
              <a href="mailto:soporte@logipro.app" className="text-blue-500 hover:underline">
                Contacta con soporte
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
