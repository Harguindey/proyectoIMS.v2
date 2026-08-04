import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useDeviceDetection } from '@/hooks/use-device-detection';
import { useSwipeGestures, usePullToRefresh } from '@/hooks/use-swipe-gestures';
import { invalidateRelatedQueries } from '@/lib/queryClient';
import { Loader2, RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePageWrapperProps {
  children: React.ReactNode;
  enableSwipeNavigation?: boolean;
  enablePullToRefresh?: boolean;
  refreshKeys?: string[];
  className?: string;
}

// Orden de páginas para navegación por swipe
const pageOrder = [
  '/',           // Dashboard
  '/products',   // Productos
  '/movements',  // Movimientos
  '/orders',     // Pedidos
  '/warehouse-map', // Mapa almacén
  '/suppliers',  // Proveedores
  '/customers',  // Clientes
];

export default function MobilePageWrapper({
  children,
  enableSwipeNavigation = true,
  enablePullToRefresh = true,
  refreshKeys = ['dashboard'],
  className,
}: MobilePageWrapperProps) {
  const { isMobile, isTouch } = useDeviceDetection();
  const [location, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Pull-to-refresh functionality
  const handleRefresh = async () => {
    if (refreshKeys.length > 0) {
      for (const key of refreshKeys) {
        await invalidateRelatedQueries(key);
      }
    }
  };

  const { ref: pullToRefreshRef, isRefreshing, pullDistance } = usePullToRefresh<HTMLDivElement>({
    onRefresh: handleRefresh,
    threshold: 80,
    maxDistance: 120,
  });

  // Swipe navigation
  const handleSwipeNavigation = (direction: 'left' | 'right') => {
    if (!enableSwipeNavigation || isTransitioning) return;
    
    const currentIndex = pageOrder.indexOf(location);
    if (currentIndex === -1) return;

    let targetIndex: number;
    if (direction === 'left') {
      // Swipe left - página siguiente
      targetIndex = currentIndex + 1;
    } else {
      // Swipe right - página anterior  
      targetIndex = currentIndex - 1;
    }

    // Verificar bounds
    if (targetIndex < 0 || targetIndex >= pageOrder.length) return;

    const targetPage = pageOrder[targetIndex];
    
    // Animación de transición
    setIsTransitioning(true);
    
    // Feedback háptico más fuerte para navegación
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 20]);
    }

    // Navegar con delay para mostrar animación
    setTimeout(() => {
      setLocation(targetPage);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 100);
  };

  const swipeRef = useSwipeGestures<HTMLDivElement>({
    threshold: 80,
    velocityThreshold: 0.4,
    onSwipeLeft: () => handleSwipeNavigation('left'),
    onSwipeRight: () => handleSwipeNavigation('right'),
  });

  // Solo aplicar en dispositivos móviles táctiles
  if (!isMobile || !isTouch) {
    return <div className={className}>{children}</div>;
  }

  // Calcular indicador de pull-to-refresh
  const pullProgress = Math.min(pullDistance / 80, 1);
  const showPullIndicator = pullDistance > 10;

  return (
    <div 
      ref={swipeRef}
      className={cn(
        'relative min-h-screen transition-transform duration-200',
        isTransitioning && 'scale-98 opacity-90',
        className
      )}
    >
      {/* Pull-to-refresh indicator */}
      {enablePullToRefresh && showPullIndicator && (
        <div 
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center bg-blue-50 border-b border-blue-100 transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance, 80)}px`,
            opacity: pullProgress,
          }}
        >
          <div className="flex items-center space-x-2 text-blue-600">
            {isRefreshing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">Actualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw 
                  size={20} 
                  className={cn(
                    'transition-transform duration-200',
                    pullProgress >= 1 && 'rotate-180'
                  )}
                />
                <span className="text-sm font-medium">
                  {pullProgress >= 1 ? 'Soltar para actualizar' : 'Deslizar para actualizar'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contenido principal con ref para pull-to-refresh */}
      <div 
        ref={pullToRefreshRef}
        className={cn(
          'transition-transform duration-200',
          showPullIndicator && `translate-y-[${Math.min(pullDistance, 80)}px]`,
          isRefreshing && 'translate-y-[80px]'
        )}
        style={{
          transform: showPullIndicator || isRefreshing 
            ? `translateY(${Math.min(pullDistance, 80)}px)`
            : 'translateY(0px)'
        }}
      >
        {children}
      </div>

      {/* Swipe navigation hints */}
      {enableSwipeNavigation && !isTransitioning && (
        <>
          {/* Indicador izquierdo - página anterior */}
          {pageOrder.indexOf(location) > 0 && (
            <div className="fixed left-2 top-1/2 -translate-y-1/2 pointer-events-none z-30">
              <div className="bg-black/20 text-white px-2 py-1 rounded-full text-xs opacity-0 animate-pulse">
                ←
              </div>
            </div>
          )}
          
          {/* Indicador derecho - página siguiente */}
          {pageOrder.indexOf(location) < pageOrder.length - 1 && (
            <div className="fixed right-2 top-1/2 -translate-y-1/2 pointer-events-none z-30">
              <div className="bg-black/20 text-white px-2 py-1 rounded-full text-xs opacity-0 animate-pulse">
                →
              </div>
            </div>
          )}
        </>
      )}

      {/* Overlay durante transición */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/10 z-20 pointer-events-none" />
      )}
    </div>
  );
}