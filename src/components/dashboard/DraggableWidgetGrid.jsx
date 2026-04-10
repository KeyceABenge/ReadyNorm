/**
 * Draggable and Resizable Widget Grid
 * Uses @hello-pangea/dnd for drag-drop and corner-drag for resize
 */

// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "manager_dashboard_layout_v2";

// Widget size options (in grid columns out of 12)
const SIZE_OPTIONS = {
  small: 4,   // 1/3 width
  medium: 6,  // 1/2 width  
  large: 12,  // full width
};

// Default widget sizes
const DEFAULT_SIZES = {
  "health-score": "large",
  "narrative-preview": "large",
  "live-shift-progress": "small",
  "line-cleaning": "small",
  "ways-to-win": "small",
  "decision-intelligence": "large",
  "performance-scores": "large",
  "atp-module": "large",
  "stats-cards": "large",
  "sanitary-reports": "large",
  "employee-performance": "large",
  "todays-tasks": "large",
};

export function getLayoutConfig() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure we have valid structure
      return {
        order: parsed.order || [],
        sizes: { ...DEFAULT_SIZES, ...(parsed.sizes || {}) }
      };
    } catch {
      return { order: [], sizes: { ...DEFAULT_SIZES } };
    }
  }
  return { order: [], sizes: { ...DEFAULT_SIZES } };
}

export function saveLayoutConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Failed to save layout config:", e);
  }
}

function ResizeHandle({ onResize, position }) {
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startX.current = e.clientX;
    startWidth.current = e.target.closest('[data-widget-wrapper]')?.offsetWidth || 0;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX.current;
      const containerWidth = document.querySelector('[data-grid-container]')?.offsetWidth || window.innerWidth;
      const thirdWidth = containerWidth / 3;
      
      const newWidth = startWidth.current + (position === "right" ? deltaX : -deltaX);
      
      let newSize;
      if (newWidth < thirdWidth * 1.5) {
        newSize = "small";
      } else if (newWidth < thirdWidth * 2.5) {
        newSize = "medium";
      } else {
        newSize = "large";
      }
      
      onResize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onResize, position]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute w-4 h-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize",
        position === "right" ? "right-0 bottom-0" : "left-0 bottom-0"
      )}
    >
      <div className={cn(
        "absolute w-3 h-3 border-2 border-blue-500 bg-white rounded-sm shadow",
        position === "right" ? "right-1 bottom-1 border-t-0 border-l-0" : "left-1 bottom-1 border-t-0 border-r-0"
      )} />
    </div>
  );
}

