import { useState, useRef, useMemo } from "react";

import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, ZoomIn, ZoomOut, RotateCcw, Bug, AlertTriangle, 
  Plus, CheckCircle2, Loader2
} from "lucide-react";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { FacilityMapRepo, PestDeviceRepo } from "@/lib/adapters/database";

const DEVICE_TYPE_ICONS = {
  ilt: "💡",
  rodent_station: "🐀",
  fly_light: "🪰",
  pheromone_trap: "🎯",
  glue_board: "📋",
  bait_station: "🧀",
  monitor: "👁️",
  other: "📍"
};

export default function PestFacilityMap({ 
  organizationId, mapImageUrl, devices, findings, onRefresh 
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [addingDevice, setAddingDevice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Calculate device status based on recent findings
  const deviceStatus = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const status = {};
    
    devices.forEach(device => {
      const deviceFindings = findings.filter(f => 
        f.device_id === device.id && new Date(f.service_date) >= thirtyDaysAgo
      );
      const hasExceedance = deviceFindings.some(f => f.threshold_exceeded);
      const hasCritical = deviceFindings.some(f => f.exceedance_severity === "critical");
      const totalCount = deviceFindings.reduce((sum, f) => sum + (f.count || 0), 0);

      status[device.id] = {
        hasExceedance,
        hasCritical,
        totalCount,
        findingsCount: deviceFindings.length
      };
    });
    
    return status;
  }, [devices, findings]);

  const handleUploadMap = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      
      // Create or update facility map
      await FacilityMapRepo.create({
        organization_id: organizationId,
        name: "Pest Control Facility Map",
        image_url: file_url,
        is_default: true,
        status: "active"
      });

      toast.success("Map uploaded successfully");
      onRefresh();
    } catch (error) {
      toast.error("Failed to upload map");
    }
    setUploading(false);
  };

  const handleMapClick = async (e) => {
    if (!addingDevice || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - position.x) / scale / rect.width) * 100;
    const y = ((e.clientY - rect.top - position.y) / scale / rect.height) * 100;

    // Prompt for device code
    const deviceCode = prompt("Enter device code (e.g., ILT-001):");
    if (!deviceCode) return;

    const deviceType = prompt("Enter device type (ilt, rodent_station, fly_light, pheromone_trap, glue_board, bait_station, monitor):");
    if (!deviceType) return;

    try {
      await PestDeviceRepo.create({
        organization_id: organizationId,
        device_code: deviceCode,
        device_type: deviceType,
        map_position_x: x,
        map_position_y: y,
        status: "active"
      });
      toast.success("Device added to map");
      setAddingDevice(false);
      onRefresh();
    } catch (error) {
      toast.error("Failed to add device");
    }
  };

  const updateDevicePosition = useMutation({
    mutationFn: async ({ deviceId, x, y }) => {
      await PestDeviceRepo.update(deviceId, {
        map_position_x: x,
        map_position_y: y
      });
    },
    onSuccess: () => {
      toast.success("Device position updated");
      onRefresh();
    }
  });

  const handleMouseDown = (e) => {
    if (addingDevice) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const devicesWithPosition = devices.filter(d => d.map_position_x != null && d.map_position_y != null);

  if (!mapImageUrl) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bug className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Facility Map</h3>
          <p className="text-slate-500 mb-4">
            Upload a facility map to visualize pest device locations
          </p>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleUploadMap}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload Map</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(s + 0.2, 3))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={addingDevice ? "default" : "outline"} 
            size="sm"
            onClick={() => setAddingDevice(!addingDevice)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {addingDevice ? "Click Map to Add" : "Add Device"}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleUploadMap}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" />
            Replace Map
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500" />
          <span>Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span>Critical</span>
        </div>
      </div>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={containerRef}
            className="relative overflow-hidden bg-slate-100 h-[500px] cursor-grab active:cursor-grabbing"
            style={{ cursor: addingDevice ? "crosshair" : isDragging ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleMapClick}
          >
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                transition: isDragging ? "none" : "transform 0.1s"
              }}
              className="relative"
            >
              <img 
                src={getProxiedImageUrl(mapImageUrl)} 
                alt="Facility Map" 
                className="max-w-none"
                draggable={false}
              />

              {/* Device Markers */}
              {devicesWithPosition.map(device => {
                const status = deviceStatus[device.id] || {};
                const color = status.hasCritical ? "bg-red-500" : 
                             status.hasExceedance ? "bg-amber-500" : "bg-emerald-500";
                const icon = DEVICE_TYPE_ICONS[device.device_type] || DEVICE_TYPE_ICONS.other;

                return (
                  <div
                    key={device.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 ${
                      selectedDevice?.id === device.id ? "z-20" : "z-10"
                    }`}
                    style={{
                      left: `${device.map_position_x}%`,
                      top: `${device.map_position_y}%`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDevice(selectedDevice?.id === device.id ? null : device);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white shadow-lg border-2 border-white`}>
                      <span className="text-sm">{icon}</span>
                    </div>
                    
                    {/* Device Label */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap">
                      <span className="text-xs bg-white px-1 rounded shadow">
                        {device.device_code}
                      </span>
                    </div>

                    {/* Info Popup */}
                    {selectedDevice?.id === device.id && (
                      <div 
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-lg shadow-xl border p-3 z-30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{device.device_code}</span>
                          {status.hasCritical ? (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Critical
                            </Badge>
                          ) : status.hasExceedance ? (
                            <Badge className="bg-amber-100 text-amber-800">Warning</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Normal
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-1">
                          {device.device_type?.replace(/_/g, " ")}
                        </p>
                        {device.location_description && (
                          <p className="text-xs text-slate-600 mb-2">{device.location_description}</p>
                        )}
                        <div className="text-xs border-t pt-2 mt-2">
                          <p>30-day findings: {status.findingsCount || 0}</p>
                          <p>Total count: {status.totalCount || 0}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Count Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{devicesWithPosition.length}</p>
            <p className="text-sm text-slate-500">Mapped Devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {devicesWithPosition.filter(d => !deviceStatus[d.id]?.hasExceedance).length}
            </p>
            <p className="text-sm text-slate-500">Normal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {devicesWithPosition.filter(d => deviceStatus[d.id]?.hasExceedance && !deviceStatus[d.id]?.hasCritical).length}
            </p>
            <p className="text-sm text-slate-500">Warning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {devicesWithPosition.filter(d => deviceStatus[d.id]?.hasCritical).length}
            </p>
            <p className="text-sm text-slate-500">Critical</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}