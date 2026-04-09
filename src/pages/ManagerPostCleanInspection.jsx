// @ts-nocheck
import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import {
  OrganizationRepo, LineCleaningAssignmentRepo, AreaRepo, AssetRepo,
  AreaSignOffRepo, PostCleanInspectionRepo
} from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package2, CheckCircle2, Clock, Loader2, ClipboardCheck, Droplet, ChevronRight, Factory, CalendarDays, AlertTriangle } from "lucide-react";
import { format, parseISO, subDays, isAfter, startOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import PostCleanInspectionModal from "@/components/linecleanings/PostCleanInspectionModal";

export default function ManagerPostCleanInspection() {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectingArea, setInspectingArea] = useState(null);
  const [dateFilter, setDateFilter] = useState("7days");
  const queryClient = useQueryClient();

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await isAuthenticated();
        if (!isAuth) {
          window.location.href = '/ManagerLogin';
          return;
        }
        const userData = await getCurrentUser();
        setUser(userData);

        const siteCode = localStorage.getItem("site_code");
        if (!siteCode) {
          window.location.href = createPageUrl("Home");
          return;
        }
        const orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        } else {
          window.location.href = createPageUrl("Home");
          return;
        }
      } catch (e) {
        window.location.href = '/ManagerLogin';
        return;
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  // Fetch active line cleaning assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["postclean_assignments", orgId],
    queryFn: async () => {
      const all = await LineCleaningAssignmentRepo.filter({
        organization_id: orgId
      }, "-scheduled_date", 50);
      return all.filter(a => a.status === "in_progress" || a.status === "completed");
    },
    enabled: !!orgId
  });

  // Fetch areas and assets for the selected assignment's line
  const selectedLineId = selectedAssignment?.production_line_id;

  const { data: areas = [] } = useQuery({
    queryKey: ["postclean_areas", selectedLineId, orgId],
    queryFn: () => AreaRepo.filter({ organization_id: orgId, production_line_id: selectedLineId }),
    enabled: !!selectedLineId && !!orgId
  });

  const { data: allAssets = [] } = useQuery({
    queryKey: ["postclean_assets", selectedLineId, orgId],
    queryFn: () => AssetRepo.filter({ organization_id: orgId, production_line_id: selectedLineId }),
    enabled: !!selectedLineId && !!orgId
  });

  const { data: areaSignOffs = [], isLoading: signOffsLoading } = useQuery({
    queryKey: ["postclean_signoffs", selectedAssignment?.id],
    queryFn: () => AreaSignOffRepo.filter({ line_cleaning_assignment_id: selectedAssignment.id }),
    enabled: !!selectedAssignment?.id
  });

  // For the assignment list — fetch sign-offs for all assignments to show counts
  const { data: allSignOffs = [] } = useQuery({
    queryKey: ["postclean_all_signoffs", orgId],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: orgId }, "-signed_off_at", 500),
    enabled: !!orgId && !selectedAssignment
  });

  const inspectionMutation = useMutation({
    mutationFn: async (data) => {
      const { areaId, results, signatureData } = data;
      const updates = [];
      let passedCount = 0;
      let failedCount = 0;

      for (const assetId in results) {
        const result = results[assetId];
        const signOff = areaSignOffs.find(s => s.asset_id === assetId && s.area_id === areaId);
        if (signOff) {
          if (result.passed) {
            passedCount++;
            updates.push(
              AreaSignOffRepo.update(signOff.id, {
                status: "passed_inspection",
                inspection_notes: result.notes,
                inspection_photo_url: result.photo_url || null,
                inspected_by: user.display_name || user.full_name || user.email,
                inspected_at: new Date().toISOString(),
                needs_reinspection: false
              })
            );
          } else {
            failedCount++;
            // Failed assets get reset to pending_inspection with needs_reinspection flag
            // This continues the cycle until all pass
            updates.push(
              AreaSignOffRepo.update(signOff.id, {
                status: "pending_inspection",
                inspection_notes: result.notes,
                inspection_photo_url: result.photo_url || null,
                inspected_by: user.display_name || user.full_name || user.email,
                inspected_at: new Date().toISOString(),
                needs_reinspection: true,
                reinspection_count: (signOff.reinspection_count || 0) + 1
              })
            );
          }
        }
      }

      await Promise.all(updates);

      await PostCleanInspectionRepo.create({
        organization_id: orgId,
        line_cleaning_assignment_id: selectedAssignment.id,
        area_id: areaId,
        inspector_email: user.email,
        inspector_name: user.display_name || user.full_name || user.email,
        inspection_date: new Date().toISOString(),
        signature_data: signatureData,
        results: results,
        total_assets: Object.keys(results).length,
        passed_assets: passedCount,
        failed_assets: failedCount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postclean_signoffs"] });
      queryClient.invalidateQueries({ queryKey: ["postclean_all_signoffs"] });
      // Also invalidate shared query keys used by ManagerDashboard Records tab
      queryClient.invalidateQueries({ queryKey: ["inspection_records"] });
      queryClient.invalidateQueries({ queryKey: ["area_sign_offs"] });
      queryClient.invalidateQueries({ queryKey: ["preop_inspections"] });
      queryClient.invalidateQueries({ queryKey: ["line_cleaning_assignments"] });
      setInspectionModalOpen(false);
      setInspectingArea(null);
      toast.success("Post-clean inspection completed! Failed assets have been sent back for re-cleaning.");
    }
  });

  const handleStartInspection = (area) => {
    setInspectingArea(area);
    setInspectionModalOpen(true);
  };

  const handleSubmitInspection = (results, signatureData) => {
    inspectionMutation.mutate({
      areaId: inspectingArea.id,
      results,
      signatureData
    });
  };

  if (isInitializing || assignmentsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Enrich assignments with sign-off data and filter by date
  const enrichedAssignments = assignments.map(assignment => {
    const assignSignOffs = allSignOffs.filter(s => s.line_cleaning_assignment_id === assignment.id);
    const totalSO = assignSignOffs.length;
    const passedSO = assignSignOffs.filter(s => s.status === "passed_inspection").length;
    const pendingSO = assignSignOffs.filter(s => s.status === "pending_inspection" || s.status === "failed_inspection").length;
    const needsReinspection = assignSignOffs.filter(s => s.needs_reinspection && s.status === "pending_inspection").length;
    const allDone = totalSO > 0 && passedSO === totalSO;
    return { ...assignment, totalSO, passedSO, pendingSO, needsReinspection, allDone };
  });

  // Date filter
  const getDateCutoff = () => {
    if (dateFilter === "today") return startOfDay(new Date());
    if (dateFilter === "7days") return startOfDay(subDays(new Date(), 7));
    if (dateFilter === "30days") return startOfDay(subDays(new Date(), 30));
    return null; // "all"
  };

  const dateCutoff = getDateCutoff();
  const filteredAssignments = enrichedAssignments.filter(a => {
    if (!dateCutoff) return true;
    if (!a.scheduled_date) return true;
    return isAfter(parseISO(a.scheduled_date + "T00:00:00"), dateCutoff) || 
           format(parseISO(a.scheduled_date + "T00:00:00"), "yyyy-MM-dd") === format(dateCutoff, "yyyy-MM-dd");
  });

  // Split into awaiting inspection vs completed
  const awaitingInspection = filteredAssignments.filter(a => a.pendingSO > 0 || (!a.allDone && a.totalSO === 0));
  const completedInspections = filteredAssignments.filter(a => a.allDone && a.totalSO > 0);

  // Group by line name
  const groupByLine = (items) => {
    const groups = {};
    for (const item of items) {
      const lineName = item.production_line_name || "Unknown Line";
      if (!groups[lineName]) groups[lineName] = [];
      groups[lineName].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const renderAssignmentCard = (assignment) => (
    <Card
      key={assignment.id}
      className={cn(
        "p-4 bg-white shadow-sm hover:shadow-lg transition-all cursor-pointer",
        assignment.allDone ? "border-l-4 border-l-emerald-500" :
        assignment.pendingSO > 0 ? "border-l-4 border-l-amber-500" : ""
      )}
      onClick={() => setSelectedAssignment(assignment)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            assignment.allDone ? "bg-emerald-100" :
            assignment.pendingSO > 0 ? "bg-amber-100" : "bg-cyan-100"
          )}>
            {assignment.allDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : assignment.pendingSO > 0 ? (
              <Clock className="w-5 h-5 text-amber-600" />
            ) : (
              <Package2 className="w-5 h-5 text-cyan-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {assignment.allDone && <Badge className="bg-emerald-100 text-emerald-700 text-xs rounded-full">All Passed</Badge>}
              {assignment.needsReinspection > 0 && (
                <Badge className="bg-amber-100 text-amber-800 text-xs rounded-full">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {assignment.needsReinspection} Needs Reinspection
                </Badge>
              )}
              {assignment.pendingSO > 0 && assignment.needsReinspection === 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-xs rounded-full">{assignment.pendingSO} awaiting</Badge>
              )}
              {!assignment.allDone && assignment.pendingSO === 0 && assignment.totalSO === 0 && (
                <Badge variant="outline" className="text-xs rounded-full">In Progress</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {assignment.totalSO} assets signed off • {assignment.passedSO} passed
              {assignment.scheduled_date && ` • ${format(parseISO(assignment.scheduled_date + "T00:00:00"), "MMM d")}`}
              {assignment.shift_name && ` • ${assignment.shift_name}`}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
      </div>
    </Card>
  );

  // Assignment list view
  if (!selectedAssignment) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Button
            variant="outline"
            onClick={() => window.location.href = createPageUrl("SanitationProgram")}
            className="mb-4 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sanitation
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Post-Clean Inspection</h1>
              <p className="text-slate-600">Inspector: {user?.display_name || user?.full_name || user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40 bg-white rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <Card className="p-8 text-center bg-white border-0 shadow-lg">
              <Factory className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Line Cleanings Found</h3>
              <p className="text-slate-500">No in-progress or completed line cleanings match your filter.</p>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Awaiting Inspection Section */}
              {awaitingInspection.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Awaiting Inspection ({awaitingInspection.length})
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {groupByLine(awaitingInspection).map(([lineName, lineAssignments]) => (
                      <div key={lineName}>
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <Package2 className="w-4 h-4" />
                          {lineName}
                        </h3>
                        <div className="grid gap-2">
                          {lineAssignments.map(renderAssignmentCard)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Inspections Section */}
              {completedInspections.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Completed ({completedInspections.length})
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {groupByLine(completedInspections).map(([lineName, lineAssignments]) => (
                      <div key={lineName}>
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <Package2 className="w-4 h-4" />
                          {lineName}
                        </h3>
                        <div className="grid gap-2">
                          {lineAssignments.map(renderAssignmentCard)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detail view — mirrors LineCleaningDetail but inspection-only
  const totalAssets = allAssets.length;
  const passedAssets = areaSignOffs.filter(s => s.status === "passed_inspection").length;
  const progress = totalAssets > 0 ? Math.round((passedAssets / totalAssets) * 100) : 0;

  const getAssetSignOff = (assetId) => areaSignOffs.find(s => s.asset_id === assetId);

  const isAreaComplete = (areaId) => {
    const areaAssets = allAssets.filter(a => a.area_id === areaId);
    return areaAssets.length > 0 && areaAssets.every(asset => {
      const signOff = getAssetSignOff(asset.id);
      return signOff && signOff.status === "passed_inspection";
    });
  };

  const isAreaReadyForInspection = (areaId) => {
    const areaAssets = allAssets.filter(a => a.area_id === areaId);
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
            variant="outline"
            onClick={() => {
              setSelectedAssignment(null);
              setInspectingArea(null);
            }}
            className="mb-4 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lines
          </Button>

          <Card className="p-6 bg-white border-0 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-3 rounded-lg bg-cyan-50">
                <Package2 className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{selectedAssignment.production_line_name}</h1>
                <p className="text-slate-600 mt-1">Post-Clean Inspection • {user?.display_name || user?.full_name || user?.email}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  {selectedAssignment.scheduled_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(parseISO(selectedAssignment.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
                      {selectedAssignment.shift_name && ` • ${selectedAssignment.shift_name} Shift`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Progress: {passedAssets} / {totalAssets} assets passed inspection
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

            {progress === 100 && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-full flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">All assets passed — Line is ready for pre-op inspection</span>
              </div>
            )}
          </Card>
        </div>

        {signOffsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {areas.map((area, idx) => {
                const areaAssets = allAssets.filter(a => a.area_id === area.id);
                const complete = isAreaComplete(area.id);
                const readyForInspection = isAreaReadyForInspection(area.id);

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
                            <Badge className="bg-emerald-600 rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                          {readyForInspection && (() => {
                            const areaAssetsForBadge = allAssets.filter(a => a.area_id === area.id);
                            const hasReinspection = areaAssetsForBadge.some(a => {
                              const so = getAssetSignOff(a.id);
                              return so?.needs_reinspection && so?.status === "pending_inspection";
                            });
                            return hasReinspection ? (
                              <Badge className="bg-amber-100 text-amber-800 rounded-full">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Needs Reinspection
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white rounded-full">
                                Awaiting Inspection
                              </Badge>
                            );
                          })()}
                          <Badge variant="outline" className="rounded-full">
                            {areaAssets.filter(a => getAssetSignOff(a.id)).length} / {areaAssets.length} assets
                          </Badge>
                        </div>
                        {area.description && (
                          <p className="text-sm text-slate-600">{area.description}</p>
                        )}
                        {readyForInspection && (
                          <Button
                            size="sm"
                            onClick={() => handleStartInspection(area)}
                            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto rounded-full"
                          >
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Post-Clean Inspection
                          </Button>
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
                                signOff?.status === "pending_inspection" ? "bg-amber-50 border-amber-200" :
                                "bg-slate-50 border-slate-200"
                              )}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-medium text-slate-900">{asset.name}</h3>
                                  {asset.requires_atp_swab && (
                                    <Badge variant="outline" className="text-xs rounded-full">
                                      <Droplet className="w-3 h-3 mr-1" />
                                      ATP Required
                                    </Badge>
                                  )}
                                  {isComplete && (
                                    <Badge className="bg-emerald-600 text-xs rounded-full">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Passed
                                    </Badge>
                                  )}
                                  {signOff?.status === "pending_inspection" && (
                                    <Badge className="bg-amber-500 text-white text-xs rounded-full">
                                      Awaiting Inspection
                                    </Badge>
                                  )}
                                  {signOff?.needs_reinspection && signOff?.status === "pending_inspection" && (
                                    <Badge className="bg-amber-100 text-amber-800 text-xs rounded-full">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Needs Reinspection
                                    </Badge>
                                  )}
                                  {signOff?.status === "failed_inspection" && (
                                    <Badge className="bg-rose-600 text-xs rounded-full">
                                      Failed - Re-clean Required
                                    </Badge>
                                  )}
                                  {!signOff && (
                                    <Badge variant="outline" className="text-xs text-slate-400 rounded-full">
                                      Not Cleaned Yet
                                    </Badge>
                                  )}
                                </div>
                                {asset.description && (
                                  <p className="text-sm text-slate-600 mb-2">{asset.description}</p>
                                )}
                                {signOff && (
                                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                                    <div>Cleaned by {signOff.employee_name || signOff.employee_email}</div>
                                    <div>Time: {signOff.hours_worked}h</div>
                                    {signOff.notes && <div>Notes: {signOff.notes}</div>}
                                    {signOff.atp_test_result && signOff.atp_test_result !== "not_required" && (
                                      <div className="mt-2 p-2 bg-slate-100 rounded space-y-1">
                                        <div className="font-semibold text-slate-700 flex items-center gap-1">
                                          <Droplet className="w-3 h-3" />
                                          ATP Test: <span className={cn(
                                            "ml-1",
                                            signOff.atp_test_result === "pass" ? "text-emerald-600" : "text-rose-600"
                                          )}>{signOff.atp_test_result === "pass" ? "Pass" : "Fail"}</span>
                                        </div>
                                        {signOff.atp_test_value && <div>RLU Value: {signOff.atp_test_value}</div>}
                                        {signOff.atp_test_comments && <div>ATP Notes: {signOff.atp_test_comments}</div>}
                                      </div>
                                    )}
                                    {signOff.inspection_notes && (
                                      <div className="text-rose-600 font-medium">
                                        Inspector Notes: {signOff.inspection_notes}
                                      </div>
                                    )}
                                    {signOff.inspection_photo_url && (
                                      <div className="mt-2">
                                        <img 
                                          src={signOff.inspection_photo_url} 
                                          alt="Inspection photo" 
                                          className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                                        />
                                      </div>
                                    )}
                                    {signOff.reinspection_count > 0 && (
                                      <div className="text-amber-600 font-medium flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Reinspection #{signOff.reinspection_count}
                                      </div>
                                    )}
                                  </div>
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
        )}
      </div>

      {/* Post-Clean Inspection Modal */}
      <PostCleanInspectionModal
        open={inspectionModalOpen}
        onOpenChange={setInspectionModalOpen}
        area={inspectingArea}
        assets={allAssets.filter(a => a.area_id === inspectingArea?.id)}
        signOffs={areaSignOffs.filter(s => s.area_id === inspectingArea?.id)}
        onSubmit={handleSubmitInspection}
        isLoading={inspectionMutation.isPending}
      />
    </div>
  );
}