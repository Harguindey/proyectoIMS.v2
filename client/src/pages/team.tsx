import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus, Trash2, Mail, Clock, CheckCircle2, RefreshCw, Copy, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SelectWithCustom } from "@/components/ui/select-with-custom";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Invitation {
  id: number;
  email: string;
  roleId: number | null;
  token: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysLeft(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}


const ROLE_OPTIONS = [
  { value: "1", label: "Administrador" },
  { value: "2", label: "Supervisor" },
  { value: "3", label: "Operador" },
  { value: "4", label: "Lector" },
];

// ── Invite Dialog ─────────────────────────────────────────────────────────────
function InviteDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("3");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invitations", { email, roleId: parseInt(roleId) });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message ?? "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitación enviada", description: `Se envió un email de invitación a ${email}.` });
      setEmail("");
      setOpen(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-90">
          <UserPlus size={16} className="mr-2" />
          Invitar usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a un nuevo usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ana@empresa.com"
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <Label>Rol</Label>
            <SelectWithCustom
              options={ROLE_OPTIONS}
              value={roleId}
              onValueChange={setRoleId}
              placeholder="Selecciona un rol…"
              customPlaceholder="Ej: Analista de datos"
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">
              El usuario recibirá un email con instrucciones para crear su cuenta.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !email}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {mutation.isPending ? <RefreshCw size={14} className="animate-spin mr-1" /> : <Mail size={14} className="mr-1" />}
              Enviar invitación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: invitations = [], isLoading, refetch } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/invitations/${id}`);
      if (!res.ok) throw new Error("Error al revocar");
    },
    onSuccess: () => {
      toast({ title: "Invitación revocada" });
      qc.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Enlace copiado al portapapeles" });
  };

  const pending = invitations.filter(i => !i.acceptedAt && new Date(i.expiresAt) > new Date());
  const accepted = invitations.filter(i => !!i.acceptedAt);
  const expired = invitations.filter(i => !i.acceptedAt && new Date(i.expiresAt) <= new Date());

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Invita y gestiona los miembros de tu organización.</p>
        </div>
        <InviteDialog onSuccess={() => refetch()} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pendientes", count: pending.length, color: "text-blue-600 bg-blue-50", Icon: Clock },
          { label: "Aceptadas", count: accepted.length, color: "text-green-600 bg-green-50", Icon: CheckCircle2 },
          { label: "Caducadas", count: expired.length, color: "text-slate-500 bg-slate-100", Icon: Mail },
        ].map(({ label, count, color, Icon }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={16} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{count}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Invitation list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={22} className="animate-spin text-slate-400" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Users size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aún no hay invitaciones</p>
          <p className="text-sm text-slate-400 mt-1">Usa el botón "Invitar usuario" para añadir miembros a tu equipo.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Expira</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv, i) => {
                const isAccepted = !!inv.acceptedAt;
                const isExpired = !isAccepted && new Date(inv.expiresAt) <= new Date();
                const days = daysLeft(inv.expiresAt);
                return (
                  <tr key={inv.id} className={`border-t border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{inv.email}</td>
                    <td className="px-4 py-3.5">
                      {isAccepted ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          <CheckCircle2 size={11} className="mr-1" />Aceptada
                        </Badge>
                      ) : isExpired ? (
                        <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">Expirada</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          <Clock size={11} className="mr-1" />Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {isAccepted
                        ? <span className="text-slate-400">—</span>
                        : isExpired
                          ? <span className="text-red-400">Expirada</span>
                          : <span>{days}d restante{days !== 1 ? "s" : ""}</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isAccepted && !isExpired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-slate-400 hover:text-slate-700"
                            onClick={() => copyLink(inv.token)}
                            title="Copiar enlace"
                          >
                            <Copy size={13} />
                          </Button>
                        )}
                        {!isAccepted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-slate-400 hover:text-red-600"
                            onClick={() => deleteMutation.mutate(inv.id)}
                            disabled={deleteMutation.isPending}
                            title="Revocar"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
