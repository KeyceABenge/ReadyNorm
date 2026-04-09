/**
 * Pull to Refresh Component
 * Enables pull-to-refresh functionality for mobile devices
 */

import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PullToRefresh({ 
  onRefresh, 
  children,
  threshold = 80,
  className 
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    // Apply resistance
    const resistance = 0.5;
    const adjustedDistance = Math.min(distance * resistance, threshold * 1.5);
    
    if (adjustedDistance > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(adjustedDistance);
      e.preventDefault();
    }
  }, [isPulling, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex items-center justify-center z-10 transition-transform"
        style={{ 
          transform: `translateY(${pullDistance - 60}px)`,
          opacity: progress
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center",
          isRefreshing && "animate-spin"
        )}>
          <RefreshCw 
            className={cn(
              "w-5 h-5 text-slate-600 transition-transform",
              !isRefreshing && `rotate-[${progress * 360}deg]`
            )} 
          />
        </div>
      </div>
      
      {/* Content with pull offset */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease'
        }}
      >
        {children}
      </div>
    </div>
  );
}