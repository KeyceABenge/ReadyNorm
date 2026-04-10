// @ts-nocheck
import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2,
  XCircle, Loader2, RefreshCw, Plus, Edit, FileText
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AreaRepo, AssetGroupRepo, AssetRepo, ProductionLineRepo } from "@/lib/adapters/database";

const CSV_TEMPLATE_HEADERS = [
  "production_line_name",
  "area_name",
  "area_description",
  "asset_name",
  "asset_description",
  "asset_group_name",
  "estimated_hours",
  "is_locked",
  "requires_atp_swab",
  "ssop_url"
];

export default function BulkLineImportModal({ 
  open, 
  onOpenChange, 
  organizationId,
  existingLines = [],
  existingAreas = [],
  existingAssets = [],
  existingGroups = [],
  onImportComplete 
}) {
  const [step, setStep] = useState("upload");
  const [parsedData, setParsedData] = useState({ 
    lines: { toCreate: [], toUpdate: [], errors: [] },
    areas: { toCreate: [], toUpdate: [], errors: [] },
    assets: { toCreate: [], toUpdate: [], errors: [] },
    groups: { toCreate: [], toUpdate: [], errors: [] }
  });
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, phase: "" });
  const [importLog, setImportLog] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setStep("upload");
    setParsedData({ 
      lines: { toCreate: [], toUpdate: [], errors: [] },
      areas: { toCreate: [], toUpdate: [], errors: [] },
      assets: { toCreate: [], toUpdate: [], errors: [] },
      groups: { toCreate: [], toUpdate: [], errors: [] }
    });
    setImportProgress({ current: 0, total: 0, phase: "" });
    setImportLog(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headerRow = CSV_TEMPLATE_HEADERS.join(",");
    const exampleRows = [
      "Line 1,Floor Area,,Conveyor Belt,Main conveyor system,,2.5,false,true,",
      "Line 1,Floor Area,,Motor Assembly,Drive motor and gears,,1.5,true,false,",
      "Line 1,Wall Area,Northern wall section,Wall Panels,,,0.5,false,false,",
      "Line 1,Equipment Zone,,Mixer,Industrial mixer,Wet Wash Group,3,true,true,https://example.com/ssop.pdf",
      "Line 1,Equipment Zone,,Grinder,Meat grinder,Wet Wash Group,2,true,false,",
      "Line 2,Processing Area,,Packaging Machine,Auto packaging,,4,true,false,"
    ];
    const csvContent = [headerRow, ...exampleRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `line_import_template_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Template downloaded");
  };

  // Export existing data to CSV
  const exportCurrentData = () => {
    const headerRow = CSV_TEMPLATE_HEADERS.join(",");
    const dataRows = [];

    existingAssets.forEach(asset => {
      const area = existingAreas.find(a => a.id === asset.area_id);
      const line = existingLines.find(l => l.id === asset.production_line_id);
      const group = existingGroups.find(g => g.asset_ids?.includes(asset.id));

      dataRows.push([
        `"${(line?.name || "").replace(/"/g, '""')}"`,
        `"${(area?.name || "").replace(/"/g, '""')}"`,
        `"${(area?.description || "").replace(/"/g, '""')}"`,
        `"${(asset.name || "").replace(/"/g, '""')}"`,
        `"${(asset.description || "").replace(/"/g, '""')}"`,
        `"${(group?.name || "").replace(/"/g, '""')}"`,
        asset.estimated_hours || "",
        asset.is_locked ? "true" : "false",
        asset.requires_atp_swab ? "true" : "false",
        asset.ssop_url || ""
      ].join(","));
    });

    // Add areas without assets
    existingAreas.forEach(area => {
      const hasAssets = existingAssets.some(a => a.area_id === area.id);
      if (!hasAssets) {
        const line = existingLines.find(l => l.id === area.production_line_id);
        dataRows.push([
          `"${(line?.name || "").replace(/"/g, '""')}"`,
          `"${(area.name || "").replace(/"/g, '""')}"`,
          `"${(area.description || "").replace(/"/g, '""')}"`,
          "",
          "",
          "",
          "",
          "",
          "",
          ""
        ].join(","));
      }
    });

    // Add lines without areas
    existingLines.forEach(line => {
      const hasAreas = existingAreas.some(a => a.production_line_id === line.id);
      if (!hasAreas) {
        dataRows.push([
          `"${(line.name || "").replace(/"/g, '""')}"`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          ""
        ].join(","));
      }
    });
    
    const csvContent = [headerRow, ...dataRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lines_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success(`Exported data`);
  };

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, "").replace(/ /g, "_"));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = "";
      let inQuotes = false;

      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      data.push({ ...row, _rowNumber: i + 1 });
    }

    return data;
  };

  // Validate and categorize data
  const validateData = (data) => {
    const lines = { toCreate: [], toUpdate: [], errors: [] };
    const areas = { toCreate: [], toUpdate: [], errors: [] };
    const assets = { toCreate: [], toUpdate: [], errors: [] };
    const groups = { toCreate: [], toUpdate: [], errors: [] };

    // Track what we've seen in this import to avoid duplicates within the CSV
    const seenLines = new Map();
    const seenAreas = new Map();
    const seenAssets = new Map();
    const seenGroups = new Map();

    // Process each row
    data.forEach((row) => {
      const lineName = (row.production_line_name || row.line_name || "").trim();
      const areaName = (row.area_name || "").trim();
      const assetName = (row.asset_name || "").trim();
      const groupName = (row.asset_group_name || row.group_name || "").trim();

      // Must have at least a line name
      if (!lineName) {
        lines.errors.push({ ...row, _error: "Production line name is required" });
        return;
      }

      // Process Line
      const lineKey = lineName.toLowerCase();
      if (!seenLines.has(lineKey)) {
        const existingLine = existingLines.find(l => l.name.toLowerCase() === lineKey);
        if (existingLine) {
          seenLines.set(lineKey, { ...existingLine, _isExisting: true });
          lines.toUpdate.push({ id: existingLine.id, name: lineName, _rowNumber: row._rowNumber });
        } else {
          const newLine = { name: lineName, organization_id: organizationId, status: "active", _rowNumber: row._rowNumber };
          seenLines.set(lineKey, newLine);
          lines.toCreate.push(newLine);
        }
      }

      // Process Area (if provided)
      if (areaName) {
        const areaKey = `${lineKey}::${areaName.toLowerCase()}`;
        if (!seenAreas.has(areaKey)) {
          const existingArea = existingAreas.find(a => 
            a.name.toLowerCase() === areaName.toLowerCase() &&
            existingLines.find(l => l.id === a.production_line_id)?.name.toLowerCase() === lineKey
          );
          if (existingArea) {
            seenAreas.set(areaKey, { ...existingArea, _isExisting: true });
            areas.toUpdate.push({ 
              id: existingArea.id, 
              name: areaName, 
              description: row.area_description || existingArea.description,
              _rowNumber: row._rowNumber 
            });
          } else {
            const newArea = { 
              name: areaName, 
              description: row.area_description || "",
              organization_id: organizationId, 
              _lineKey: lineKey,
              _rowNumber: row._rowNumber 
            };
            seenAreas.set(areaKey, newArea);
            areas.toCreate.push(newArea);
          }
        }

        // Process Asset (if provided)
        if (assetName) {
          const assetKey = `${areaKey}::${assetName.toLowerCase()}`;
          if (!seenAssets.has(assetKey)) {
            const existingAsset = existingAssets.find(a => {
              const assetArea = existingAreas.find(ar => ar.id === a.area_id);
              const assetLine = existingLines.find(l => l.id === a.production_line_id);
              return a.name.toLowerCase() === assetName.toLowerCase() &&
                assetArea?.name.toLowerCase() === areaName.toLowerCase() &&
                assetLine?.name.toLowerCase() === lineKey;
            });

            const assetData = {
              name: assetName,
              description: row.asset_description || "",
              estimated_hours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
              is_locked: row.is_locked?.toLowerCase() === "true",
              requires_atp_swab: row.requires_atp_swab?.toLowerCase() === "true",
              ssop_url: row.ssop_url || "",
              organization_id: organizationId,
              _lineKey: lineKey,
              _areaKey: areaKey,
              _groupName: groupName,
              _rowNumber: row._rowNumber
            };

            if (existingAsset) {
              seenAssets.set(assetKey, { ...existingAsset, _isExisting: true });
              assets.toUpdate.push({ ...assetData, id: existingAsset.id });
            } else {
              seenAssets.set(assetKey, assetData);
              assets.toCreate.push(assetData);
            }
          }

          // Process Group (if provided)
          if (groupName) {
            const groupKey = `${areaKey}::${groupName.toLowerCase()}`;
            if (!seenGroups.has(groupKey)) {
              const existingGroup = existingGroups.find(g => {
                const groupArea = existingAreas.find(ar => ar.id === g.area_id);
                const groupLine = existingLines.find(l => l.id === g.production_line_id);
                return g.name.toLowerCase() === groupName.toLowerCase() &&
                  groupArea?.name.toLowerCase() === areaName.toLowerCase() &&
                  groupLine?.name.toLowerCase() === lineKey;
              });

              const groupData = {
                name: groupName,
                organization_id: organizationId,
                _lineKey: lineKey,
                _areaKey: areaKey,
                _assetNames: [assetName.toLowerCase()],
                estimated_hours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
                is_locked: row.is_locked?.toLowerCase() === "true" || true,
                _rowNumber: row._rowNumber
              };

              if (existingGroup) {
                seenGroups.set(groupKey, { ...existingGroup, _isExisting: true, _assetNames: [assetName.toLowerCase()] });
                groups.toUpdate.push({ ...groupData, id: existingGroup.id });
              } else {
                seenGroups.set(groupKey, groupData);
                groups.toCreate.push(groupData);
              }
            } else {
              // Add asset to existing group tracking
              const existingGroupData = seenGroups.get(groupKey);
              if (existingGroupData._assetNames && !existingGroupData._assetNames.includes(assetName.toLowerCase())) {
                existingGroupData._assetNames.push(assetName.toLowerCase());
              }
              // Update in arrays
              const inCreate = groups.toCreate.find(g => g.name.toLowerCase() === groupName.toLowerCase() && g._areaKey === areaKey);
              if (inCreate && !inCreate._assetNames.includes(assetName.toLowerCase())) {
                inCreate._assetNames.push(assetName.toLowerCase());
              }
              const inUpdate = groups.toUpdate.find(g => g.name.toLowerCase() === groupName.toLowerCase() && g._areaKey === areaKey);
              if (inUpdate && !inUpdate._assetNames) {
                inUpdate._assetNames = [assetName.toLowerCase()];
              } else if (inUpdate && !inUpdate._assetNames.includes(assetName.toLowerCase())) {
                inUpdate._assetNames.push(assetName.toLowerCase());
              }
            }
          }
        }
      }
    });

    return { lines, areas, assets, groups };
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const data = parseCSV(text);
      const validated = validateData(data);
      setParsedData(validated);
      setStep("preview");
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Perform the import
  const performImport = async () => {
    setStep("importing");
    
    const log = {
      importedAt: new Date().toISOString(),
      linesCreated: 0, linesUpdated: 0,
      areasCreated: 0, areasUpdated: 0,
      assetsCreated: 0, assetsUpdated: 0,
      groupsCreated: 0, groupsUpdated: 0,
      failed: 0,
      errors: []
    };

    const totalOps = 
      parsedData.lines.toCreate.length + parsedData.lines.toUpdate.length +
      parsedData.areas.toCreate.length + parsedData.areas.toUpdate.length +
      parsedData.assets.toCreate.length + parsedData.assets.toUpdate.length +
      parsedData.groups.toCreate.length + parsedData.groups.toUpdate.length;
    
    setImportProgress({ current: 0, total: totalOps, phase: "Creating lines..." });

    const createdLines = new Map();
    const createdAreas = new Map();
    const createdAssets = new Map();

    // 1. Create/Update Lines
    for (const line of parsedData.lines.toCreate) {
      try {
        const { _rowNumber, _lineKey, ...lineData } = line;
        const created = await ProductionLineRepo.create(lineData);
        createdLines.set(lineData.name.toLowerCase(), created.id);
        log.linesCreated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: line._rowNumber, error: `Line: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    for (const line of parsedData.lines.toUpdate) {
      try {
        const { id, _rowNumber, ...lineData } = line;
        await ProductionLineRepo.update(id, lineData);
        createdLines.set(lineData.name.toLowerCase(), id);
        log.linesUpdated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: line._rowNumber, error: `Line update: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    // Map existing lines
    existingLines.forEach(l => {
      if (!createdLines.has(l.name.toLowerCase())) {
        createdLines.set(l.name.toLowerCase(), l.id);
      }
    });

    setImportProgress(prev => ({ ...prev, phase: "Creating areas..." }));

    // 2. Create/Update Areas
    for (const area of parsedData.areas.toCreate) {
      try {
        const { _rowNumber, _lineKey, ...areaData } = area;
        const lineId = createdLines.get(_lineKey);
        if (!lineId) {
          throw new Error(`Line not found: ${_lineKey}`);
        }
        const created = await AreaRepo.create({ ...areaData, production_line_id: lineId });
        createdAreas.set(`${_lineKey}::${areaData.name.toLowerCase()}`, created.id);
        log.areasCreated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: area._rowNumber, error: `Area: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    for (const area of parsedData.areas.toUpdate) {
      try {
        const { id, _rowNumber, _lineKey, ...areaData } = area;
        await AreaRepo.update(id, areaData);
        const existingArea = existingAreas.find(a => a.id === id);
        const existingLine = existingLines.find(l => l.id === existingArea?.production_line_id);
        if (existingLine) {
          createdAreas.set(`${existingLine.name.toLowerCase()}::${areaData.name.toLowerCase()}`, id);
        }
        log.areasUpdated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: area._rowNumber, error: `Area update: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    // Map existing areas
    existingAreas.forEach(a => {
      const line = existingLines.find(l => l.id === a.production_line_id);
      if (line) {
        const key = `${line.name.toLowerCase()}::${a.name.toLowerCase()}`;
        if (!createdAreas.has(key)) {
          createdAreas.set(key, a.id);
        }
      }
    });

    setImportProgress(prev => ({ ...prev, phase: "Creating assets..." }));

    // 3. Create/Update Assets
    for (const asset of parsedData.assets.toCreate) {
      try {
        const { _rowNumber, _lineKey, _areaKey, _groupName, ...assetData } = asset;
        const lineId = createdLines.get(_lineKey);
        const areaId = createdAreas.get(_areaKey);
        if (!lineId || !areaId) {
          throw new Error(`Line or Area not found`);
        }
        const created = await AssetRepo.create({ 
          ...assetData, 
          production_line_id: lineId,
          area_id: areaId 
        });
        createdAssets.set(`${_areaKey}::${assetData.name.toLowerCase()}`, created.id);
        log.assetsCreated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: asset._rowNumber, error: `Asset: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    for (const asset of parsedData.assets.toUpdate) {
      try {
        const { id, _rowNumber, _lineKey, _areaKey, _groupName, ...assetData } = asset;
        await AssetRepo.update(id, assetData);
        const existingAsset = existingAssets.find(a => a.id === id);
        const existingArea = existingAreas.find(a => a.id === existingAsset?.area_id);
        const existingLine = existingLines.find(l => l.id === existingAsset?.production_line_id);
        if (existingLine && existingArea) {
          createdAssets.set(`${existingLine.name.toLowerCase()}::${existingArea.name.toLowerCase()}::${assetData.name.toLowerCase()}`, id);
        }
        log.assetsUpdated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: asset._rowNumber, error: `Asset update: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    // Map existing assets
    existingAssets.forEach(a => {
      const area = existingAreas.find(ar => ar.id === a.area_id);
      const line = existingLines.find(l => l.id === a.production_line_id);
      if (line && area) {
        const key = `${line.name.toLowerCase()}::${area.name.toLowerCase()}::${a.name.toLowerCase()}`;
        if (!createdAssets.has(key)) {
          createdAssets.set(key, a.id);
        }
      }
    });

    setImportProgress(prev => ({ ...prev, phase: "Creating asset groups..." }));

    // 4. Create/Update Groups
    for (const group of parsedData.groups.toCreate) {
      try {
        const { _rowNumber, _lineKey, _areaKey, _assetNames, ...groupData } = group;
        const lineId = createdLines.get(_lineKey);
        const areaId = createdAreas.get(_areaKey);
        if (!lineId || !areaId) {
          throw new Error(`Line or Area not found`);
        }
        
        // Resolve asset IDs
        const assetIds = [];
        for (const assetName of (_assetNames || [])) {
          const assetKey = `${_areaKey}::${assetName}`;
          const assetId = createdAssets.get(assetKey);
          if (assetId) assetIds.push(assetId);
        }

        await AssetGroupRepo.create({ 
          ...groupData, 
          production_line_id: lineId,
          area_id: areaId,
          asset_ids: assetIds
        });
        log.groupsCreated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: group._rowNumber, error: `Group: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    for (const group of parsedData.groups.toUpdate) {
      try {
        const { id, _rowNumber, _lineKey, _areaKey, _assetNames, ...groupData } = group;
        
        // Resolve asset IDs for update
        const existingGroup = existingGroups.find(g => g.id === id);
        const assetIds = [...(existingGroup?.asset_ids || [])];
        
        for (const assetName of (_assetNames || [])) {
          const assetKey = `${_areaKey}::${assetName}`;
          const assetId = createdAssets.get(assetKey);
          if (assetId && !assetIds.includes(assetId)) {
            assetIds.push(assetId);
          }
        }

        await AssetGroupRepo.update(id, { ...groupData, asset_ids: assetIds });
        log.groupsUpdated++;
      } catch (err) {
        log.failed++;
        log.errors.push({ row: group._rowNumber, error: `Group update: ${err.message}` });
      }
      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setImportLog(log);
    setStep("complete");
    
    const totalCreated = log.linesCreated + log.areasCreated + log.assetsCreated + log.groupsCreated;
    const totalUpdated = log.linesUpdated + log.areasUpdated + log.assetsUpdated + log.groupsUpdated;
    
    if (log.failed === 0) {
      toast.success(`Import complete: ${totalCreated} created, ${totalUpdated} updated`);
    } else {
      toast.warning(`Import complete with ${log.failed} errors`);
    }

    onImportComplete?.();
  };

  const totalToCreate = parsedData.lines.toCreate.length + parsedData.areas.toCreate.length + 
    parsedData.assets.toCreate.length + parsedData.groups.toCreate.length;
  const totalToUpdate = parsedData.lines.toUpdate.length + parsedData.areas.toUpdate.length + 
    parsedData.assets.toUpdate.length + parsedData.groups.toUpdate.length;
  const totalErrors = parsedData.lines.errors.length + parsedData.areas.errors.length + 
    parsedData.assets.errors.length + parsedData.groups.errors.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import - Production Lines, Areas & Assets
          </DialogTitle>
          <DialogDescription>
            Import or export production lines, areas, assets, and groups via CSV
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-6 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">Upload CSV File</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Click to select a CSV file
                  </p>
                  <Button variant="outline" size="sm">Select File</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Template
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      Get a blank CSV template with example data
                    </p>
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      <FileText className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Current Data
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      Export {existingLines.length} lines, {existingAreas.length} areas, {existingAssets.length} assets
                    </p>
                    <Button variant="outline" size="sm" onClick={exportCurrentData}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">CSV Format Guide</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">Required Fields:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1">
                      <li><code>production_line_name</code> - Name of the line</li>
                    </ul>
                    <p className="font-medium text-slate-700 mt-2">Hierarchy Fields:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1">
                      <li><code>area_name</code> - Area within the line</li>
                      <li><code>asset_name</code> - Asset within the area</li>
                      <li><code>asset_group_name</code> - Group assets together</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Optional Fields:</p>
                    <ul className="list-disc list-inside text-slate-600 mt-1">
                      <li><code>area_description</code>, <code>asset_description</code></li>
                      <li><code>estimated_hours</code> - Time to complete</li>
                      <li><code>is_locked</code> - true/false (lock to 1 person)</li>
                      <li><code>requires_atp_swab</code> - true/false</li>
                      <li><code>ssop_url</code> - Link to SSOP doc</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <Plus className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{totalToCreate}</p>
                  <p className="text-xs text-emerald-600">To Create</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <Edit className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{totalToUpdate}</p>
                  <p className="text-xs text-blue-600">To Update</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
                  <XCircle className="w-5 h-5 mx-auto text-rose-600 mb-1" />
                  <p className="text-2xl font-bold text-rose-700">{totalErrors}</p>
                  <p className="text-xs text-rose-600">Errors</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <FileSpreadsheet className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                  <p className="text-2xl font-bold text-slate-700">{totalToCreate + totalToUpdate}</p>
                  <p className="text-xs text-slate-600">Total Operations</p>
                </div>
              </div>

              <Tabs defaultValue="lines" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="lines">
                    Lines ({parsedData.lines.toCreate.length + parsedData.lines.toUpdate.length})
                  </TabsTrigger>
                  <TabsTrigger value="areas">
                    Areas ({parsedData.areas.toCreate.length + parsedData.areas.toUpdate.length})
                  </TabsTrigger>
                  <TabsTrigger value="assets">
                    Assets ({parsedData.assets.toCreate.length + parsedData.assets.toUpdate.length})
                  </TabsTrigger>
                  <TabsTrigger value="groups">
                    Groups ({parsedData.groups.toCreate.length + parsedData.groups.toUpdate.length})
                  </TabsTrigger>
                  {totalErrors > 0 && (
                    <TabsTrigger value="errors">Errors ({totalErrors})</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="lines" className="mt-4">
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Line Name</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.lines.toCreate.map((line, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{line.name}</TableCell>
                            <TableCell><Badge className="bg-emerald-100 text-emerald-700">Create</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.lines.toUpdate.map((line, idx) => (
                          <TableRow key={`update-${idx}`}>
                            <TableCell className="font-medium">{line.name}</TableCell>
                            <TableCell><Badge className="bg-blue-100 text-blue-700">Update</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.lines.toCreate.length === 0 && parsedData.lines.toUpdate.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-slate-500 py-8">No line changes</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="areas" className="mt-4">
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.areas.toCreate.map((area, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{area.name}</TableCell>
                            <TableCell className="text-slate-500 truncate max-w-[200px]">{area.description || "-"}</TableCell>
                            <TableCell><Badge className="bg-emerald-100 text-emerald-700">Create</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.areas.toUpdate.map((area, idx) => (
                          <TableRow key={`update-${idx}`}>
                            <TableCell className="font-medium">{area.name}</TableCell>
                            <TableCell className="text-slate-500 truncate max-w-[200px]">{area.description || "-"}</TableCell>
                            <TableCell><Badge className="bg-blue-100 text-blue-700">Update</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.areas.toCreate.length === 0 && parsedData.areas.toUpdate.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-slate-500 py-8">No area changes</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="assets" className="mt-4">
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset Name</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Locked</TableHead>
                          <TableHead>ATP</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.assets.toCreate.map((asset, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell>{asset.estimated_hours || "-"}</TableCell>
                            <TableCell>{asset.is_locked ? "Yes" : "No"}</TableCell>
                            <TableCell>{asset.requires_atp_swab ? "Yes" : "No"}</TableCell>
                            <TableCell><Badge className="bg-emerald-100 text-emerald-700">Create</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.assets.toUpdate.map((asset, idx) => (
                          <TableRow key={`update-${idx}`}>
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell>{asset.estimated_hours || "-"}</TableCell>
                            <TableCell>{asset.is_locked ? "Yes" : "No"}</TableCell>
                            <TableCell>{asset.requires_atp_swab ? "Yes" : "No"}</TableCell>
                            <TableCell><Badge className="bg-blue-100 text-blue-700">Update</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.assets.toCreate.length === 0 && parsedData.assets.toUpdate.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-slate-500 py-8">No asset changes</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="mt-4">
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Group Name</TableHead>
                          <TableHead>Assets</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.groups.toCreate.map((group, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell>{group._assetNames?.length || 0} assets</TableCell>
                            <TableCell>{group.estimated_hours || "-"}</TableCell>
                            <TableCell><Badge className="bg-emerald-100 text-emerald-700">Create</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.groups.toUpdate.map((group, idx) => (
                          <TableRow key={`update-${idx}`}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell>{group._assetNames?.length || 0} assets</TableCell>
                            <TableCell>{group.estimated_hours || "-"}</TableCell>
                            <TableCell><Badge className="bg-blue-100 text-blue-700">Update</Badge></TableCell>
                          </TableRow>
                        ))}
                        {parsedData.groups.toCreate.length === 0 && parsedData.groups.toUpdate.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-slate-500 py-8">No group changes</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="errors" className="mt-4">
                  <div className="border border-rose-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-rose-50">
                          <TableHead>Row</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...parsedData.lines.errors, ...parsedData.areas.errors, ...parsedData.assets.errors, ...parsedData.groups.errors].map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item._rowNumber}</TableCell>
                            <TableCell className="text-rose-600">{item._error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-slate-400 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{importProgress.phase}</h3>
              <p className="text-slate-500 mb-4">
                {importProgress.current} of {importProgress.total} operations
              </p>
              <Progress 
                value={(importProgress.current / importProgress.total) * 100} 
                className="w-64 mx-auto"
              />
            </div>
          )}

          {/* Step: Complete */}
          {step === "complete" && importLog && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                {importLog.failed === 0 ? (
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
                ) : (
                  <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                )}
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Import {importLog.failed === 0 ? "Complete" : "Completed with Errors"}
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{importLog.linesCreated}/{importLog.linesUpdated}</p>
                  <p className="text-xs text-slate-500">Lines C/U</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{importLog.areasCreated}/{importLog.areasUpdated}</p>
                  <p className="text-xs text-slate-500">Areas C/U</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{importLog.assetsCreated}/{importLog.assetsUpdated}</p>
                  <p className="text-xs text-slate-500">Assets C/U</p>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{importLog.groupsCreated}/{importLog.groupsUpdated}</p>
                  <p className="text-xs text-slate-500">Groups C/U</p>
                </div>
              </div>

              {importLog.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-rose-900 mb-2">Failed Operations</h4>
                  <ul className="text-sm text-rose-700 space-y-1">
                    {importLog.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                    {importLog.errors.length > 5 && (
                      <li className="text-rose-500">...and {importLog.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Upload Different File
              </Button>
              <Button 
                onClick={performImport}
                disabled={totalToCreate === 0 && totalToUpdate === 0}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Import ({totalToCreate + totalToUpdate} operations)
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={handleClose} className="bg-slate-900 hover:bg-slate-800">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}