import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DrainMapViewerInline({ mapUrl, drains, completedDrainIds }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastTouchDistRef = useRef(null);
  const lastTouchCenterRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  });

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDistRef.current = getTouchDistance(e.touches);
      lastTouchCenterRef.current = getTouchCenter(e.touches);
    } else if (e.touches.length === 1 && zoomRef.current > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - posRef.current.x,
        y: e.touches[0].clientY - posRef.current.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const newDist = getTouchDistance(e.touches);
      const newCenter = getTouchCenter(e.touches);

      if (lastTouchDistRef.current) {
        const scale = newDist / lastTouchDistRef.current;
        const newZoom = Math.min(Math.max(zoomRef.current * scale, 1), 4);

        if (lastTouchCenterRef.current) {
          const dx = newCenter.x - lastTouchCenterRef.current.x;
          const dy = newCenter.y - lastTouchCenterRef.current.y;
          setPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        }

        setZoom(newZoom);
        if (newZoom <= 1) setPos({ x: 0, y: 0 });
      }

      lastTouchDistRef.current = newDist;
      lastTouchCenterRef.current = newCenter;
    } else if (e.touches.length === 1 && isDragging) {
      setPos({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      lastTouchDistRef.current = null;
      lastTouchCenterRef.current = null;
    }
    if (e.touches.length === 0) setIsDragging(false);
  };

  return (
    <Card className="p-3 mb-4">
      <div 
        className="relative border rounded-lg overflow-hidden"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
            transformOrigin: 'top left',
            transition: isDragging || lastTouchDistRef.current ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          <img src={mapUrl} alt="Facility Map" className="w-full h-auto select-none" draggable={false} />
          {drains.map((drain) => {
            if (drain.marker_x == null || drain.marker_y == null) return null;
            const isCompleted = completedDrainIds.includes(drain.id);
            return (
              <div
                key={drain.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${drain.marker_x}%`, top: `${drain.marker_y}%` }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow border-2",
                  isCompleted ? "bg-emerald-500 border-emerald-300" : "bg-cyan-600 border-cyan-300"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Droplet className="w-4 h-4" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {zoom > 1 && (
        <p className="text-xs text-slate-400 text-center mt-1">Pinch to zoom • Drag to pan</p>
      )}
    </Card>
  );
}