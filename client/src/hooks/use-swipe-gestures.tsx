import { useState, useEffect, useRef, RefObject } from 'react';

export interface SwipeGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  direction: 'left' | 'right' | 'up' | 'down' | 'none';
  distance: number;
  velocity: number;
  isSwipe: boolean;
}

interface SwipeOptions {
  threshold?: number;
  velocityThreshold?: number;
  preventScroll?: boolean;
  onSwipeLeft?: (gesture: SwipeGesture) => void;
  onSwipeRight?: (gesture: SwipeGesture) => void;
  onSwipeUp?: (gesture: SwipeGesture) => void;
  onSwipeDown?: (gesture: SwipeGesture) => void;
  onSwipe?: (gesture: SwipeGesture) => void;
}

export function useSwipeGestures<T extends HTMLElement>(
  options: SwipeOptions = {}
): RefObject<T> {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
  } = options;

  const elementRef = useRef<T>(null);
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
    time: number;
  } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      });

      if (preventScroll) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const deltaX = endX - touchStart.x;
      const deltaY = endY - touchStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const timeDelta = Date.now() - touchStart.time;
      const velocity = distance / timeDelta;

      // Determinar dirección principal
      let direction: SwipeGesture['direction'] = 'none';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      const isSwipe = distance >= threshold && velocity >= velocityThreshold;

      const gesture: SwipeGesture = {
        startX: touchStart.x,
        startY: touchStart.y,
        endX,
        endY,
        deltaX,
        deltaY,
        direction,
        distance,
        velocity,
        isSwipe,
      };

      if (isSwipe) {
        // Llamar callback general
        onSwipe?.(gesture);

        // Llamar callback específico por dirección
        switch (direction) {
          case 'left':
            onSwipeLeft?.(gesture);
            break;
          case 'right':
            onSwipeRight?.(gesture);
            break;
          case 'up':
            onSwipeUp?.(gesture);
            break;
          case 'down':
            onSwipeDown?.(gesture);
            break;
        }

        // Feedback háptico si está disponible
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }

      setTouchStart(null);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, threshold, velocityThreshold, preventScroll, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipe]);

  return elementRef;
}

// Hook para pull-to-refresh
interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxDistance?: number;
}

export function usePullToRefresh<T extends HTMLElement>(
  options: PullToRefreshOptions
): {
  ref: RefObject<T>;
  isRefreshing: boolean;
  pullDistance: number;
} {
  const { onRefresh, threshold = 80, maxDistance = 120 } = options;
  const elementRef = useRef<T>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState<number | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Solo activar si estamos en el tope de la página
      if (element.scrollTop === 0) {
        const touch = e.touches[0];
        setStartY(touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === null || isRefreshing) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;

      if (deltaY > 0 && element.scrollTop === 0) {
        e.preventDefault();
        const distance = Math.min(deltaY, maxDistance);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (startY === null || isRefreshing) return;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        
        // Feedback háptico
        if ('vibrate' in navigator) {
          navigator.vibrate([20, 10, 20]);
        }

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }

      setStartY(null);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, pullDistance, threshold, maxDistance, onRefresh, isRefreshing]);

  return {
    ref: elementRef,
    isRefreshing,
    pullDistance,
  };
}