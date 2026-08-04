import { useState, useEffect, createContext, useContext } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ScreenSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DeviceInfo {
  deviceType: DeviceType;
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

const DeviceContext = createContext<DeviceInfo | null>(null);

export function useDeviceDetection(): DeviceInfo {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDeviceDetection debe ser usado dentro de DeviceProvider');
  }
  return context;
}

function getDeviceType(width: number): DeviceType {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getScreenSize(width: number): ScreenSize {
  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  if (width < 1280) return 'xl';
  return '2xl';
}

function getOrientation(width: number, height: number): 'portrait' | 'landscape' {
  return width > height ? 'landscape' : 'portrait';
}

function isTouch(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = getDeviceType(width);
    
    return {
      deviceType,
      screenSize: getScreenSize(width),
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isTouch: isTouch(),
      screenWidth: width,
      screenHeight: height,
      orientation: getOrientation(width, height),
    };
  });

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const deviceType = getDeviceType(width);
      
      setDeviceInfo({
        deviceType,
        screenSize: getScreenSize(width),
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        isTouch: isTouch(),
        screenWidth: width,
        screenHeight: height,
        orientation: getOrientation(width, height),
      });
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Detectar cambios en el estado táctil (aunque es raro que cambie)
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    mediaQuery.addEventListener('change', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      mediaQuery.removeEventListener('change', handleResize);
    };
  }, []);

  return (
    <DeviceContext.Provider value={deviceInfo}>
      {children}
    </DeviceContext.Provider>
  );
}

// Hook adicional para detectar breakpoints específicos
export function useBreakpoint(breakpoint: ScreenSize): boolean {
  const { screenSize } = useDeviceDetection();
  
  const breakpointOrder = ['sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(screenSize);
  const targetIndex = breakpointOrder.indexOf(breakpoint);
  
  return currentIndex >= targetIndex;
}

// Hook para detectar si estamos en modo landscape/portrait
export function useOrientation(): 'portrait' | 'landscape' {
  const { orientation } = useDeviceDetection();
  return orientation;
}

// Hook para detectar si la pantalla es pequeña
export function useIsMobile(): boolean {
  const { isMobile } = useDeviceDetection();
  return isMobile;
}