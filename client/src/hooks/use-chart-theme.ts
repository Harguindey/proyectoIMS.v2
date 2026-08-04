import { useState, useEffect } from "react";
import { CHART_THEMES, type ChartTheme } from "@/components/chart-theme-selector";

const THEME_STORAGE_KEY = "stockpro-chart-theme";

export function useChartTheme() {
  const [currentTheme, setCurrentTheme] = useState<ChartTheme>(CHART_THEMES[0]);

  useEffect(() => {
    // Load saved theme from localStorage
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedThemeId) {
      const savedTheme = CHART_THEMES.find(theme => theme.id === savedThemeId);
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    }
  }, []);

  const changeTheme = (theme: ChartTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  };

  return {
    currentTheme,
    changeTheme,
    colors: currentTheme.colors,
  };
}