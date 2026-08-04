import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";

export interface ChartTheme {
  id: string;
  name: string;
  colors: string[];
  description: string;
}

export const CHART_THEMES: ChartTheme[] = [
  {
    id: "default",
    name: "Predeterminado",
    description: "Tema clásico y profesional",
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']
  },
  {
    id: "ocean",
    name: "Océano",
    description: "Tonos azules y verdes",
    colors: ['#1E40AF', '#0891B2', '#059669', '#065F46', '#1E3A8A', '#0C4A6E', '#164E63', '#155E75']
  },
  {
    id: "sunset",
    name: "Atardecer",
    description: "Colores cálidos y vibrantes",
    colors: ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#E11D48', '#BE185D', '#A21CAF', '#7C2D12']
  },
  {
    id: "forest",
    name: "Bosque",
    description: "Verdes naturales y tierra",
    colors: ['#15803D', '#166534', '#365314', '#422006', '#84CC16', '#65A30D', '#4D7C0F', '#3F6212']
  },
  {
    id: "monochrome",
    name: "Monocromático",
    description: "Escala de grises elegante",
    colors: ['#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#1F2937', '#111827', '#030712']
  },
  {
    id: "vibrant",
    name: "Vibrante",
    description: "Colores brillantes y energéticos",
    colors: ['#EC4899', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#84CC16', '#F97316']
  },
  {
    id: "pastel",
    name: "Pastel",
    description: "Tonos suaves y relajantes",
    colors: ['#93C5FD', '#86EFAC', '#FDE68A', '#FCA5A5', '#C4B5FD', '#7DD3FC', '#BEF264', '#FDBA74']
  },
  {
    id: "corporate",
    name: "Corporativo",
    description: "Profesional y confiable",
    colors: ['#1E3A8A', '#1F2937', '#374151', '#0F766E', '#7C2D12', '#581C87', '#BE185D', '#166534']
  }
];

interface ChartThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (theme: ChartTheme) => void;
}

export default function ChartThemeSelector({ currentTheme, onThemeChange }: ChartThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedTheme = CHART_THEMES.find(theme => theme.id === currentTheme) || CHART_THEMES[0];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Palette size={16} />
          <span className="hidden sm:inline">Tema: {selectedTheme.name}</span>
          <span className="sm:hidden">Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="p-2">
          <h4 className="font-medium text-sm text-slate-900 mb-3">Seleccionar Tema de Colores</h4>
          <div className="space-y-2">
            {CHART_THEMES.map((theme) => (
              <DropdownMenuItem
                key={theme.id}
                className="flex items-start space-x-3 p-3 cursor-pointer"
                onClick={() => {
                  onThemeChange(theme);
                  setIsOpen(false);
                }}
              >
                <div className="flex-shrink-0">
                  <div className="flex space-x-1">
                    {theme.colors.slice(0, 5).map((color, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 rounded-full border border-slate-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{theme.name}</p>
                    {currentTheme === theme.id && (
                      <Check size={14} className="text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{theme.description}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}