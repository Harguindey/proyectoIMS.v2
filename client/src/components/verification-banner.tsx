import { useState } from "react";
import { Mail, X, Loader2, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function VerificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: authData } = useQuery<{ emailVerified?: boolean; email?: string }>({
    queryKey: ["/api/auth/user"],
  });

  // Only show when logged in and email not verified
  const show =
    !dismissed &&
    authData &&
    authData.emailVerified === false;

  const resend = async () => {
    setSending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } catch { /* ignore */ }
    setSending(false);
  };

  if (!show) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3 text-sm">
      <Mail size={15} className="text-amber-600 shrink-0" />
      <span className="text-amber-800 flex-1">
        <strong>Confirma tu email</strong> — Hemos enviado un enlace de verificación a{" "}
        <span className="font-mono">{authData?.email}</span>. Revisa tu bandeja de entrada.
      </span>
      {sent ? (
        <span className="flex items-center gap-1 text-green-700 font-medium text-xs shrink-0">
          <CheckCircle2 size={13} /> Reenviado
        </span>
      ) : (
        <button
          onClick={resend}
          disabled={sending}
          className="text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors shrink-0 disabled:opacity-60"
        >
          {sending ? <Loader2 size={13} className="animate-spin inline" /> : "Reenviar"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-700 transition-colors shrink-0 ml-1"
        title="Cerrar"
      >
        <X size={15} />
      </button>
    </div>
  );
}
