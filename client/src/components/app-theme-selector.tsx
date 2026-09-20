import { Check } from "lucide-react";
import { APP_THEMES, type AppThemePreset } from "@/lib/theme";

interface AppThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (id: string) => void;
}

function Preview({ theme }: { theme: AppThemePreset }) {
  const [primary, , , side] = theme.swatches;
  const dark = theme.kind === "dark";
  const page = dark ? "#0b1220" : "#f4f8f7";
  const line = dark ? "#1e2a44" : "#e2e8f0";
  const line2 = dark ? "#16203a" : "#eef2f6";
  return (
    <div
      className="flex gap-1.5 h-[52px] rounded-lg overflow-hidden mb-2.5"
      style={{ background: page }}
    >
      <div className="w-[22px]" style={{ background: side }} />
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        <div className="h-[11px] w-[58%] rounded" style={{ background: primary }} />
        <div className="h-[7px] w-[80%] rounded" style={{ background: line }} />
        <div className="h-[7px] w-[55%] rounded" style={{ background: line2 }} />
      </div>
    </div>
  );
}

export default function AppThemeSelector({ currentTheme, onThemeChange }: AppThemeSelectorProps) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
      {APP_THEMES.map((theme) => {
        const selected = theme.id === currentTheme;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onThemeChange(theme.id)}
            data-testid={`theme-${theme.id}`}
            className={`relative text-left rounded-xl p-3 transition-colors ${
              selected ? "border-2 border-primary p-[11px]" : "border border-border hover:border-primary/50"
            }`}
          >
            {selected && (
              <span className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Check size={12} />
              </span>
            )}
            <Preview theme={theme} />
            <div className="flex items-center gap-2 text-sm font-medium">
              {theme.name}
              {theme.kind === "dark" && (
                <span className="text-xs font-normal text-slate-500">· oscuro</span>
              )}
            </div>
            <div className="flex gap-1 mt-2">
              {theme.swatches.map((c, i) => (
                <span key={i} className="w-3.5 h-3.5 rounded" style={{ background: c }} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
