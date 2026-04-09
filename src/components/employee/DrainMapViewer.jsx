import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Droplet } from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageProxy";

export default function DrainMapViewer({ facilityMaps, drainLocations, selectedDrainIds }) {
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const lastTouchDistRef = useRef(null);
  const lastTouchCenterRef = useRef(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  const defaultMap = facilityMaps?.find(m => m.is_default) || facilityMaps?.[0];

  // Keep refs in sync with state
  useEffect(() => { positionRef.current = mapPosition; }, [mapPosition]);
  useEffect(() => { zoomRef.current = mapZoom; }, [mapZoom]);

  if (!defaultMap?.image_url) {
    return (
      <div className="p-4 bg-white border-t border-cyan-200">
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No facility map available</p>
        </div>
      </div>
    );
  }

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setMapPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setMapZoom(1);
    setMapPosition({ x: 0, y: 0 });
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (mapZoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setMapPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers with pinch-to-zoom
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
      // Pinch start
      e.preventDefault();
      lastTouchDistRef.current = getTouchDistance(e.touches);
      lastTouchCenterRef.current = getTouchCenter(e.touches);
    } else if (e.touches.length === 1 && zoomRef.current > 1) {
      // Single finger drag (only when zoomed)
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - positionRef.current.x,
        y: e.touches[0].clientY - positionRef.current.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const newDist = getTouchDistance(e.touches);
      const newCenter = getTouchCenter(e.touches);

      if (lastTouchDistRef.current) {
        const scale = newDist / lastTouchDistRef.current;
        const newZoom = Math.min(Math.max(zoomRef.current * scale, 1), 4);
        
        // Pan while pinching
        if (lastTouchCenterRef.current) {
          const dx = newCenter.x - lastTouchCenterRef.current.x;
          const dy = newCenter.y - lastTouchCenterRef.current.y;
          setMapPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        }

        setMapZoom(newZoom);
        if (newZoom <= 1) {
          setMapPosition({ x: 0, y: 0 });
        }
      }

      lastTouchDistRef.current = newDist;
      lastTouchCenterRef.current = newCenter;
    } else if (e.touches.length === 1 && isDragging) {
      // Single finger pan
      setMapPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      lastTouchDistRef.current = null;
      lastTouchCenterRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  const selectedDrains = drainLocations.filter(d => 
    selectedDrainIds.includes(d.id) && d.marker_x != null && d.marker_y != null
  );

  return (
    <div className="p-4 bg-white border-t border-cyan-200">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={mapZoom <= 1}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-slate-600 min-w-[60px] text-center">{Math.round(mapZoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={mapZoom >= 4}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        {mapZoom > 1 && (
          <Button variant="outline" size="sm" onClick={handleResetZoom}>
            <Maximize2 className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
        <span className="text-xs text-slate-500 ml-auto">Pinch to zoom</span>
      </div>

      <div 
        ref={containerRef}
        className={`relative border rounded-lg overflow-hidden ${mapZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${mapZoom}) translate(${mapPosition.x / mapZoom}px, ${mapPosition.y / mapZoom}px)`,
            transformOrigin: 'top left',
            transition: isDragging || lastTouchDistRef.current ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          <img 
            src={getProxiedImageUrl(defaultMap?.image_url)} 
            alt="Facility Map" 
            className="w-full h-auto select-none"
            draggable={false}
          />
          {/* Render drain markers */}
          {selectedDrains.map(drain => (
            <div
              key={drain.id}
              className="absolute z-10"
              style={{ 
                left: `${drain.marker_x}%`, 
                top: `${drain.marker_y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="w-8 h-8 rounded-full bg-cyan-600 border-4 border-white flex items-center justify-center text-white shadow-lg animate-pulse">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-0.5 bg-cyan-600 text-white text-xs rounded-full whitespace-nowrap font-semibold shadow-md">
                {drain.drain_id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}