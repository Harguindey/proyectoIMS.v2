import { useState, useEffect, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CUSTOM_SENTINEL = "__custom__";

interface Option {
  value: string;
  label: string;
}

interface SelectWithCustomProps {
  /** Lista de opciones predefinidas */
  options: Option[];
  /** Valor actual (cadena libre o uno de los values de options) */
  value?: string;
  /** Callback cuando cambia el valor */
  onValueChange: (value: string) => void;
  /** Texto placeholder del trigger */
  placeholder?: string;
  /** Texto de la opción "Personalizado" al final */
  customLabel?: string;
  /** Placeholder del input cuando se escribe custom */
  customPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Un Select normal más una opción "Personalizado…" al final.
 * Al elegirla aparece un input inline para escribir el valor propio.
 * Si el value inicial no está entre las opciones se muestra en modo custom.
 */
export function SelectWithCustom({
  options,
  value = "",
  onValueChange,
  placeholder = "Selecciona una opción…",
  customLabel = "Otro (personalizado)…",
  customPlaceholder = "Escribe tu opción",
  className,
  disabled,
}: SelectWithCustomProps) {
  const isKnown = options.some((o) => o.value === value);
  const [mode, setMode] = useState<"select" | "custom">(
    value && !isKnown ? "custom" : "select"
  );
  const [draft, setDraft] = useState(value && !isKnown ? value : "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Si el valor externo cambia a uno conocido, vuelve a modo select
  useEffect(() => {
    if (options.some((o) => o.value === value)) {
      setMode("select");
    }
  }, [value, options]);

  // Foco automático al entrar en modo custom
  useEffect(() => {
    if (mode === "custom") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mode]);

  const handleSelectChange = (v: string) => {
    if (v === CUSTOM_SENTINEL) {
      setMode("custom");
      setDraft("");
    } else {
      onValueChange(v);
    }
  };

  const confirmCustom = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onValueChange(trimmed);
    } else {
      // Si vacío, vuelve a select sin cambiar nada
      setMode("select");
    }
  };

  const cancelCustom = () => {
    setMode("select");
    setDraft("");
    // Si ya había un valor conocido, lo mantenemos; si no, limpiamos
    if (!isKnown) onValueChange("");
  };

  if (mode === "custom") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="relative flex-1">
          <Pencil
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none"
          />
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); confirmCustom(); }
              if (e.key === "Escape") cancelCustom();
            }}
            placeholder={customPlaceholder}
            className="pl-7 pr-2 h-10 border-violet-300 focus-visible:ring-violet-400 text-sm"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={confirmCustom}
          disabled={!draft.trim()}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          title="Confirmar"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={cancelCustom}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
          title="Cancelar"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Resolve display label — value might be a custom string not in options
  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption ? value : value || undefined;

  return (
    <Select
      value={displayValue}
      onValueChange={handleSelectChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-10", className)}>
        <SelectValue placeholder={placeholder}>
          {/* Show raw string for custom values not in list */}
          {!selectedOption && value ? (
            <span className="flex items-center gap-1.5">
              <Pencil size={11} className="text-violet-500 shrink-0" />
              {value}
            </span>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
        {/* Divider */}
        <div className="mx-2 my-1 border-t border-slate-100" />
        <SelectItem value={CUSTOM_SENTINEL}>
          <span className="flex items-center gap-1.5 text-violet-600 font-medium">
            <Pencil size={12} />
            {customLabel}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
