// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import {
  LineCleaningAssignmentRepo, ProductionLineRepo, AreaRepo, AssetRepo,
  AreaSignOffRepo, PreOpInspectionRepo, RoleConfigRepo
} from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Package2, CheckCircle2, Clock, FileText, Loader2, X, Droplet } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { format, parseISO } from "date-fns";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PreOpInspectionStatus from "@/components/linecleanings/PreOpInspectionStatus";
import EmployeeQAButton from "@/components/qa/EmployeeQAButton";
import InlinePostCleanInspection from "@/components/linecleanings/InlinePostCleanInspection";
import PostCleanFinalSignOff from "@/components/linecleanings/PostCleanFinalSignOff";
import { useTranslation } from "@/components/i18n";

export default function LineCleaningDetail() {
  const [employee, setEmployee] = useState(null);
  const employeeLanguage = employee?.preferred_language || "en";
  const { t } = useTranslation(employeeLanguage);
  const [assignmentId, setAssignmentId] = useState(null);
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [hoursWorked, setHoursWorked] = useState("");
  const [notes, setNotes] = useState("");
  const [atpResult, setAtpResult] = useState("");
  const [atpValue, setAtpValue] = useState("");
  const [atpComments, setAtpComments] = useState("");
  const sigCanvas = useRef(null);
  const [finalSignOffOpen, setFinalSignOffOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem("selectedEmployee");
    if (!stored) {
      window.location.href = createPageUrl("EmployeeLogin");
      return;
    }
    setEmployee(JSON.parse(stored));

    // Get assignment ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    setAssignmentId(id);
  }, []);

  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ["line_cleaning_assignment", assignmentId],
    queryFn: async () => {
      const results = await LineCleaningAssignmentRepo.filter({ id: assignmentId });
      return results[0] || null;
    },
    enabled: !!assignmentId
  });

  const { data: line } = useQuery({
    queryKey: ["production_line", assignment?.production_line_id],
    queryFn: async () => {
      const results = await ProductionLineRepo.filter({ id: assignment?.production_line_id });
      return results[0] || null;
    },
    enabled: !!assignment?.production_line_id
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["areas", assignment?.production_line_id, employee?.organization_id],
    queryFn: () => AreaRepo.filter({ organization_id: employee?.organization_id, production_line_id: assignment?.production_line_id }),
    enabled: !!assignment?.production_line_id && !!employee?.organization_id
  });

  const { data: allAssets = [] } = useQuery({
    queryKey: ["assets", assignment?.production_line_id, employee?.organization_id],
    queryFn: () => AssetRepo.filter({ organization_id: employee?.organization_id, production_line_id: assignment?.production_line_id }),
    enabled: !!assignment?.production_line_id && !!employee?.organization_id
  });

  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["area_sign_offs", assignmentId],
    queryFn: () => AreaSignOffRepo.filter({ line_cleaning_assignment_id: assignmentId }),
    enabled: !!assignmentId
  });

  // Fetch pre-op inspection for this production line (most recent)
  const { data: preOpInspections = [] } = useQuery({
    queryKey: ["preop_inspections", assignment?.production_line_id],
    queryFn: () => PreOpInspectionRepo.filter({ production_line_id: assignment?.production_line_id }),
    enabled: !!assignment?.production_line_id
  });

  // Fetch role configs and employees to determine inspection qualification
  const { data: roleConfigs = [] } = useQuery({
    queryKey: ["role_configs", employee?.organization_id],
    queryFn: () => RoleConfigRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  // Check if current employee is qualified to perform post-clean inspections
  const isQualifiedInspector = (() => {
    if (!employee) return false;
    // QA team members are always qualified
    if (employee.is_qa_team) return true;
    // Check role config for can_do_postclean_inspection or can_do_preop_inspection
    if (employee.role && roleConfigs.length > 0) {
      const roleConfig = roleConfigs.find(rc => rc.role_name === employee.role && rc.is_active !== false);
      if (roleConfig?.can_do_postclean_inspection || roleConfig?.can_do_preop_inspection) return true;
    }
    return false;
  })();

  // Get most recent pre-op inspection
  const latestPreOpInspection = preOpInspections.length > 0
    ? preOpInspections.sort((a, b) => new Date(b.inspection_date || b.created_date) - new Date(a.inspection_date || a.created_date))[0]
    : null;

  const signOffMutation = useMutation({
    mutationFn: (data) => AreaSignOffRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area_sign_offs"] });
      queryClient.invalidateQueries({ queryKey: ["area_sign_offs", employee?.organization_id] });
      setSignOffModalOpen(false);
      setSelectedAsset(null);
      setSelectedArea(null);
      setHoursWorked("");
      setNotes("");
      setAtpResult("");
      setAtpValue("");
      setAtpComments("");
      if (sigCanvas.current) {
        sigCanvas.current.clear();
      }
      toast.success("Asset signed off successfully!");
    }
  });

  

  const handleFinalSignOffComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["line_cleaning_assignment"] });
    queryClient.invalidateQueries({ queryKey: ["line_cleaning_assignments"] });
    queryClient.invalidateQueries({ queryKey: ["area_sign_offs"] });
    setFinalSignOffOpen(false);
    setTimeout(() => {
      window.location.href = createPageUrl("EmployeeDashboard");
    }, 1000);
  };

  const handleSignOffAsset = (asset, area) => {
    setSelectedAsset(asset);
    setSelectedArea(area);
    setHoursWorked("");
    setNotes("");
    setAtpResult("");
    setAtpValue("");
    setAtpComments("");
    setSignOffModalOpen(true);
  };

  const handleConfirmSignOff = () => {
    if (!hoursWorked) {
      toast.error("Please enter hours worked");
      return;
    }

    const signatureData = sigCanvas.current?.toDataURL() || "";
    if (!signatureData || sigCanvas.current?.isEmpty()) {
      toast.error("Please provide your signature");
      return;
    }

    // Check ATP requirements
    if (selectedAsset?.requires_atp_swab) {
      if (!atpResult) {
        toast.error("ATP test result is required for this asset");
        return;
      }
      if (atpResult === "fail" && !atpComments.trim()) {
        toast.error("Comments are mandatory for failed ATP tests");
        return;
      }
    }

    const existingSignOff = getAssetSignOff(selectedAsset.id);
    const retestCount = existingSignOff?.atp_retest_count || 0;

    signOffMutation.mutate({
      organization_id: employee.organization_id,
      line_cleaning_assignment_id: assignmentId,
      area_id: selectedArea.id,
      asset_id: selectedAsset.id,
      employee_email: employee.email,
      employee_name: employee.name,
      hours_worked: parseFloat(hoursWorked),
      notes: notes,
      signature_data: signatureData,
      signed_off_at: new Date().toISOString(),
      status: (selectedAsset?.requires_atp_swab && atpResult === "fail") ? "failed_inspection" : "pending_inspection",
      inspection_notes: (selectedAsset?.requires_atp_swab && atpResult === "fail") ? "ATP test failed — re-clean and retest required" : undefined,
      needs_reinspection: (selectedAsset?.requires_atp_swab && atpResult === "fail") ? true : false,
      atp_test_result: selectedAsset?.requires_atp_swab ? atpResult : "not_required",
      atp_test_value: atpValue ? parseFloat(atpValue) : null,
      atp_test_comments: atpComments,
      atp_tested_at: selectedAsset?.requires_atp_swab ? new Date().toISOString() : null,
      atp_retest_count: atpResult === "fail" ? retestCount + 1 : retestCount
    });
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleCompleteAssignment = () => {
    // Open the final sign-off modal - validation happens inside
    setFinalSignOffOpen(true);
  };

  if (assignmentLoading || !employee || !assignment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Calculate progress based on passed inspections
  const totalAssets = allAssets.length;
  const passedAssets = areaSignOffs.filter(s => s.status === "passed_inspection").length;
  const progress = totalAssets > 0 ? Math.round((passedAssets / totalAssets) * 100) : 0;

  // Check which assets are completed
  const getAssetSignOff = (assetId) => {
    return areaSignOffs.find(s => s.asset_id === assetId);
  };

  // Check if area has all assets signed off
  const isAreaSignedOff = (areaId) => {
    const areaAssets = allAssets.filter(a => a.area_id === areaId);
    if (areaAssets.length === 0) return false;
    return areaAssets.every(asset => {
      const signOff = getAssetSignOff(asset.id);
      return signOff !== undefined;
    });
  };

  // Check if area is fully complete (all passed inspection)
  const isAreaComplete = (areaId) => {
    const areaAssets = allAssets.filter(a => a.area_id === areaId);
    return areaAssets.length > 0 && areaAssets.every(asset => {
      const signOff = getAssetSignOff(asset.id);
      return signOff && signOff.status === "passed_inspection";
    });
  };

  // Check if area needs inspection (has assets pending or failed)
  const isAreaReadyForInspection = (areaId) => {
    const areaAssets = allAssets.filter(a => a.area_id === areaId);
    if (areaAssets.length === 0) return false;
    
    // Check if any assets are pending inspection or failed
    return areaAssets.some(asset => {
      const signOff = getAssetSignOff(asset.id);
      return signOff && (signOff.status === "pending_inspection" || signOff.status === "failed_inspection");
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.location.href = createPageUrl("EmployeeDashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common", "back", "Back")}
          </Button>

          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-purple-50">
                  <Package2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{line?.name}</h1>
                  {line?.description && (
                    <p className="text-slate-600 mt-1">{line.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                    {assignment.estimated_start_time && (() => {
                      try {
                        const date = parseISO(assignment.estimated_start_time);
                        if (isNaN(date.getTime())) return null;
                        return (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Est. Start: {format(date, "MMM d, h:mm a")}
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                    {assignment.actual_start_time && (() => {
                      try {
                        const date = parseISO(assignment.actual_start_time);
                        if (isNaN(date.getTime())) return null;
                        return (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <Clock className="w-4 h-4" />
                            Started: {format(date, "MMM d, h:mm a")}
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {t("lineCleaning", "progress", "Progress")}: {passedAssets} / {totalAssets} {t("lineCleaning", "assetsPassedInspection", "assets passed inspection")}
                </span>
                <span className="text-sm font-medium text-slate-700">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {progress === 100 && isQualifiedInspector && (
              <Button
                onClick={handleCompleteAssignment}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t("lineCleaning", "completePostCleanInspection", "Complete Post-Clean Inspection & Sign Off")}
              </Button>
            )}
          </Card>
        </div>

        {/* Pre-Op Inspection Status */}
        <PreOpInspectionStatus
          inspection={latestPreOpInspection}
          assets={allAssets}
        />

        {/* Areas & Assets */}
        <div className="space-y-6">
          <AnimatePresence>
            {areas.map((area, idx) => {
              const areaAssets = allAssets.filter(a => a.area_id === area.id);
              const complete = isAreaComplete(area.id);

              return (
                <motion.div
                  key={area.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={cn(
                    "p-6 border-2 transition-all",
                    complete ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                  )}>
                    <div className="mb-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">{area.name}</h2>
                        {complete && (
                          <Badge className="bg-emerald-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t("status", "completed", "Complete")}
                          </Badge>
                        )}
                        {isAreaReadyForInspection(area.id) && (
                          <Badge className="bg-amber-500 text-white">
                            {t("lineCleaning", "awaitingInspection", "Awaiting Inspection")}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {areaAssets.filter(a => getAssetSignOff(a.id)).length} / {areaAssets.length} assets
                        </Badge>
                      </div>
                      {area.description && (
                        <p className="text-sm text-slate-600">{area.description}</p>
                      )}
                      {isAreaReadyForInspection(area.id) && !isQualifiedInspector && (
                        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {t("lineCleaning", "inspectionQualifiedOnly", "Only qualified inspectors can perform post-clean inspections")}
                        </div>
                      )}
                    </div>

                    {/* Assets */}
                    <div className="space-y-3">
                      {areaAssets.map(asset => {
                        const signOff = getAssetSignOff(asset.id);
                        const isComplete = signOff?.status === "passed_inspection";

                        return (
                          <div
                            key={asset.id}
                            className={cn(
                              "p-4 rounded-lg border-2 transition-all",
                              isComplete ? "bg-white border-emerald-200" : 
                              signOff?.status === "failed_inspection" ? "bg-rose-50 border-rose-200" :
                              "bg-slate-50 border-slate-200"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-slate-900">{asset.name}</h3>
                                  {asset.requires_atp_swab && (
                                   <Badge variant="outline" className="text-xs">
                                     <Droplet className="w-3 h-3 mr-1" />
                                     {t("atp", "atpRequired", "ATP Required")}
                                   </Badge>
                                  )}
                                  {isComplete && (
                                   <Badge className="bg-emerald-600 text-xs">
                                     <CheckCircle2 className="w-3 h-3 mr-1" />
                                     {t("cleaning", "passed", "Passed")}
                                   </Badge>
                                  )}
                                  {signOff?.status === "pending_inspection" && (
                                   <Badge className="bg-amber-500 text-white text-xs">
                                     {t("lineCleaning", "awaitingInspection", "Awaiting Inspection")}
                                   </Badge>
                                  )}
                                  {signOff?.status === "failed_inspection" && (
                                   <Badge className="bg-rose-600 text-xs">
                                     {t("lineCleaning", "failedRecleanRequired", "Failed - Re-clean Required")}
                                   </Badge>
                                  )}
                                </div>
                                {asset.description && (
                                  <p className="text-sm text-slate-600 mb-2">{asset.description}</p>
                                )}
                                {asset.ssop_url && (
                                  <a
                                    href={asset.ssop_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-2"
                                  >
                                    <FileText className="w-3 h-3" />
                                    {t("tasks", "viewSsop", "View SSOP")}
                                  </a>
                                )}
                                {signOff && (
                                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                                    <div>{t("lineCleaning", "cleanedBy", "Cleaned by")} {signOff.employee_name || signOff.employee_email}</div>
                                    <div>{t("lineCleaning", "time", "Time")}: {signOff.hours_worked}h</div>
                                    {signOff.notes && <div>{t("lineCleaning", "notes", "Notes")}: {signOff.notes}</div>}
                                    {signOff.atp_test_result && signOff.atp_test_result !== "not_required" && (
                                      <div className="mt-2 p-2 bg-slate-100 rounded space-y-1">
                                        <div className="font-semibold text-slate-700 flex items-center gap-1">
                                          <Droplet className="w-3 h-3" />
                                          {t("atp", "atpTest", "ATP Test")}: <span className={cn(
                                            "ml-1",
                                            signOff.atp_test_result === "pass" ? "text-emerald-600" : "text-rose-600"
                                          )}>{signOff.atp_test_result === "pass" ? t("atp", "pass", "Pass") : t("atp", "fail", "Fail")}</span>
                                        </div>
                                        {signOff.atp_test_value && <div>{t("lineCleaning", "rluValue", "RLU Value")}: {signOff.atp_test_value}</div>}
                                        {signOff.atp_test_comments && <div>{t("lineCleaning", "atpNotes", "ATP Notes")}: {signOff.atp_test_comments}</div>}
                                        {signOff.atp_retest_count > 0 && (
                                          <div className="text-amber-600 font-medium">
                                            {t("lineCleaning", "retest", "Retest")} #{signOff.atp_retest_count}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {signOff.inspection_notes && (
                                      <div className="text-rose-600 font-medium">
                                        {t("lineCleaning", "inspectorNotes", "Inspector Notes")}: {signOff.inspection_notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Inline Post-Clean Inspection */}
                                {isQualifiedInspector && signOff?.status === "pending_inspection" && (
                                  <InlinePostCleanInspection
                                    signOff={signOff}
                                    inspector={employee}
                                    onInspected={() => queryClient.invalidateQueries({ queryKey: ["area_sign_offs"] })}
                                    t={t}
                                  />
                                )}
                              </div>
                              {!isComplete && signOff?.status !== "pending_inspection" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSignOffAsset(asset, area)}
                                  className="bg-slate-900 hover:bg-slate-800"
                                >
                                  {signOff?.status === "failed_inspection" ? t("lineCleaning", "recleanSignOff", "Re-clean & Sign Off") : t("lineCleaning", "signOff", "Sign Off")}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Sign Off Modal */}
      <Dialog open={signOffModalOpen} onOpenChange={setSignOffModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("lineCleaning", "signOffAsset", "Sign Off Asset")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="font-medium text-slate-900 mb-1">{selectedAsset?.name}</p>
              <p className="text-sm text-slate-600">{selectedArea?.name}</p>
            </div>
            <div>
              <Label htmlFor="hours">{t("lineCleaning", "hoursWorked", "Hours Worked")} *</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                placeholder="e.g., 2.5"
              />
            </div>
            <div>
              <Label htmlFor="notes">{t("lineCleaning", "notes", "Notes")} ({t("common", "optional", "optional")})</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("lineCleaning", "cleaningNotesPlaceholder", "Any notes about the cleaning...")}
                rows={3}
              />
            </div>

            {/* ATP Test Section */}
            {selectedAsset?.requires_atp_swab && (
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 space-y-4">
                <div className="flex items-center gap-2 text-blue-900 font-semibold">
                  <Droplet className="w-5 h-5" />
                  {t("lineCleaning", "atpSwabTestRequired", "ATP Swab Test Required")}
                </div>
                
                <div>
                  <Label htmlFor="atp_result">{t("lineCleaning", "atpTestResult", "ATP Test Result")} *</Label>
                  <Select value={atpResult} onValueChange={setAtpResult}>
                    <SelectTrigger id="atp_result" className="mt-1">
                      <SelectValue placeholder={t("lineCleaning", "selectResult", "Select result")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">{t("atp", "pass", "Pass")}</SelectItem>
                      <SelectItem value="fail">{t("atp", "fail", "Fail")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="atp_value">{t("lineCleaning", "rluValue", "RLU Value")} ({t("common", "optional", "optional")})</Label>
                  <Input
                    id="atp_value"
                    type="number"
                    value={atpValue}
                    onChange={(e) => setAtpValue(e.target.value)}
                    placeholder="e.g., 150"
                  />
                </div>

                <div>
                  <Label htmlFor="atp_comments">
                    {t("lineCleaning", "atpComments", "ATP Comments")} {atpResult === "fail" && <span className="text-rose-600">*</span>}
                  </Label>
                  <Textarea
                    id="atp_comments"
                    value={atpComments}
                    onChange={(e) => setAtpComments(e.target.value)}
                    placeholder={atpResult === "fail" ? t("lineCleaning", "atpFailedPlaceholder", "Required for failed tests - describe the issue and corrective action...") : t("lineCleaning", "atpPassedPlaceholder", "Optional notes about the test...")}
                    rows={3}
                    className={cn(atpResult === "fail" && !atpComments.trim() && "border-rose-500")}
                  />
                  {atpResult === "fail" && (
                    <p className="text-xs text-rose-600 mt-1">
                      {t("lineCleaning", "atpCommentsMandatory", "Comments are mandatory for failed ATP tests")}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t("tasks", "digitalSignature", "Digital Signature")} *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
                  <X className="w-4 h-4 mr-1" />
                  {t("common", "clear", "Clear")}
                </Button>
              </div>
              <div className="border-2 border-slate-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: "w-full h-[150px] cursor-crosshair touch-none"
                  }}
                  backgroundColor="rgb(255, 255, 255)"
                  penColor="black"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{t("lineCleaning", "signToConfirmCompletion", "Please sign above to confirm completion")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOffModalOpen(false)}>
              {t("common", "cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleConfirmSignOff}
              disabled={signOffMutation.isPending || !hoursWorked}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {signOffMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("lineCleaning", "signOff", "Sign Off")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Post-Clean Inspection Sign-Off Modal */}
      <PostCleanFinalSignOff
        open={finalSignOffOpen}
        onOpenChange={setFinalSignOffOpen}
        assignmentId={assignmentId}
        assignment={assignment}
        inspector={employee}
        areas={areas}
        allAssets={allAssets}
        areaSignOffs={areaSignOffs}
        onComplete={handleFinalSignOffComplete}
        t={t}
      />

      {/* Q&A Assistant Button */}
      <EmployeeQAButton
        context="line_cleaning"
        contextId={assignmentId}
        contextTitle={`${line?.name || 'Line'} Cleaning`}
        organizationId={employee?.organization_id}
        employee={employee}
      />
    </div>
  );
}