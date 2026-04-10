// @ts-nocheck
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AreaRepo,
  AreaSignOffRepo,
  AssetRepo,
  OrganizationRepo,
  PreOpInspectionRepo,
  ProductionLineRepo,
  SanitaryReportRepo
} from "@/lib/adapters/database";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, 
  ChevronRight, AlertTriangle, Factory, Package, Flag, Camera, X as XIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReportConditionModal from "@/components/quality/ReportConditionModal";
import CleaningProgressBar from "@/components/preop/CleaningProgressBar";

export default function PreOpInspection() {
  const [qaEmployee, setQaEmployee] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [currentInspection, setCurrentInspection] = useState(null);
  const [assetResults, setAssetResults] = useState({});
  const [failComments, setFailComments] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingLine, setPendingLine] = useState(null);
  const [recentInspection, setRecentInspection] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isManagerMode, setIsManagerMode] = useState(false);
  const [failPhotos, setFailPhotos] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [reinspectionAssetIds, setReinspectionAssetIds] = useState(new Set());

  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem("selectedQAEmployee");
      if (!stored) {
        window.location.href = createPageUrl("QualityLogin");
        return;
      }

      const employee = JSON.parse(stored);
      setQaEmployee(employee);

      // Detect if an authenticated manager/admin came from SanitationProgram
      // vs a QA employee who came through QualityLogin
      try {
        const isAuth = await isAuthenticated();
        if (isAuth) {
          const user = await getCurrentUser();
          if (user.role === "admin") {
            setIsManagerMode(true);
          }
        }
      } catch (e) {
        // Not authenticated = employee mode
      }

      const siteCode = localStorage.getItem('site_code');
      if (siteCode) {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const { data: productionLines = [] } = useQuery({
    queryKey: ["production_lines", organization?.id],
    queryFn: () => ProductionLineRepo.filter({ organization_id: organization.id, status: "active" }),
    enabled: !!organization?.id
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", organization?.id],
    queryFn: () => AreaRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", organization?.id],
    queryFn: () => AssetRepo.filter({ organization_id: organization.id }),
    enabled: !!organization?.id
  });

  const { data: allInspections = [] } = useQuery({
    queryKey: ["all_preop_inspections", organization?.id],
    queryFn: () => PreOpInspectionRepo.filter({ 
      organization_id: organization.id
    }, "-inspection_date"),
    enabled: !!organization?.id
  });

  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["area_signoffs_preop", organization?.id],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: organization.id }, "-signed_off_at", 200),
    enabled: !!organization?.id
  });

  const createInspectionMutation = useMutation({
    mutationFn: (data) => PreOpInspectionRepo.create(data),
    onSuccess: (data) => {
      setCurrentInspection(data);
      queryClient.invalidateQueries({ queryKey: ["preop_inspections"] });
    }
  });

  const updateInspectionMutation = useMutation({
    mutationFn: ({ id, data }) => PreOpInspectionRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preop_inspections"] });
      // Invalidate shared keys used by ManagerDashboard Records tab
      queryClient.invalidateQueries({ queryKey: ["inspection_records"] });
    }
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => SanitaryReportRepo.create(data),
    onSuccess: () => {
      setReportModalOpen(false);
      toast.success("Condition reported to management");
    }
  });

  const handleSelectLine = async (line) => {
    // Check for existing in-progress inspection
    const inProgress = await PreOpInspectionRepo.filter({
      organization_id: organization.id,
      production_line_id: line.id,
      status: "in_progress"
    });

    if (inProgress.length > 0) {
      // Join/resume existing inspection
      const existing = inProgress[0];
      setSelectedLine(line);
      setCurrentInspection(existing);
      
      // Add current inspector to the inspectors list if not already there
      const inspectors = existing.inspectors || [];
      const alreadyJoined = inspectors.some(i => i.email === qaEmployee.email);
      if (!alreadyJoined) {
        const updatedInspectors = [...inspectors, {
          email: qaEmployee.email,
          name: qaEmployee.name,
          joined_at: new Date().toISOString()
        }];
        await PreOpInspectionRepo.update(existing.id, { inspectors: updatedInspectors });
        setCurrentInspection(prev => ({ ...prev, inspectors: updatedInspectors }));
      }
      
      const results = {};
      const comments = {};
      const photos = {};
      existing.asset_results?.forEach(r => {
        if (r.status !== "pending") {
          results[r.asset_id] = r.status;
          if (r.comments) comments[r.asset_id] = r.comments;
          if (r.photo_url) photos[r.asset_id] = r.photo_url;
        }
      });
      setAssetResults(results);
      setFailComments(comments);
      setFailPhotos(photos);
      return;
    }

    // Check for recent completed inspection (within last 12 hours)
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    
    const recentCompleted = allInspections.find(insp => 
      insp.production_line_id === line.id && 
      (insp.status === "passed" || insp.status === "failed") &&
      new Date(insp.inspection_date) > twelveHoursAgo
    );

    if (recentCompleted) {
      if (recentCompleted.status === "failed") {
        // Resume the same cycle — reopen failed inspection for re-inspection of failed assets only
        await resumeFailedInspection(line, recentCompleted);
        return;
      }
      // Passed — show confirmation dialog to start a new one
      setPendingLine(line);
      setRecentInspection(recentCompleted);
      setConfirmDialogOpen(true);
      return;
    }

    // No recent inspection - proceed directly
    await createNewInspection(line);
  };

  const resumeFailedInspection = async (line, failedInspection) => {
    setSelectedLine(line);
    
    // Reopen the inspection — reset failed assets to pending, keep passed ones
    const updatedResults = (failedInspection.asset_results || []).map(r => {
      if (r.status === "fail") {
        return { ...r, status: "pending", comments: "", photo_url: null, inspected_at: null, inspected_by: null };
      }
      return r;
    });
    
    // Add current inspector if not already listed
    const inspectors = failedInspection.inspectors || [];
    const alreadyJoined = inspectors.some(i => i.email === qaEmployee.email);
    const updatedInspectors = alreadyJoined ? inspectors : [...inspectors, {
      email: qaEmployee.email,
      name: qaEmployee.name,
      joined_at: new Date().toISOString()
    }];
    
    await PreOpInspectionRepo.update(failedInspection.id, {
      status: "in_progress",
      asset_results: updatedResults,
      inspectors: updatedInspectors
    });
    
    const updated = { ...failedInspection, status: "in_progress", asset_results: updatedResults, inspectors: updatedInspectors };
    setCurrentInspection(updated);
    
    // Load results into local state — only passed assets remain checked
    const results = {};
    const comments = {};
    const photos = {};
    updatedResults.forEach(r => {
      if (r.status !== "pending") {
        results[r.asset_id] = r.status;
        if (r.comments) comments[r.asset_id] = r.comments;
        if (r.photo_url) photos[r.asset_id] = r.photo_url;
      }
    });
    setAssetResults(results);
    setFailComments(comments);
    setFailPhotos(photos);
    
    // Track which assets need reinspection
    const failedIds = new Set(
      (failedInspection.asset_results || []).filter(r => r.status === "fail").map(r => r.asset_id)
    );
    setReinspectionAssetIds(failedIds);
    
    queryClient.invalidateQueries({ queryKey: ["all_preop_inspections"] });
    toast.success("Resuming inspection — failed assets reset for re-inspection");
  };

  const createNewInspection = async (line) => {
    setSelectedLine(line);
    
    const lineAreas = areas.filter(a => a.production_line_id === line.id);
    const lineAssets = assets.filter(a => a.production_line_id === line.id);
    
    const initialResults = lineAssets.map(asset => {
      const area = lineAreas.find(a => a.id === asset.area_id);
      return {
        asset_id: asset.id,
        asset_name: asset.name,
        area_id: asset.area_id,
        area_name: area?.name || "Unknown",
        status: "pending",
        comments: "",
        inspected_at: null
      };
    });

    const newInspection = await createInspectionMutation.mutateAsync({
      organization_id: organization.id,
      production_line_id: line.id,
      production_line_name: line.name,
      inspector_email: qaEmployee.email,
      inspector_name: qaEmployee.name,
      inspectors: [{
        email: qaEmployee.email,
        name: qaEmployee.name,
        joined_at: new Date().toISOString()
      }],
      inspection_date: new Date().toISOString(),
      status: "in_progress",
      asset_results: initialResults
    });
  };

  const handleConfirmNewInspection = async () => {
    setConfirmDialogOpen(false);
    await createNewInspection(pendingLine);
    setPendingLine(null);
    setRecentInspection(null);
  };

  const handleCancelNewInspection = () => {
    setConfirmDialogOpen(false);
    setPendingLine(null);
    setRecentInspection(null);
  };

  const handleAssetResult = (assetId, status) => {
    setAssetResults(prev => ({ ...prev, [assetId]: status }));
    
    if (status === "pass") {
      setFailComments(prev => { const next = { ...prev }; delete next[assetId]; return next; });
      setFailPhotos(prev => { const next = { ...prev }; delete next[assetId]; return next; });
    }
  };

  const handleFailPhotoUpload = async (assetId, file) => {
    if (!file) return;
    setUploadingPhoto(assetId);
    const { file_url } = await uploadFile({ file });
    setFailPhotos(prev => ({ ...prev, [assetId]: file_url }));
    setUploadingPhoto(null);
  };

  const handleSaveResults = async () => {
    if (!currentInspection) {
      toast.error("No inspection found. Please select a line again.");
      return;
    }

    // Validate that all fails have comments
    const failedAssets = Object.entries(assetResults).filter(([_, status]) => status === "fail");
    const missingComments = failedAssets.filter(([assetId]) => !failComments[assetId]?.trim());
    
    if (missingComments.length > 0) {
      toast.error("Please add comments for all failed assets");
      return;
    }

    setIsSaving(true);

    try {
      const lineAssets = assets.filter(a => a.production_line_id === selectedLine.id);
      const lineAreas = areas.filter(a => a.production_line_id === selectedLine.id);

      const existingResults = currentInspection.asset_results || [];
      const updatedResults = lineAssets.map(asset => {
        const area = lineAreas.find(a => a.id === asset.area_id);
        const status = assetResults[asset.id] || "pending";
        const existingResult = existingResults.find(r => r.asset_id === asset.id);
        return {
          asset_id: asset.id,
          asset_name: asset.name,
          area_id: asset.area_id,
          area_name: area?.name || "Unknown",
          status: status,
          comments: failComments[asset.id] || "",
          photo_url: failPhotos[asset.id] || existingResult?.photo_url || null,
          inspected_at: status !== "pending" ? (existingResult?.inspected_at || new Date().toISOString()) : null,
          inspected_by: status !== "pending" ? (existingResult?.inspected_by || qaEmployee.name) : null
        };
      });

      const allPassed = updatedResults.every(r => r.status === "pass");
      const anyFailed = updatedResults.some(r => r.status === "fail");

      await PreOpInspectionRepo.update(currentInspection.id, {
        asset_results: updatedResults,
        status: allPassed ? "passed" : anyFailed ? "failed" : "in_progress",
        passed_at: allPassed ? new Date().toISOString() : null
      });

      // Update local state
      setCurrentInspection(prev => ({
        ...prev,
        asset_results: updatedResults,
        status: allPassed ? "passed" : anyFailed ? "failed" : "in_progress"
      }));

      queryClient.invalidateQueries({ queryKey: ["preop_inspections"] });
      queryClient.invalidateQueries({ queryKey: ["all_preop_inspections"] });
      // Invalidate shared keys used by ManagerDashboard Records tab
      queryClient.invalidateQueries({ queryKey: ["inspection_records"] });

      if (allPassed || anyFailed) {
        toast.success(allPassed ? "All assets passed! Line is ready for production." : "Inspection completed with failed items.");
        setSelectedLine(null);
        setCurrentInspection(null);
        setAssetResults({});
        setFailComments({});
      } else {
        toast.success("Results saved successfully!");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save results. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReInspect = () => {
    // Clear failed results so they can be re-inspected
    const newResults = { ...assetResults };
    Object.keys(newResults).forEach(key => {
      if (newResults[key] === "fail") {
        delete newResults[key];
      }
    });
    setAssetResults(newResults);
    setFailComments({});
    setFailPhotos({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const lineAssets = selectedLine ? assets.filter(a => a.production_line_id === selectedLine.id) : [];
  const lineAreas = selectedLine ? areas.filter(a => a.production_line_id === selectedLine.id) : [];
  
  // Group assets by area
  const assetsByArea = lineAreas.map(area => ({
    area,
    assets: lineAssets.filter(a => a.area_id === area.id)
  })).filter(g => g.assets.length > 0);

  const totalAssets = lineAssets.length;
  const passedCount = Object.values(assetResults).filter(s => s === "pass").length;
  const failedCount = Object.values(assetResults).filter(s => s === "fail").length;
  const pendingCount = totalAssets - passedCount - failedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => {
              if (selectedLine) {
                setSelectedLine(null);
                setCurrentInspection(null);
                setAssetResults({});
                setFailComments({});
              } else if (isManagerMode) {
                window.location.href = createPageUrl("SanitationProgram");
              } else {
                localStorage.removeItem("selectedQAEmployee");
                window.location.href = createPageUrl("QualityLogin");
              }
            }}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Pre-Operational Inspection</h1>
            <p className="text-xs text-slate-500">Inspector: {qaEmployee?.name}</p>
          </div>

          <Button
            size="sm"
            onClick={() => setReportModalOpen(true)}
            className="rounded-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Flag className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Report Condition</span>
          </Button>
        </div>

        {selectedLine && (
          <div className="flex items-center justify-center mb-4">
            <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
              {selectedLine.name}
            </Badge>
          </div>
        )}

        {/* Line Selection */}
        {!selectedLine && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Select Production Line</h2>
            {productionLines.length === 0 ? (
              <Card className="p-8 text-center bg-white border-0 shadow-lg">
                <Factory className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No production lines configured</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {productionLines.map((line, index) => {
                  // Check for recent inspection (within 12 hours)
                  const twelveHoursAgo = new Date();
                  twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
                  
                  const recentInsp = allInspections.find(insp => 
                    insp.production_line_id === line.id && 
                    (insp.status === "passed" || insp.status === "failed") &&
                    new Date(insp.inspection_date) > twelveHoursAgo
                  );

                  // Check for in-progress inspection
                  const inProgressInsp = allInspections.find(insp =>
                    insp.production_line_id === line.id &&
                    insp.status === "in_progress"
                  );

                  const inspectorNames = (inProgressInsp?.inspectors || []).map(i => {
                    // If the inspector is the current user, use their updated name
                    if (i.email === qaEmployee?.email) return qaEmployee.name;
                    return i.name;
                  }).filter(Boolean);

                  return (
                    <motion.div
                      key={line.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className={cn(
                          "p-4 bg-white shadow-sm hover:shadow-lg transition-all cursor-pointer",
                          recentInsp?.status === "passed" && "border-l-4 border-l-emerald-500",
                          recentInsp?.status === "failed" && "border-l-4 border-l-rose-500",
                          inProgressInsp && "border-l-4 border-l-blue-500",
                          !recentInsp && !inProgressInsp && "border-0"
                        )}
                        onClick={() => handleSelectLine(line)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                              recentInsp?.status === "passed" ? "bg-emerald-100" :
                              recentInsp?.status === "failed" ? "bg-rose-100" :
                              inProgressInsp ? "bg-blue-100" : "bg-purple-100"
                            )}>
                              {recentInsp?.status === "passed" ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                              ) : recentInsp?.status === "failed" ? (
                                <XCircle className="w-6 h-6 text-rose-600" />
                              ) : inProgressInsp ? (
                                <Clock className="w-6 h-6 text-blue-600" />
                              ) : (
                                <Factory className="w-6 h-6 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900">{line.name}</h3>
                                {recentInsp && (
                                  <Badge className={cn(
                                    "text-xs rounded-full",
                                    recentInsp.status === "passed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                                  )}>
                                    {recentInsp.status === "passed" ? "Passed" : "Needs Reinspection"}
                                  </Badge>
                                )}
                                {inProgressInsp && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs rounded-full">In Progress</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">
                                {assets.filter(a => a.production_line_id === line.id).length} assets
                              </p>
                              {recentInsp && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {format(parseISO(recentInsp.inspection_date), "MMM d, h:mm a")} — {recentInsp.inspector_name}
                                </p>
                              )}
                              {inProgressInsp && inspectorNames.length > 0 && (
                                <p className="text-xs text-blue-600 mt-0.5">
                                  {inspectorNames.join(", ")} working on this
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        </div>
                        <CleaningProgressBar
                          lineAssets={assets.filter(a => a.production_line_id === line.id)}
                          signOffs={areaSignOffs}
                        />
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Inspection View */}
        {selectedLine && (
          <div className="space-y-6">
            {/* Progress Summary */}
            <Card className="p-4 bg-white border-0 shadow-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{passedCount}</div>
                  <div className="text-xs text-slate-500">Passed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-rose-600">{failedCount}</div>
                  <div className="text-xs text-slate-500">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-400">{pendingCount}</div>
                  <div className="text-xs text-slate-500">Pending</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${totalAssets > 0 ? (passedCount / totalAssets) * 100 : 0}%` }}
                />
              </div>

              {/* Inspectors participating */}
              {currentInspection?.inspectors?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Inspectors:</span>
                  {currentInspection.inspectors.map((insp, i) => (
                    <Badge key={i} variant="outline" className="text-xs rounded-full">
                      {insp.name}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Assets by Area */}
            {assetsByArea.map(({ area, assets: areaAssets }) => (
              <div key={area.id} className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {area.name}
                </h3>
                
                <div className="space-y-2">
                  {areaAssets.map(asset => {
                    const status = assetResults[asset.id];
                    const isPending = !status;
                    const isPassed = status === "pass";
                    const isFailed = status === "fail";

                    return (
                      <Card 
                        key={asset.id}
                        className={cn(
                          "p-4 bg-white border-2 transition-all",
                          isPassed && "border-emerald-200 bg-emerald-50",
                          isFailed && "border-rose-200 bg-rose-50",
                          isPending && "border-slate-100"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-slate-900">{asset.name}</h4>
                            {isPending && reinspectionAssetIds.has(asset.id) && (
                              <Badge className="bg-amber-100 text-amber-800 text-xs rounded-full">
                                Needs Reinspection
                              </Badge>
                            )}
                          </div>
                          {asset.description && (
                            <p className="text-sm text-slate-500 mt-1">{asset.description}</p>
                          )}
                        </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={isPassed ? "default" : "outline"}
                              className={cn(
                                "rounded-full",
                                isPassed && "bg-emerald-600 hover:bg-emerald-700"
                              )}
                              onClick={() => handleAssetResult(asset.id, "pass")}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Pass
                            </Button>
                            <Button
                              size="sm"
                              variant={isFailed ? "default" : "outline"}
                              className={cn(
                                "rounded-full",
                                isFailed && "bg-rose-600 hover:bg-rose-700"
                              )}
                              onClick={() => handleAssetResult(asset.id, "fail")}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Fail
                            </Button>
                          </div>
                        </div>

                        {/* Fail Comments */}
                        <AnimatePresence>
                          {isFailed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4"
                            >
                              <label className="text-sm font-medium text-rose-700 flex items-center gap-1 mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                What needs to be corrected? (Required)
                              </label>
                              <Textarea
                                value={failComments[asset.id] || ""}
                                onChange={(e) => setFailComments(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                placeholder="Describe the issue and corrective action needed..."
                                className="border-rose-200 focus:border-rose-400"
                                rows={2}
                              />
                              <div className="mt-2 flex items-center gap-3">
                               <input 
                                 type="file" 
                                 accept="image/*" 
                                 capture="environment" 
                                 className="hidden" 
                                 id={`photo-upload-${asset.id}`}
                                 onChange={(e) => handleFailPhotoUpload(asset.id, e.target.files?.[0])}
                               />
                               <Button 
                                 variant="outline"
                                 size="sm"
                                 onClick={() => document.getElementById(`photo-upload-${asset.id}`)?.click()}
                                 disabled={uploadingPhoto === asset.id}
                               >
                                 {uploadingPhoto === asset.id ? 
                                   <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                                   <Camera className="w-4 h-4 mr-2" />
                                 }
                                 {failPhotos[asset.id] ? "Change Photo" : "Add Photo"}
                               </Button>

                               {failPhotos[asset.id] && (
                                 <div className="relative">
                                   <img src={failPhotos[asset.id]} alt="Fail photo" className="w-12 h-12 rounded object-cover" />
                                   <button 
                                     onClick={() => setFailPhotos(p => { const n = {...p}; delete n[asset.id]; return n; })}
                                     className="absolute -top-1 -right-1 bg-slate-700 text-white rounded-full w-4 h-4 flex items-center justify-center"
                                   >
                                     <XIcon className="w-2.5 h-2.5" />
                                   </button>
                                 </div>
                               )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Action Buttons */}
            <div className="sticky bottom-4 flex gap-3">
              {failedCount > 0 && currentInspection?.status === "failed" && (
                <Button
                  onClick={handleReInspect}
                  variant="outline"
                  className="flex-1 rounded-full"
                >
                  Re-Inspect Failed Assets
                </Button>
              )}
              <Button
                onClick={handleSaveResults}
                disabled={isSaving || (passedCount === 0 && failedCount === 0)}
                className={cn(
                  "flex-1 rounded-full",
                  passedCount === totalAssets && totalAssets > 0
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {isSaving && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {passedCount === totalAssets && totalAssets > 0
                  ? "Complete - Line Ready for Production"
                  : pendingCount > 0
                    ? `Save Results (${pendingCount} remaining)`
                    : "Save Results"
                }
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Recent Inspection */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recent Inspection Found</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  <strong>{pendingLine?.name}</strong> was inspected {recentInspection && formatDistanceToNow(parseISO(recentInspection.inspection_date), { addSuffix: true })}.
                </p>
                {recentInspection && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-600">Status:</span>
                      <Badge className={cn("rounded-full", recentInspection.status === "passed" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                        {recentInspection.status === "passed" ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                    <div className="text-slate-600">
                      {recentInspection.inspectors?.length > 1 
                        ? `Inspectors: ${recentInspection.inspectors.map(i => i.name).join(", ")}`
                        : `Inspector: ${recentInspection.inspector_name}`
                      }
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                      {format(parseISO(recentInspection.inspection_date), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                )}
                <p className="text-slate-700 font-medium">
                  Are you sure you want to start a new inspection for this line?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNewInspection} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmNewInspection}
              className="rounded-full bg-purple-600 hover:bg-purple-700"
            >
              Yes, Start New Inspection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Condition Modal */}
      <ReportConditionModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        qaEmployee={qaEmployee}
        organization={organization}
        productionLines={productionLines}
        areas={areas}
        onSubmit={(data) => createReportMutation.mutate(data)}
        isLoading={createReportMutation.isPending}
      />
    </div>
  );
}