// @ts-nocheck
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/adapters/auth";
import { uploadFile } from "@/lib/adapters/storage";
import {
  OrganizationRepo, ProductionLineRepo, AreaRepo, AssetRepo,
  AreaSignOffRepo, LineCleaningAssignmentRepo, PostCleanInspectionRepo
} from "@/lib/adapters/database";
import { createPageUrl } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, 
  ChevronRight, AlertTriangle, Package, Camera, X as XIcon, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function PostCleanInspection() {
  const [inspector, setInspector] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assetResults, setAssetResults] = useState({});
  const [failComments, setFailComments] = useState({});
  const [failPhotos, setFailPhotos] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagerMode, setIsManagerMode] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      // Try QA employee first (from QualityLogin/SanitationProgram flow)
      const stored = localStorage.getItem("selectedQAEmployee");
      
      // Also check for regular employee (from employee dashboard flow)
      const storedEmployee = localStorage.getItem("selectedEmployee");
      
      if (!stored && !storedEmployee) {
        // Try manager auth
        try {
          const user = await getCurrentUser();
          if (user) {
            setInspector({
              email: user.email,
              name: user.display_name || user.full_name || user.email,
              is_qa_team: true
            });
            setIsManagerMode(true);
          } else {
            window.location.href = createPageUrl("Home");
            return;
          }
        } catch {
          window.location.href = createPageUrl("Home");
          return;
        }
      } else if (stored) {
        const emp = JSON.parse(stored);
        setInspector(emp);
        // Check if manager
        try {
          const user = await getCurrentUser();
          if (user && user.role === "admin") setIsManagerMode(true);
        } catch {}
      } else if (storedEmployee) {
        const emp = JSON.parse(storedEmployee);
        setInspector({
          email: emp.email,
          name: emp.name,
          organization_id: emp.organization_id,
          role: emp.role,
          is_qa_team: emp.is_qa_team
        });
      }

      const siteCode = localStorage.getItem("site_code");
      if (siteCode) {
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) setOrganization(orgs[0]);
      }

      setIsLoading(false);
    };
    init();
  }, []);

  const orgId = organization?.id || inspector?.organization_id;

  const { data: productionLines = [] } = useQuery({
    queryKey: ["postclean_lines", orgId],
    queryFn: () => ProductionLineRepo.filter({ organization_id: orgId, status: "active" }),
    enabled: !!orgId
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["postclean_areas_all", orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["postclean_assets_all", orgId],
    queryFn: () => AssetRepo.filter({ organization_id: orgId }),
    enabled: !!orgId
  });

  const { data: allSignOffs = [] } = useQuery({
    queryKey: ["postclean_signoffs_all", orgId],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: orgId }, "-signed_off_at", 500),
    enabled: !!orgId
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["postclean_assignments_all", orgId],
    queryFn: async () => {
      const all = await LineCleaningAssignmentRepo.filter({ organization_id: orgId }, "-scheduled_date", 50);
      return all.filter(a => a.status === "in_progress" || a.status === "completed");
    },
    enabled: !!orgId
  });

  // For the selected assignment, get detailed sign-offs
  const { data: assignmentSignOffs = [], refetch: refetchSignOffs } = useQuery({
    queryKey: ["postclean_assignment_signoffs", selectedAssignment?.id],
    queryFn: () => AreaSignOffRepo.filter({ line_cleaning_assignment_id: selectedAssignment.id }),
    enabled: !!selectedAssignment?.id
  });

  // Build line summary: which lines have assets awaiting inspection
  const linesWithPendingInspection = productionLines.map(line => {
    const lineAssignments = assignments.filter(a => a.production_line_id === line.id);
    const lineSignOffs = allSignOffs.filter(s => {
      return lineAssignments.some(a => a.id === s.line_cleaning_assignment_id);
    });

    const pendingCount = lineSignOffs.filter(s => s.status === "pending_inspection").length;
    const failedCount = lineSignOffs.filter(s => s.status === "failed_inspection").length;
    const passedCount = lineSignOffs.filter(s => s.status === "passed_inspection").length;
    const needsReinspection = lineSignOffs.filter(s => s.needs_reinspection && s.status === "pending_inspection").length;
    const totalSignedOff = lineSignOffs.length;
    const awaitingCount = pendingCount + failedCount;

    // Find the most recent assignment with pending inspections
    const assignmentWithPending = lineAssignments.find(a => {
      const aSignOffs = allSignOffs.filter(s => s.line_cleaning_assignment_id === a.id);
      return aSignOffs.some(s => s.status === "pending_inspection" || s.status === "failed_inspection");
    });

    return {
      ...line,
      pendingCount,
      failedCount,
      passedCount,
      needsReinspection,
      totalSignedOff,
      awaitingCount,
      assignmentWithPending,
      lineAssignments
    };
  }).filter(l => l.awaitingCount > 0 || l.totalSignedOff > 0);

  const handleSelectLine = (lineData) => {
    setSelectedLine(lineData);
    
    // Auto-select the assignment with pending inspections
    if (lineData.assignmentWithPending) {
      setSelectedAssignment(lineData.assignmentWithPending);
    } else if (lineData.lineAssignments.length > 0) {
      setSelectedAssignment(lineData.lineAssignments[0]);
    }
    
    setAssetResults({});
    setFailComments({});
    setFailPhotos({});
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
      const { file_url } = await uploadFile(file);
    setFailPhotos(prev => ({ ...prev, [assetId]: file_url }));
    setUploadingPhoto(null);
  };

  const handleSaveResults = async () => {
    if (!selectedAssignment) {
      toast.error("No assignment selected.");
      return;
    }

    // Validate fails have comments
    const failedAssets = Object.entries(assetResults).filter(([_, s]) => s === "fail");
    const missingComments = failedAssets.filter(([id]) => !failComments[id]?.trim());
    if (missingComments.length > 0) {
      toast.error("Please add comments for all failed assets");
      return;
    }

    setIsSaving(true);

    try {
      const updates = [];
      let passedCount = 0;
      let failedCount = 0;

      for (const [assetId, status] of Object.entries(assetResults)) {
        const signOff = assignmentSignOffs.find(s => s.asset_id === assetId);
        if (!signOff) continue;

        if (status === "pass") {
          passedCount++;
          updates.push(
            AreaSignOffRepo.update(signOff.id, {
              status: "passed_inspection",
              inspection_notes: failComments[assetId] || "",
              inspection_photo_url: failPhotos[assetId] || null,
              inspected_by: inspector.name || inspector.email,
              inspected_at: new Date().toISOString(),
              needs_reinspection: false
            })
          );
        } else if (status === "fail") {
          failedCount++;
          updates.push(
            AreaSignOffRepo.update(signOff.id, {
              status: "pending_inspection",
              inspection_notes: failComments[assetId] || "",
              inspection_photo_url: failPhotos[assetId] || null,
              inspected_by: inspector.name || inspector.email,
              inspected_at: new Date().toISOString(),
              needs_reinspection: true,
              reinspection_count: (signOff.reinspection_count || 0) + 1
            })
          );
        }
      }

      await Promise.all(updates);

      // Create PostCleanInspection records grouped by area
      const inspectedAreaIds = new Set();
      for (const assetId of Object.keys(assetResults)) {
        const signOff = assignmentSignOffs.find(s => s.asset_id === assetId);
        if (signOff) inspectedAreaIds.add(signOff.area_id);
      }

      for (const areaId of inspectedAreaIds) {
        const areaResults = {};
        for (const [assetId, status] of Object.entries(assetResults)) {
          const signOff = assignmentSignOffs.find(s => s.asset_id === assetId && s.area_id === areaId);
          if (signOff) {
            areaResults[assetId] = {
              passed: status === "pass",
              notes: failComments[assetId] || "",
              photo_url: failPhotos[assetId] || null
            };
          }
        }
        if (Object.keys(areaResults).length > 0) {
          const areaPassed = Object.values(areaResults).filter(r => r.passed).length;
          const areaFailed = Object.values(areaResults).filter(r => !r.passed).length;
          await PostCleanInspectionRepo.create({
            organization_id: orgId,
            line_cleaning_assignment_id: selectedAssignment.id,
            area_id: areaId,
            inspector_email: inspector.email,
            inspector_name: inspector.name || inspector.email,
            inspection_date: new Date().toISOString(),
            signature_data: "",
            results: areaResults,
            total_assets: Object.keys(areaResults).length,
            passed_assets: areaPassed,
            failed_assets: areaFailed
          });
        }
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["postclean_signoffs_all"] });
      queryClient.invalidateQueries({ queryKey: ["postclean_assignment_signoffs"] });
      queryClient.invalidateQueries({ queryKey: ["inspection_records"] });
      queryClient.invalidateQueries({ queryKey: ["area_sign_offs"] });

      const allPassed = failedCount === 0 && passedCount > 0;
      toast.success(
        allPassed
          ? "All inspected assets passed!"
          : `Inspection saved. ${passedCount} passed, ${failedCount} failed and sent back for re-cleaning.`
      );

      // Go back to line selection
      setSelectedLine(null);
      setSelectedAssignment(null);
      setAssetResults({});
      setFailComments({});
      setFailPhotos({});
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Assets awaiting inspection for the selected assignment
  const inspectableSignOffs = assignmentSignOffs.filter(
    s => s.status === "pending_inspection" || s.status === "failed_inspection"
  );

  const lineAssets = selectedLine ? assets.filter(a => a.production_line_id === selectedLine.id) : [];
  const lineAreas = selectedLine ? areas.filter(a => a.production_line_id === selectedLine.id) : [];

  // Group inspectable assets by area
  const assetsByArea = lineAreas.map(area => {
    const areaAssets = lineAssets.filter(a => a.area_id === area.id);
    // Only include assets that have sign-offs pending inspection
    const inspectableAssets = areaAssets.filter(asset =>
      inspectableSignOffs.some(s => s.asset_id === asset.id)
    );
    return { area, assets: inspectableAssets };
  }).filter(g => g.assets.length > 0);

  const totalInspectable = inspectableSignOffs.length;
  const passedCount = Object.values(assetResults).filter(s => s === "pass").length;
  const failedCount = Object.values(assetResults).filter(s => s === "fail").length;
  const pendingCount = totalInspectable - passedCount - failedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (selectedLine) {
                setSelectedLine(null);
                setSelectedAssignment(null);
                setAssetResults({});
                setFailComments({});
                setFailPhotos({});
              } else if (isManagerMode) {
                window.location.href = createPageUrl("SanitationProgram");
              } else {
                window.history.back();
              }
            }}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Post-Clean Inspection</h1>
            <p className="text-xs text-slate-500">Inspector: {inspector?.name}</p>
          </div>

          <div className="w-10" />
        </div>

        {selectedLine && (
          <div className="flex items-center justify-center mb-4">
            <Badge className="bg-cyan-100 text-cyan-800 text-sm px-3 py-1 rounded-full">
              {selectedLine.name}
            </Badge>
          </div>
        )}

        {/* Line Selection */}
        {!selectedLine && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Select Production Line</h2>
            {linesWithPendingInspection.length === 0 ? (
              <Card className="p-8 text-center bg-white border-0 shadow-lg">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Lines Awaiting Inspection</h3>
                <p className="text-slate-500">All cleaned assets have been inspected, or no cleanings are in progress.</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {linesWithPendingInspection.map((lineData, index) => (
                  <motion.div
                    key={lineData.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "p-4 bg-white shadow-sm hover:shadow-lg transition-all cursor-pointer",
                        lineData.awaitingCount > 0 ? "border-l-4 border-l-amber-500" :
                        lineData.totalSignedOff > 0 && lineData.passedCount === lineData.totalSignedOff ? "border-l-4 border-l-emerald-500" : "border-0"
                      )}
                      onClick={() => handleSelectLine(lineData)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                            lineData.awaitingCount > 0 ? "bg-amber-100" : "bg-emerald-100"
                          )}>
                            {lineData.awaitingCount > 0 ? (
                              <Clock className="w-6 h-6 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900">{lineData.name}</h3>
                              {lineData.needsReinspection > 0 && (
                                <Badge className="bg-amber-100 text-amber-800 text-xs rounded-full">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {lineData.needsReinspection} Reinspection
                                </Badge>
                              )}
                              {lineData.awaitingCount > 0 && lineData.needsReinspection === 0 && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs rounded-full">
                                  {lineData.awaitingCount} Awaiting
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              {lineData.passedCount} passed • {lineData.awaitingCount} awaiting • {lineData.totalSignedOff} total signed off
                            </p>
                            {lineData.assignmentWithPending && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {lineData.assignmentWithPending.scheduled_date &&
                                  format(parseISO(lineData.assignmentWithPending.scheduled_date + "T00:00:00"), "MMM d")}
                                {lineData.assignmentWithPending.shift_name && ` • ${lineData.assignmentWithPending.shift_name}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
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
              <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${totalInspectable > 0 ? (passedCount / totalInspectable) * 100 : 0}%` }}
                />
              </div>
            </Card>

            {assetsByArea.length === 0 ? (
              <Card className="p-8 text-center bg-white border-0 shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">All assets have been inspected for this assignment.</p>
              </Card>
            ) : (
              assetsByArea.map(({ area, assets: areaAssets }) => (
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
                      const signOff = inspectableSignOffs.find(s => s.asset_id === asset.id);
                      const isReinspection = signOff?.needs_reinspection;

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
                                {isReinspection && isPending && (
                                  <Badge className="bg-amber-100 text-amber-800 text-xs rounded-full">
                                    Needs Reinspection
                                  </Badge>
                                )}
                              </div>
                              {asset.description && (
                                <p className="text-sm text-slate-500 mt-1">{asset.description}</p>
                              )}
                              {signOff && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Cleaned by {signOff.employee_name} • {signOff.hours_worked}h
                                  {signOff.reinspection_count > 0 && (
                                    <span className="text-amber-600 ml-1">• Reinspection #{signOff.reinspection_count}</span>
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={isPassed ? "default" : "outline"}
                                className={cn("rounded-full", isPassed && "bg-emerald-600 hover:bg-emerald-700")}
                                onClick={() => handleAssetResult(asset.id, "pass")}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Pass
                              </Button>
                              <Button
                                size="sm"
                                variant={isFailed ? "default" : "outline"}
                                className={cn("rounded-full", isFailed && "bg-rose-600 hover:bg-rose-700")}
                                onClick={() => handleAssetResult(asset.id, "fail")}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Fail
                              </Button>
                            </div>
                          </div>

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
                                  placeholder="Describe the issue..."
                                  className="border-rose-200 focus:border-rose-400"
                                  rows={2}
                                />
                                <div className="mt-2 flex items-center gap-3">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    id={`postclean-photo-${asset.id}`}
                                    onChange={(e) => handleFailPhotoUpload(asset.id, e.target.files?.[0])}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`postclean-photo-${asset.id}`)?.click()}
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
                                      <img src={failPhotos[asset.id]} alt="Fail" className="w-12 h-12 rounded object-cover" />
                                      <button
                                        onClick={() => setFailPhotos(p => { const n = { ...p }; delete n[asset.id]; return n; })}
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
              ))
            )}

            {/* Action Button */}
            {assetsByArea.length > 0 && (
              <div className="sticky bottom-4">
                <Button
                  onClick={handleSaveResults}
                  disabled={isSaving || (passedCount === 0 && failedCount === 0)}
                  className={cn(
                    "w-full rounded-full",
                    passedCount === totalInspectable && totalInspectable > 0
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-900 hover:bg-slate-800"
                  )}
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {passedCount === totalInspectable && totalInspectable > 0
                    ? "Complete — All Assets Passed"
                    : pendingCount > 0
                      ? `Save Results (${pendingCount} remaining)`
                      : "Save Results"
                  }
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}