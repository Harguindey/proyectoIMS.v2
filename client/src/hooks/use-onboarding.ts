import {
  createContext,
  createElement,
  useContext,
  useState,
  type ReactNode,
} from "react";

const ONBOARDING_STORAGE_KEY = "logipro-onboarding-completed";

function readSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    // localStorage no disponible (modo privado, bloqueado…): tratamos como "visto"
    // para no arriesgar mostrar el tour en bucle.
    return true;
  }
}

function persistSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch {
    /* no-op */
  }
}

interface OnboardingContextValue {
  /** El tour está abierto ahora mismo */
  showTour: boolean;
  /** Abre el tour manualmente (botón "ver tutorial"). Siempre lo muestra. */
  startTour: () => void;
  /** Cierra el tour y lo marca como visto para que no vuelva a salir solo. */
  closeTour: () => void;
  /** Muestra el tour SOLO si el usuario no lo ha visto nunca. */
  maybeAutoStart: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Provider único de estado del tour de onboarding.
 * Un solo estado compartido por toda la app, de forma que el auto-arranque
 * y los botones "ver tutorial" (sidebar, menú) controlen el mismo tour.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [showTour, setShowTour] = useState(false);

  const startTour = () => setShowTour(true);

  const closeTour = () => {
    persistSeen();
    setShowTour(false);
  };

  const maybeAutoStart = () => {
    if (!readSeen()) setShowTour(true);
  };

  return createElement(
    OnboardingContext.Provider,
    { value: { showTour, startTour, closeTour, maybeAutoStart } },
    children,
  );
}

/**
 * Acceso al estado del tour. Fuera del provider devuelve no-ops para
 * evitar que un componente reviente si se usa sin envolver.
 */
export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    return {
      showTour: false,
      startTour: () => {},
      closeTour: () => {},
      maybeAutoStart: () => {},
    };
  }
  return ctx;
}
