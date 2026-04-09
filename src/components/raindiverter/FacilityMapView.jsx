// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Droplets, Sun, AlertTriangle, CheckCircle2, Plus, 
  Upload, ZoomIn, ZoomOut, Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInHours } from "date-fns";
import { getProxiedImageUrl } from "@/lib/imageProxy";

export default function FacilityMapView({
  mapImageUrl,
  diverters = [],
  isManager = false,
  canUploadMap = false,
  onMarkerClick,
  onAddMarker,
  onUploadMap
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [addingMarker, setAddingMarker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const mapContainerRef = useRef(null);

  const clampPan = useCallback((newPan) => {
    // Allow free panning — no clamping so user can explore the full map
    return newPan;
  }, []);

  // Keep a ref of current pan so pointerDown captures the latest value
  const panRef = useRef(pan);
  panRef.current = pan;
  const isDraggingRef = useRef(false);

  // Mouse drag handlers
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return; // left click only
    if (addingMarker) {
      // In marker-adding mode, don't start drag — let click through
      hasDraggedRef.current = false;
      return;
    }
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [addingMarker]);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDraggedRef.current = true;
    setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y + dy });
  }, []);

  const handlePointerUp = useCallback((e) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    dragStartRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(_) {}
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(prev => {
      const next = Math.max(0.5, Math.min(3, prev + delta));
      return next;
    });
  }, [clampPan]);

  // Touch pinch-to-zoom
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDistRef.current) {
        const scale = dist / lastPinchDistRef.current;
        setZoom(prev => {
          const next = Math.max(0.5, Math.min(3, prev * scale));
          return next;
        });
      }
      lastPinchDistRef.current = dist;
    }
  }, [clampPan]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDistRef.current = null;
  }, []);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleWheel, handleTouchMove]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMapClick = (e) => {
    // Ignore if we were dragging
    if (hasDraggedRef.current) return;
    if (!addingMarker || !isManager) return;

    // Get the inner transformed div's bounding rect (accounts for zoom + pan)
    const innerEl = mapContainerRef.current?.querySelector('[data-map-inner]');
    if (!innerEl) return;
    const rect = innerEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onAddMarker?.({ x, y });
    setAddingMarker(false);
  };

  const getMarkerStatus = (diverter) => {
    if (diverter.eligible_for_removal) return "eligible";
    
    const isOverdue = !diverter.last_inspection_date ||
      differenceInHours(new Date(), new Date(diverter.last_inspection_date)) > 24;
    if (isOverdue) return "overdue";
    
    return diverter.last_finding || "unknown";
  };

  const markerStyles = {
    wet: { bg: "bg-amber-500", ring: "ring-amber-300", icon: Droplets },
    dry: { bg: "bg-emerald-500", ring: "ring-emerald-300", icon: Sun },
    overdue: { bg: "bg-rose-500", ring: "ring-rose-300", icon: AlertTriangle },
    eligible: { bg: "bg-purple-500", ring: "ring-purple-300", icon: CheckCircle2 },
    unknown: { bg: "bg-slate-400", ring: "ring-slate-300", icon: Droplets }
  };

  const activeDiverters = diverters.filter(d => d.status === "active" && d.marker_x != null && d.marker_y != null);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-500 w-16 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isManager && mapImageUrl && (
            <Button
              variant={addingMarker ? "default" : "outline"}
              size="sm"
              onClick={() => setAddingMarker(!addingMarker)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {addingMarker ? "Click map to place" : "Add Marker"}
            </Button>
          )}
          {canUploadMap && (
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Map
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadMap?.(file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Wet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Dry</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Ready to Remove</span>
        </div>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div 
          ref={mapContainerRef}
          className={cn(
            "relative overflow-hidden touch-none",
            addingMarker ? "cursor-crosshair" : isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ height: "70vh" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleMapClick}
        >
          {mapImageUrl && typeof mapImageUrl === 'string' && mapImageUrl.length > 0 ? (
            <div 
              data-map-inner
              className="relative select-none"
              style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.15s ease-out"
              }}
            >
              <img 
                src={getProxiedImageUrl(mapImageUrl)} 
                alt="Facility Map"
                className="w-full h-auto"
                draggable={false}
                onError={(e) => {
                  console.error("Failed to load facility map image:", mapImageUrl);
                  e.target.style.display = 'none';
                }}
              />
              
              {/* Markers */}
              {activeDiverters.map(diverter => {
                const status = getMarkerStatus(diverter);
                const style = markerStyles[status];
                const Icon = style.icon;

                return (
                  <button
                    key={diverter.id}
                    className={cn(
                      "absolute transform -translate-x-1/2 -translate-y-1/2",
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "ring-2 shadow-lg transition-transform hover:scale-110",
                      "text-white",
                      style.bg,
                      style.ring
                    )}
                    style={{
                      left: `${diverter.marker_x}%`,
                      top: `${diverter.marker_y}%`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasDraggedRef.current) return;
                      if (!addingMarker) onMarkerClick?.(diverter);
                    }}
                    title={`${diverter.diverter_id}: ${diverter.location_description}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Upload className="w-12 h-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">No Facility Map Uploaded</p>
              <p className="text-sm mb-4">Upload a floor plan or facility map to place rain diverter markers</p>
              {canUploadMap && (
                <label>
                  <Button asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Map Image
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadMap?.(file);
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Marker count */}
      <p className="text-sm text-slate-500">
        Showing {activeDiverters.length} active diverter{activeDiverters.length !== 1 ? "s" : ""} on map
      </p>
    </div>
  );
}