export default function DraggableWidgetGrid({ 
  widgets, 
  children,
  onLayoutChange,
  onLongPress,
  externalLayout,  // when provided, overrides localStorage with Supabase-loaded config
}) {
  const [layout, setLayout] = useState(() => getLayoutConfig());

  // When the parent loads a saved layout from Supabase, apply it here and write-through to localStorage
  useEffect(() => {
    if (!externalLayout) return;
    const merged = {
      order: externalLayout.order || [],
      sizes: { ...DEFAULT_SIZES, ...(externalLayout.sizes || {}) },
    };
    setLayout(merged);
    saveLayoutConfig(merged);
  }, [externalLayout]);
  const widgetRefs = useRef({});
  const longPressTimerRef = useRef(null);

  const handleLongPressStart = (e) => {
    if (!onLongPress) return;
    longPressTimerRef.current = setTimeout(() => {
      onLongPress();
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Get ordered widget IDs
  const getOrderedWidgetIds = useCallback(() => {
    const childrenArray = Array.isArray(children) ? children : [children];
    const childIds = childrenArray
      .filter(Boolean)
      .map(child => child.props?.["data-widget-id"])
      .filter(Boolean);
    
    if (layout.order.length > 0) {
      const validOrder = layout.order.filter(id => childIds.includes(id));
      const newWidgets = childIds.filter(id => !validOrder.includes(id));
      return [...validOrder, ...newWidgets];
    }
    return childIds;
  }, [children, layout.order]);

  const orderedIds = getOrderedWidgetIds();

  // Get widget size
  const getWidgetSize = (widgetId) => {
    return layout.sizes?.[widgetId] || DEFAULT_SIZES[widgetId] || "large";
  };

  // Build rows for layout with smart auto-adjustment
  const buildRows = useCallback(() => {
    const rows = [];
    let currentRow = [];
    let currentRowWidth = 0;
    
    orderedIds.forEach((id, globalIndex) => {
      const size = getWidgetSize(id);
      const width = SIZE_OPTIONS[size];
      
      if (currentRowWidth + width > 12 && currentRow.length > 0) {
        rows.push([...currentRow]);
        currentRow = [];
        currentRowWidth = 0;
      }
      
      currentRow.push({ id, size, width, globalIndex });
      currentRowWidth += width;
      
      if (currentRowWidth >= 12) {
        rows.push([...currentRow]);
        currentRow = [];
        currentRowWidth = 0;
      }
    });
    
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    // Auto-adjust widths so each row fills 12 columns
    return rows.map(row => {
      const totalWidth = row.reduce((sum, item) => sum + item.width, 0);
      if (totalWidth < 12 && row.length > 0) {
        // Distribute remaining space evenly
        const remaining = 12 - totalWidth;
        const extraPerItem = Math.floor(remaining / row.length);
        const leftover = remaining % row.length;
        
        return row.map((item, idx) => ({
          ...item,
          adjustedWidth: item.width + extraPerItem + (idx < leftover ? 1 : 0)
        }));
      }
      return row.map(item => ({ ...item, adjustedWidth: item.width }));
    });
  }, [orderedIds, layout.sizes]);

  const rows = buildRows();

  // Handle drag end
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(orderedIds);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    const newLayout = { ...layout, order: items };
    setLayout(newLayout);
    saveLayoutConfig(newLayout);
    onLayoutChange?.(newLayout);
  };

  // Handle resize
  const handleResize = (widgetId, newSize) => {
    if (getWidgetSize(widgetId) === newSize) return;
    
    const newSizes = { ...layout.sizes, [widgetId]: newSize };
    const newLayout = { ...layout, sizes: newSizes };
    setLayout(newLayout);
    saveLayoutConfig(newLayout);
    onLayoutChange?.(newLayout);
  };

  // Build widget map from children
  const widgetMap = {};
  const childrenArray = Array.isArray(children) ? children : [children];
  childrenArray.filter(Boolean).forEach(child => {
    const id = child.props?.["data-widget-id"];
    if (id) widgetMap[id] = child;
  });

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="widget-grid" direction="vertical">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            data-grid-container
            className="space-y-4"
          >
            {rows.map((row, rowIndex) => (
              <div 
                key={rowIndex} 
                className="flex flex-wrap gap-4"
              >
                {row.map(({ id: widgetId, size, width, adjustedWidth, globalIndex }) => {
                  const widget = widgetMap[widgetId];
                  if (!widget) return null;
                  
                  // Calculate width percentage based on adjusted width (out of 12 columns)
                  // Account for gaps: with n items, there are (n-1) gaps of 1rem each
                  const itemCount = row.length;
                  const gapWidth = itemCount > 1 ? `${(itemCount - 1) * 1}rem` : "0px";
                  const widthPercent = (adjustedWidth / 12) * 100;
                  const calcWidth = itemCount > 1 
                    ? `calc(${widthPercent}% - ${(itemCount - 1) * 1 / itemCount}rem)`
                    : "100%";
                  
                  return (
                    <Draggable key={widgetId} draggableId={widgetId} index={globalIndex}>
                      {(provided, snapshot) => (
                        <div
                          ref={(el) => {
                            provided.innerRef(el);
                            widgetRefs.current[widgetId] = el;
                          }}
                          {...provided.draggableProps}
                          data-widget-wrapper
                          className={cn(
                            "relative group transition-all duration-200 min-w-0",
                            snapshot.isDragging && "z-50 shadow-2xl opacity-90",
                            // Full width on mobile
                            "w-full lg:flex-1"
                          )}
                          style={{
                            ...provided.draggableProps.style,
                            ...(snapshot.isDragging ? {} : { 
                              flex: `0 0 ${calcWidth}`,
                              maxWidth: calcWidth
                            })
                          }}
                        >
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className={cn(
                              "absolute -top-2 left-1/2 -translate-x-1/2 z-10",
                              "bg-white border rounded-full shadow-sm px-2 py-1",
                              "opacity-0 group-hover:opacity-100 transition-opacity",
                              "cursor-grab active:cursor-grabbing"
                            )}
                          >
                            <GripVertical className="w-4 h-4 text-slate-400" />
                          </div>
                          
                          {/* Resize Handle */}
                          <ResizeHandle 
                            position="right" 
                            onResize={(newSize) => handleResize(widgetId, newSize)} 
                          />
                          
                          {/* Widget Content - natural sizing with overflow control */}
                          <div 
                            className={cn(
                              "rounded-lg transition-all overflow-hidden [&_*]:break-words [&_*]:overflow-wrap-anywhere",
                              snapshot.isDragging && "ring-2 ring-blue-400 ring-offset-2"
                            )}
                            onTouchStart={handleLongPressStart}
                            onTouchEnd={handleLongPressEnd}
                            onTouchCancel={handleLongPressEnd}
                            onMouseDown={handleLongPressStart}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            onContextMenu={(e) => { if (onLongPress) { e.preventDefault(); onLongPress(); } }}
                          >
                            {widget}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
              </div>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}