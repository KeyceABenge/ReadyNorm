// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/adapters/auth";
import { OrganizationRepo, ProductionLineRepo, AreaRepo, AssetRepo, AssetGroupRepo } from "@/lib/adapters/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, FileText, Upload } from "lucide-react";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LineFormModal from "@/components/linecleanings/LineFormModal";
import AreaFormModal from "@/components/linecleanings/AreaFormModal";
import AssetFormModal from "@/components/linecleanings/AssetFormModal";
import AssetGroupFormModal from "@/components/linecleanings/AssetGroupFormModal";
import BulkLineImportModal from "@/components/linecleanings/BulkLineImportModal";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function LineCleaningsSetup() {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        // CRITICAL: Get organization_id ONLY from site_code in localStorage
        const storedSiteCode = localStorage.getItem('site_code');
        if (!storedSiteCode) {
          window.location.href = createPageUrl("Home");
          return;
        }
        
        const orgs = await OrganizationRepo.filter({ site_code: storedSiteCode, status: "active" });
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        } else {
          localStorage.removeItem('site_code');
          window.location.href = createPageUrl("Home");
        }
      } catch (e) {
        console.log("Not authenticated");
      }
    };
    getUser();
  }, []);
  const [expandedLine, setExpandedLine] = useState(null);
  const [expandedArea, setExpandedArea] = useState(null);

  const [lineFormOpen, setLineFormOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);

  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [selectedLineForArea, setSelectedLineForArea] = useState(null);

  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedAreaForAsset, setSelectedAreaForAsset] = useState(null);

  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedAreaForGroup, setSelectedAreaForGroup] = useState(null);

  const [deleteAlert, setDeleteAlert] = useState(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: lines = [], isLoading: linesLoading } = useQuery({
    queryKey: ["production_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", orgId],
    queryFn: () => AssetRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: assetGroups = [] } = useQuery({
    queryKey: ["asset_groups", orgId],
    queryFn: () => AssetGroupRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const createLineMutation = useMutation({
    mutationFn: (data) => ProductionLineRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_lines"] });
      setLineFormOpen(false);
      setEditingLine(null);
      toast.success("Production line created");
    }
  });

  const updateLineMutation = useMutation({
    mutationFn: ({ id, data }) => ProductionLineRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_lines"] });
      setLineFormOpen(false);
      setEditingLine(null);
      toast.success("Production line updated");
    }
  });

  const deleteLineMutation = useMutation({
    mutationFn: (id) => ProductionLineRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_lines"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setDeleteAlert(null);
      toast.success("Production line deleted");
    }
  });

  const createAreaMutation = useMutation({
    mutationFn: (data) => AreaRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setAreaFormOpen(false);
      setEditingArea(null);
      toast.success("Area created");
    }
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }) => AreaRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setAreaFormOpen(false);
      setEditingArea(null);
      toast.success("Area updated");
    }
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id) => AreaRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setDeleteAlert(null);
      toast.success("Area deleted");
    }
  });

  const createAssetMutation = useMutation({
    mutationFn: (data) => AssetRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setAssetFormOpen(false);
      setEditingAsset(null);
      toast.success("Asset created");
    }
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }) => AssetRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setAssetFormOpen(false);
      setEditingAsset(null);
      toast.success("Asset updated");
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id) => AssetRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setDeleteAlert(null);
      toast.success("Asset deleted");
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => AssetGroupRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset_groups"] });
      setGroupFormOpen(false);
      setEditingGroup(null);
      toast.success("Asset group created");
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }) => AssetGroupRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset_groups"] });
      setGroupFormOpen(false);
      setEditingGroup(null);
      toast.success("Asset group updated");
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => AssetGroupRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset_groups"] });
      setDeleteAlert(null);
      toast.success("Asset group deleted");
    }
  });

  const getAreasForLine = (lineId) => areas.filter(a => a.production_line_id === lineId);
  const getAssetsForArea = (areaId) => assets.filter(a => a.area_id === areaId);
  const getGroupsForArea = (areaId) => assetGroups.filter(g => g.area_id === areaId);
  const isAssetInGroup = (assetId) => assetGroups.some(g => g.asset_ids?.includes(assetId));

  if (!orgId || linesLoading) {
    return <ReadyNormLoader variant="inline" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Production Lines</h2>
          <p className="text-slate-500 text-sm mt-1">Manage lines, areas, and assets</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="rounded-full"
            onClick={() => setBulkImportOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import (CSV)
          </Button>
          <Button 
            onClick={() => {
              setEditingLine(null);
              setLineFormOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Line
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {lines.map(line => {
          const lineAreas = getAreasForLine(line.id);
          const isExpanded = expandedLine === line.id;

          return (
            <Card key={line.id} className="bg-white border-0 shadow-sm">
              <div className="p-4">
                <div className="w-full flex items-center justify-between group">
                  <button
                    onClick={() => setExpandedLine(isExpanded ? null : line.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <h3 className="font-semibold text-slate-900">{line.name}</h3>
                    {line.description && (
                      <p className="text-sm text-slate-500">{line.description}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {lineAreas.length} areas
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLine(line);
                        setLineFormOpen(true);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                    <button onClick={() => setExpandedLine(isExpanded ? null : line.id)}>
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-slate-700">Areas</p>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setSelectedLineForArea(line.id);
                            setEditingArea(null);
                            setAreaFormOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Area
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setEditingLine(line);
                            setLineFormOpen(true);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setDeleteAlert({ type: "line", item: line })}
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                        </Button>
                      </div>
                    </div>

                    {lineAreas.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No areas yet</p>
                    ) : (
                      <div className="space-y-2">
                        {lineAreas.map(area => {
                          const areaAssets = getAssetsForArea(area.id);
                          const areaExpanded = expandedArea === area.id;

                          return (
                            <div key={area.id} className="bg-slate-50 rounded-lg p-3">
                              <button
                                onClick={() => setExpandedArea(areaExpanded ? null : area.id)}
                                className="w-full flex items-center justify-between"
                              >
                                <div className="text-left flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-800">{area.name}</p>
                                    {(() => {
                                      const areaGroups = getGroupsForArea(area.id);
                                      const ungroupedAssets = areaAssets.filter(a => !isAssetInGroup(a.id));
                                      const groupHours = areaGroups.reduce((sum, g) => sum + (g.estimated_hours || 0), 0);
                                      const assetHours = ungroupedAssets.reduce((sum, asset) => sum + (asset.estimated_hours || 0), 0);
                                      const totalHours = groupHours + assetHours;
                                      return totalHours > 0 ? (
                                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                          {totalHours}h total
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                  {area.description && (
                                    <p className="text-xs text-slate-500">{area.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-full">
                                    {areaAssets.length} assets
                                  </span>
                                  {areaExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </button>

                              {areaExpanded && (
                                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                  <div className="flex justify-between items-center gap-2">
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="rounded-full"
                                        onClick={() => {
                                          setSelectedAreaForAsset(area.id);
                                          setEditingAsset(null);
                                          setAssetFormOpen(true);
                                        }}
                                      >
                                        <Plus className="w-3 h-3 mr-1" /> Asset
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="rounded-full"
                                        onClick={() => {
                                          setSelectedAreaForGroup(area.id);
                                          setEditingGroup(null);
                                          setGroupFormOpen(true);
                                        }}
                                      >
                                        <Plus className="w-3 h-3 mr-1" /> Group
                                      </Button>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="rounded-full"
                                        onClick={() => {
                                          setEditingArea(area);
                                          setSelectedLineForArea(line.id);
                                          setAreaFormOpen(true);
                                        }}
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="rounded-full"
                                        onClick={() => setDeleteAlert({ type: "area", item: area })}
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-600" />
                                      </Button>
                                    </div>
                                  </div>

                                  {areaAssets.length === 0 && getGroupsForArea(area.id).length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No assets or groups yet</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {/* Asset Groups */}
                                      {getGroupsForArea(area.id).map(group => (
                                        <div key={group.id} className="bg-purple-50 border border-purple-200 rounded p-3">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-purple-900">{group.name}</p>
                                                {group.estimated_hours && (
                                                  <span className="text-xs font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                                                    {group.estimated_hours}h
                                                  </span>
                                                )}
                                                {group.is_locked && (
                                                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                    Locked
                                                  </span>
                                                  )}
                                                  </div>
                                                  <p className="text-xs text-purple-700">
                                                  {group.asset_ids?.length || 0} assets in group
                                              </p>
                                            </div>
                                            <div className="flex gap-1">
                                              <Button 
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                  setEditingGroup(group);
                                                  setSelectedAreaForGroup(area.id);
                                                  setGroupFormOpen(true);
                                                }}
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </Button>
                                              <Button 
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => setDeleteAlert({ type: "group", item: group })}
                                              >
                                                <Trash2 className="w-3 h-3 text-rose-600" />
                                              </Button>
                                            </div>
                                          </div>
                                          {group.asset_ids?.length > 0 && (
                                            <div className="space-y-1 pl-2 border-l-2 border-purple-300">
                                              {group.asset_ids.map(assetId => {
                                                const asset = assets.find(a => a.id === assetId);
                                                return asset ? (
                                                  <div key={assetId} className="text-xs text-purple-800">
                                                    • {asset.name}
                                                  </div>
                                                ) : null;
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      ))}

                                      {/* Ungrouped Assets */}
                                      {areaAssets.filter(a => !isAssetInGroup(a.id)).map(asset => (
                                        <div key={asset.id} className="bg-white rounded p-2 flex items-center justify-between">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <p className="text-sm font-medium text-slate-700 truncate">{asset.name}</p>
                                              {asset.estimated_hours && (
                                                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                  {asset.estimated_hours}h
                                                </span>
                                              )}
                                              {asset.is_locked && (
                                                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                  Locked
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {asset.ssop_url && (
                                                <a 
                                                  href={asset.ssop_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                >
                                                  <FileText className="w-3 h-3" /> View SSOP
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button 
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7"
                                              onClick={() => {
                                                setEditingAsset(asset);
                                                setSelectedAreaForAsset(area.id);
                                                setAssetFormOpen(true);
                                              }}
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7"
                                              onClick={() => setDeleteAlert({ type: "asset", item: asset })}
                                            >
                                              <Trash2 className="w-3 h-3 text-rose-600" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {lines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No production lines yet.</p>
          </div>
        )}
      </div>

      <LineFormModal
        open={lineFormOpen}
        onOpenChange={setLineFormOpen}
        line={editingLine}
        onSubmit={(data) => {
          if (editingLine) {
            updateLineMutation.mutate({ id: editingLine.id, data });
          } else {
            createLineMutation.mutate(data);
          }
        }}
        isLoading={createLineMutation.isPending || updateLineMutation.isPending}
      />

      <AreaFormModal
        open={areaFormOpen}
        onOpenChange={setAreaFormOpen}
        area={editingArea}
        lineId={selectedLineForArea}
        lines={lines}
        onSubmit={async (data) => {
          if (editingArea) {
            updateAreaMutation.mutate({ id: editingArea.id, data });
          } else {
            const { lineIds, ...areaData } = data;
            const targetIds = lineIds?.length > 0 ? lineIds : [selectedLineForArea];
            try {
              await Promise.all(
                targetIds.map(lid => AreaRepo.create({ ...areaData, organization_id: orgId, production_line_id: lid }))
              );
              queryClient.invalidateQueries({ queryKey: ["areas"] });
              setAreaFormOpen(false);
              setEditingArea(null);
              toast.success(targetIds.length > 1 ? `Area added to ${targetIds.length} lines` : "Area created");
            } catch (e) {
              toast.error("Failed to create area: " + e.message);
            }
          }
        }}
        isLoading={createAreaMutation.isPending || updateAreaMutation.isPending}
      />

      <AssetFormModal
        open={assetFormOpen}
        onOpenChange={setAssetFormOpen}
        asset={editingAsset}
        areaId={selectedAreaForAsset}
        lineId={lines.find(l => getAreasForLine(l.id).find(a => a.id === selectedAreaForAsset))?.id}
        allAreas={areas}
        lines={lines}
        onSubmit={async (data) => {
          if (editingAsset) {
            updateAssetMutation.mutate({ id: editingAsset.id, data });
          } else {
            const { areaIds, ...assetData } = data;
            const targetIds = areaIds?.length > 0 ? areaIds : [selectedAreaForAsset];
            try {
              await Promise.all(
                targetIds.map(aid => {
                  const parentLine = lines.find(l => getAreasForLine(l.id).find(a => a.id === aid));
                  return AssetRepo.create({ ...assetData, organization_id: orgId, area_id: aid, production_line_id: parentLine?.id });
                })
              );
              queryClient.invalidateQueries({ queryKey: ["assets"] });
              setAssetFormOpen(false);
              setEditingAsset(null);
              toast.success(targetIds.length > 1 ? `Asset added to ${targetIds.length} areas` : "Asset created");
            } catch (e) {
              toast.error("Failed to create asset: " + e.message);
            }
          }
        }}
        isLoading={createAssetMutation.isPending || updateAssetMutation.isPending}
      />

      <AssetGroupFormModal
        open={groupFormOpen}
        onOpenChange={setGroupFormOpen}
        group={editingGroup}
        areaId={selectedAreaForGroup}
        lineId={lines.find(l => getAreasForLine(l.id).find(a => a.id === selectedAreaForGroup))?.id}
        availableAssets={assets.filter(a => a.area_id === selectedAreaForGroup)}
        onSubmit={(data) => {
          if (editingGroup) {
            updateGroupMutation.mutate({ id: editingGroup.id, data });
          } else {
            createGroupMutation.mutate(data);
          }
        }}
        isLoading={createGroupMutation.isPending || updateGroupMutation.isPending}
      />

      <AlertDialog open={!!deleteAlert} onOpenChange={(open) => !open && setDeleteAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteAlert?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAlert?.item?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction 
            onClick={() => {
              if (deleteAlert.type === "line") {
                deleteLineMutation.mutate(deleteAlert.item.id);
              } else if (deleteAlert.type === "area") {
                deleteAreaMutation.mutate(deleteAlert.item.id);
              } else if (deleteAlert.type === "asset") {
                deleteAssetMutation.mutate(deleteAlert.item.id);
              } else if (deleteAlert.type === "group") {
                deleteGroupMutation.mutate(deleteAlert.item.id);
              }
            }}
            className="bg-rose-600 hover:bg-rose-700"
          >
            Delete
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>

      <BulkLineImportModal
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        organizationId={orgId}
        existingLines={lines}
        existingAreas={areas}
        existingAssets={assets}
        existingGroups={assetGroups}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["production_lines"] });
          queryClient.invalidateQueries({ queryKey: ["areas"] });
          queryClient.invalidateQueries({ queryKey: ["assets"] });
          queryClient.invalidateQueries({ queryKey: ["asset_groups"] });
        }}
      />
    </div>
  );
}