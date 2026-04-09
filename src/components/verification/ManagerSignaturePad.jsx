import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, PenTool } from "lucide-react";

export default function ManagerSignaturePad({ onSignatureChange, label = "Manager Signature" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && hasSignature) {
      onSignatureChange(canvasRef.current.toDataURL("image/png"));
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5" />
          {label} <span className="text-red-500">*</span>
        </span>
        {hasSignature && (
          <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="text-slate-500 hover:text-slate-700 h-7">
            <Eraser className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
      <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white hover:border-slate-400 transition-colors">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      {!hasSignature && (
        <p className="text-xs text-slate-400 text-center">Sign above to verify</p>
      )}
    </div>
  );
}