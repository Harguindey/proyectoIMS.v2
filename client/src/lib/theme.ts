// Sistema de paletas de la aplicación.
// Cada preset se define como un juego de variables CSS en index.css bajo
// :root[data-theme="<id>"]. Aquí solo vive la metadata (para el selector) y
// la lógica de aplicar/guardar el tema.

export type ThemeKind = "light" | "dark";

export interface AppThemePreset {
  id: string;
  name: string;
  kind: ThemeKind;
  /** 4 muestras de color para la vista previa del selector */
  swatches: string[];
}

export interface CustomTheme {
  primary?: string; // hex, p. ej. "#0d9488"
  accent?: string;
}

// Fase 1: 3 paletas claras. Las oscuras (fase 2) y "custom" (fase 3) se
// añadirán a esta lista; el resto del sistema ya las soporta.
export const APP_THEMES: AppThemePreset[] = [
  { id: "teal", name: "Teal logístico", kind: "light", swatches: ["#0d9488", "#059669", "#0891b2", "#edf5f3"] },
  { id: "indigo", name: "Índigo moderno", kind: "light", swatches: ["#4f46e5", "#7c3aed", "#2563eb", "#ffffff"] },
  { id: "warm", name: "Cálido editorial", kind: "light", swatches: ["#ea580c", "#d97706", "#9a3412", "#f5f4f1"] },
  { id: "midnight", name: "Midnight", kind: "dark", swatches: ["#3b82f6", "#22d3ee", "#1b263f", "#0d1526"] },
  { id: "carbon", name: "Carbón teal", kind: "dark", swatches: ["#14b8a6", "#22d3ee", "#132530", "#0b1a20"] },
  { id: "graphite", name: "Grafito violeta", kind: "dark", swatches: ["#7c6cf0", "#c084fc", "#1c1830", "#120f20"] },
];

export const DEFAULT_THEME = "teal";
const STORAGE_KEY = "logipro-theme";
const CUSTOM_KEY = "logipro-theme-custom";

export function isDarkTheme(id: string): boolean {
  return APP_THEMES.find((t) => t.id === id)?.kind === "dark";
}

export function getStoredTheme(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function getStoredCustom(): CustomTheme | null {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as CustomTheme) : null;
  } catch {
    return null;
  }
}

/**
 * Aplica una paleta a la raíz del documento y la cachea en localStorage
 * (para pintar al instante en la siguiente carga, antes de que responda el backend).
 */
export function applyTheme(id: string, custom?: CustomTheme | null): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", id);
  if (isDarkTheme(id)) root.classList.add("dark");
  else root.classList.remove("dark");

  // El tema personalizado inyecta el color de acento directamente como variable.
  if (id === "custom" && custom) {
    if (custom.primary) {
      root.style.setProperty("--primary", custom.primary);
      root.style.setProperty("--ring", custom.primary);
    }
    if (custom.accent) root.style.setProperty("--accent", custom.accent);
  } else {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--accent");
  }

  try {
    localStorage.setItem(STORAGE_KEY, id);
    if (custom) localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  } catch {
    /* no-op */
  }
}

/** Guarda la elección en la cuenta del usuario (backend). */
export async function saveThemeToAccount(id: string, custom?: CustomTheme | null): Promise<void> {
  try {
    await fetch("/api/me/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ theme: id, custom: custom ?? null }),
    });
  } catch {
    /* si falla, la paleta ya está aplicada y cacheada localmente */
  }
}
