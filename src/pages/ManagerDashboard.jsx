// @ts-nocheck
import { useState, useEffect } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import {
  OrganizationRepo, TaskRepo, EmployeeRepo, SiteSettingsRepo, AreaSignOffRepo,
  CrewRepo, TaskGroupRepo, LineCleaningAssignmentRepo, ProductionLineRepo,
  AreaRepo, AssetRepo, AssetGroupRepo, EmployeeSessionRepo, AnnouncementRepo,
  SanitaryReportRepo, PostCleanInspectionRepo, PreOpInspectionRepo,
  AnonymousFeedbackRepo, EmployeePeerFeedbackRepo, DrainLocationRepo,
  DrainCleaningRecordRepo, RainDiverterRepo, DiverterInspectionRepo,
  ChemicalInventoryRecordRepo, ChemicalCountEntryRepo, EmployeeTrainingRepo,
  TrainingDocumentRepo, CompetencyEvaluationRepo, SanitationDowntimeRepo,
  CAPARepo, PestFindingRepo, PestDeviceRepo, PestServiceReportRepo,
  PestThresholdRepo, PestEscalationMarkerRepo, EMPSampleRepo, EMPSiteRepo,
  EMPThresholdRepo, TaskCommentRepo
} from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Search, ClipboardList, FileText, AlertTriangle, X
} from "lucide-react";


import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear, addDays, isToday, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import PerformanceScoresCard from "@/components/dashboard/PerformanceScoresCard";
import TaskCard from "@/components/dashboard/TaskCard";
import EmployeeListView from "@/components/dashboard/EmployeeListView";
import TaskFormModal from "@/components/modals/TaskFormModal";
import EmployeeFormModal from "@/components/modals/EmployeeFormModal";
import AutoAssignmentModal from "@/components/tasks/AutoAssignmentModal";
import TaskGroupCard from "@/components/taskgroups/TaskGroupCard";
import TaskGroupFormModal from "@/components/taskgroups/TaskGroupFormModal";

import CompactEmployeePerformanceSection from "@/components/performance/CompactEmployeePerformanceSection";
import EmployeeDetailModal from "@/components/performance/EmployeeDetailModal";
import TaskCommentModal from "@/components/modals/TaskCommentModal";
import ATPModule from "@/components/dashboard/ATPModule";
import TasksByFrequency from "@/components/tasks/TasksByFrequency";

import CrewsManagement from "./CrewsManagement";
import LineCleaningsSetup from "./LineCleaningsSetup";
import LineCleaningAssignments from "./LineCleaningAssignments";

import BadgesManagement from "./BadgesManagement";
import PlantSchedule from "./PlantSchedule";
import ScheduleManagement from "./ScheduleManagement";
import SiteSettings from "./SiteSettings";
import Analytics from "./Analytics";
import ChemicalManagement from "./ChemicalManagement";
import TrainingDocuments from "./TrainingDocuments";
import CompetencyManagement from "./CompetencyManagement";
import MentorCoachingMode from "@/components/coaching/MentorCoachingMode";
import ScenarioSimulator from "@/components/simulation/ScenarioSimulator";
import FatigueDetectionEngine from "@/components/fatigue/FatigueDetectionEngine";
import AnnouncementFormModal from "@/components/announcements/AnnouncementFormModal";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import FeedbackTab from "@/components/dashboard/FeedbackTab";
import ConditionReportsTab from "@/components/dashboard/ConditionReportsTab";
import OverdueTasksModal from "@/components/dashboard/OverdueTasksModal";
import RecordsTab from "@/components/dashboard/RecordsTab";
import { isTaskOverdue } from "@/components/dashboard/taskOverdueCheck";
import BulkEditTasksModal from "@/components/modals/BulkEditTasksModal";
import BulkTaskImportModal from "@/components/tasks/BulkTaskImportModal";
import TrainingGapsPanel from "@/components/training/TrainingGapsPanel";
import VerifyTaskModal from "@/components/modals/VerifyTaskModal";
import PendingVerificationList from "@/components/verification/PendingVerificationList";
import BulkShiftVerificationModal from "@/components/verification/BulkShiftVerificationModal";
import { toast } from "sonner";
import SanitationHealthScore from "@/components/dashboard/SanitationHealthScore";
import DecisionIntelligence from "@/components/dashboard/DecisionIntelligence";
import NarrativePreview from "@/components/dashboard/NarrativePreview";
import WidgetConfigModal, { getWidgetConfig } from "@/components/dashboard/WidgetConfigModal";
import LiveShiftProgress from "@/components/dashboard/LiveShiftProgress";
import LineCleaningTracker from "@/components/dashboard/LineCleaningTracker";
import WaysToWin from "@/components/dashboard/WaysToWin";
import DraggableWidgetGrid from "@/components/dashboard/DraggableWidgetGrid";
import { calculatePerformanceScores as calcPerfScores, calculateExpectedTasks as calcExpTasks } from "@/components/dashboard/performanceCalculations";
import MobileEmployeeList from "@/components/mobile/MobileEmployeeList";
import MobileManagerBottomNav from "@/components/mobile/MobileManagerBottomNav";
import useManagerBadgeCounts from "@/hooks/useManagerBadgeCounts";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [taskGroupModalOpen, setTaskGroupModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingTaskGroup, setEditingTaskGroup] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [performanceTimeRange, setPerformanceTimeRange] = useState("week");
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState(null);
  const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false);
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [taskForAutoAssign, setTaskForAutoAssign] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [taskToComment, setTaskToComment] = useState(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [tasksForBulkEdit, setTasksForBulkEdit] = useState([]);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [widgetConfigOpen, setWidgetConfigOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState(() => getWidgetConfig());
  const [showWidgetHint, setShowWidgetHint] = useState(false);
  const [verifyTaskModalOpen, setVerifyTaskModalOpen] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState(null);
  const [bulkVerifyModalOpen, setBulkVerifyModalOpen] = useState(false);
  const [shiftGroupToVerify, setShiftGroupToVerify] = useState(null);
  const [overdueModalOpen, setOverdueModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

  // Badge counts for notifications
  const badgeCounts = useManagerBadgeCounts(orgId);

  // Helper to get the manager's display name (prefer display_name > full_name > email)
  const getManagerDisplayName = () => user?.display_name || user?.full_name || user?.email || "";

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show widget hint only on first-ever visit to manager dashboard (brand new site)
  useEffect(() => {
    const hintShown = localStorage.getItem("widget_customize_hint_shown");
    const hasVisitedBefore = localStorage.getItem("manager_dashboard_visited");
    
    // Only show tip if this is the very first visit AND the tab is overview
    if (!hintShown && !hasVisitedBefore && activeTab === "overview") {
      const timer = setTimeout(() => setShowWidgetHint(true), 2000);
      return () => clearTimeout(timer);
    }
    
    // Mark that user has visited the dashboard (even if they don't dismiss the hint)
    if (!hasVisitedBefore) {
      localStorage.setItem("manager_dashboard_visited", "true");
    }
  }, [activeTab]);

  const dismissWidgetHint = () => {
    setShowWidgetHint(false);
    localStorage.setItem("widget_customize_hint_shown", "true");
  };

  // Handle URL parameters and custom events
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'newTask') { setEditingTask(null); setTaskModalOpen(true); }
    const tabParam = urlParams.get('tab');
    if (tabParam) setActiveTab(tabParam);
    if (urlParams.get('action') || tabParam) window.history.replaceState({}, '', window.location.pathname);
    const openNewTask = () => { setEditingTask(null); setTaskModalOpen(true); };
    window.addEventListener("openNewTaskModal", openNewTask);
    return () => window.removeEventListener("openNewTaskModal", openNewTask);
  }, []);

  // Use shared cached queries instead of raw API calls
  const siteCode = localStorage.getItem('site_code');
  
  const { data: cachedUser, isSuccess: authDone } = useQuery({
    queryKey: ["auth_me"],
    queryFn: async () => {
      const isAuth = await isAuthenticated();
      if (!isAuth) return null;
      return getCurrentUser();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: cachedOrg, isSuccess: orgDone } = useQuery({
    queryKey: ["organization_by_site_code", siteCode],
    queryFn: async () => {
      let orgs = await OrganizationRepo.filter({ site_code: siteCode, status: "active" });
      if (!orgs?.length) orgs = await OrganizationRepo.filter({ site_code: siteCode });
      return orgs[0] || null;
    },
    enabled: !!siteCode,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (authDone) setUser(cachedUser || null);
  }, [authDone, cachedUser]);

  useEffect(() => {
    if (orgDone && cachedOrg?.id && !orgId) setOrgId(cachedOrg.id);
  }, [orgDone, cachedOrg, orgId]);

  // Shared query config to prevent rate limiting
  const queryConfig = {
    staleTime: 2 * 60 * 1000, // Data fresh for 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(3000 * 2 ** attemptIndex, 30000),
  };

  // ── TIER 1: Essential data — loads immediately when orgId is available ──
  // Only 4 queries fire at once (tasks, employees, siteSettings, areaSignOffs)
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", orgId],
    queryFn: () => TaskRepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", orgId],
    queryFn: () => EmployeeRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings", orgId],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: orgId }),
    enabled: !!orgId,
    ...queryConfig
  });

  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["area_sign_offs", orgId],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: orgId }, "-signed_off_at", 500),
    enabled: !!orgId,
    ...queryConfig
  });

  // ── TIER 2: Secondary data — loads only after tier 1 finishes ──
  const tier1Done = !tasksLoading && !employeesLoading && !!orgId;
  const tier2Config = { enabled: tier1Done, ...queryConfig };

  const { data: crews = [] } = useQuery({ queryKey: ["crews", orgId], queryFn: () => CrewRepo.filter({ organization_id: orgId, status: "active" }), ...tier2Config });
  const { data: taskGroups = [] } = useQuery({ queryKey: ["task_groups", orgId], queryFn: () => TaskGroupRepo.filter({ organization_id: orgId, status: "active" }), ...tier2Config });
  const { data: lineAssignments = [] } = useQuery({ queryKey: ["line_cleaning_assignments", orgId], queryFn: () => LineCleaningAssignmentRepo.filter({ organization_id: orgId }, "-created_date", 200), ...tier2Config });
  const { data: productionLines = [] } = useQuery({ queryKey: ["production_lines", orgId], queryFn: () => ProductionLineRepo.filter({ organization_id: orgId }), ...tier2Config });
  const { data: areas = [] } = useQuery({ queryKey: ["areas", orgId], queryFn: () => AreaRepo.filter({ organization_id: orgId }), ...tier2Config });
  const { data: assets = [] } = useQuery({ queryKey: ["assets", orgId], queryFn: () => AssetRepo.filter({ organization_id: orgId }), ...tier2Config });
  const { data: assetGroups = [] } = useQuery({ queryKey: ["asset_groups", orgId], queryFn: () => AssetGroupRepo.filter({ organization_id: orgId }), ...tier2Config });
  const { data: employeeSessions = [] } = useQuery({ queryKey: ["employee_sessions", orgId], queryFn: () => EmployeeSessionRepo.filter({ organization_id: orgId }, "-session_date", 200), ...tier2Config });
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements", orgId], queryFn: () => AnnouncementRepo.filter({ organization_id: orgId }, "-created_date"), ...tier2Config });
  const { data: sanitaryReports = [] } = useQuery({ queryKey: ["sanitary_reports", orgId], queryFn: () => SanitaryReportRepo.filter({ organization_id: orgId }, "-created_date"), ...tier2Config });

  // ── TIER 2b: Tab-specific data — only when relevant tab is active ──
  const { data: inspectionRecords = [] } = useQuery({
    queryKey: ["inspection_records", orgId],
    queryFn: () => PostCleanInspectionRepo.filter({ organization_id: orgId }, "-inspection_date", 500),
    enabled: tier1Done && (activeTab === "records" || activeTab === "overview"),
    ...queryConfig
  });

  const { data: preOpInspections = [] } = useQuery({
    queryKey: ["preop_inspections", orgId],
    queryFn: () => PreOpInspectionRepo.filter({ organization_id: orgId }, "-inspection_date", 200),
    enabled: tier1Done && (activeTab === "records" || activeTab === "overview"),
    ...queryConfig
  });

  const { data: anonymousFeedback = [] } = useQuery({
    queryKey: ["anonymous_feedback", orgId],
    queryFn: () => AnonymousFeedbackRepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: tier1Done && (activeTab === "feedback" || activeTab === "overview"),
    ...queryConfig
  });

  const { data: peerFeedback = [] } = useQuery({
    queryKey: ["peer_feedback", orgId],
    queryFn: () => EmployeePeerFeedbackRepo.filter({ organization_id: orgId }, "-created_date"),
    enabled: tier1Done && (activeTab === "feedback" || activeTab === "overview"),
    ...queryConfig
  });

  // ── TIER 3: Health score / overview-only data — deferred until tier 1 done + overview tab ──
  const isOverviewTab = activeTab === "overview";
  const tier3Config = { enabled: tier1Done && isOverviewTab, ...queryConfig };

  const { data: drainLocations = [] } = useQuery({ queryKey: ["drain_locations_health", orgId], queryFn: () => DrainLocationRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: drainCleaningRecords = [] } = useQuery({ queryKey: ["drain_cleaning_records_health", orgId], queryFn: () => DrainCleaningRecordRepo.filter({ organization_id: orgId }, "-cleaned_at", 100), ...tier3Config });
  const { data: rainDiverters = [] } = useQuery({ queryKey: ["rain_diverters_health", orgId], queryFn: () => RainDiverterRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: diverterInspections = [] } = useQuery({ queryKey: ["diverter_inspections_health", orgId], queryFn: () => DiverterInspectionRepo.filter({ organization_id: orgId }, "-inspection_date", 100), ...tier3Config });
  const { data: chemicalInventoryRecords = [] } = useQuery({ queryKey: ["chemical_inventory_records_health", orgId], queryFn: () => ChemicalInventoryRecordRepo.filter({ organization_id: orgId }, "-week_start_date", 10), ...tier3Config });
  const { data: chemicalCountEntries = [] } = useQuery({ queryKey: ["chemical_count_entries_health", orgId], queryFn: () => ChemicalCountEntryRepo.filter({ organization_id: orgId }, "-counted_at", 200), ...tier3Config });
  const { data: employeeTrainings = [] } = useQuery({ queryKey: ["employee_trainings_health", orgId], queryFn: () => EmployeeTrainingRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: trainingDocuments = [] } = useQuery({ queryKey: ["training_documents_health", orgId], queryFn: () => TrainingDocumentRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: competencyEvaluations = [] } = useQuery({ queryKey: ["competency_evaluations_health", orgId], queryFn: () => CompetencyEvaluationRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: downtimeEvents = [] } = useQuery({ queryKey: ["downtime_events", orgId], queryFn: () => SanitationDowntimeRepo.filter({ organization_id: orgId }, "-event_date"), ...tier3Config });
  const { data: capas = [] } = useQuery({ queryKey: ["capas", orgId], queryFn: () => CAPARepo.filter({ organization_id: orgId }, "-created_date"), ...tier3Config });

  // Pest Control & EMP queries — only on overview tab after tier 1
  const { data: pestFindings = [] } = useQuery({ queryKey: ["pest_findings", orgId], queryFn: () => PestFindingRepo.filter({ organization_id: orgId }, "-service_date", 100), ...tier3Config });
  const { data: pestDevices = [] } = useQuery({ queryKey: ["pest_devices", orgId], queryFn: () => PestDeviceRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: pestServiceReports = [] } = useQuery({ queryKey: ["pest_service_reports", orgId], queryFn: () => PestServiceReportRepo.filter({ organization_id: orgId }, "-service_date", 20), ...tier3Config });
  const { data: pestThresholds = [] } = useQuery({ queryKey: ["pest_thresholds", orgId], queryFn: () => PestThresholdRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: pestEscalationMarkers = [] } = useQuery({ queryKey: ["pest_escalation_markers", orgId], queryFn: () => PestEscalationMarkerRepo.filter({ organization_id: orgId }, "-escalation_date", 50), ...tier3Config });
  const { data: empSamples = [] } = useQuery({ queryKey: ["emp_samples", orgId], queryFn: () => EMPSampleRepo.filter({ organization_id: orgId }, "-collection_date", 100), ...tier3Config });
  const { data: empSites = [] } = useQuery({ queryKey: ["emp_sites", orgId], queryFn: () => EMPSiteRepo.filter({ organization_id: orgId }), ...tier3Config });
  const { data: empThresholds = [] } = useQuery({ queryKey: ["emp_thresholds", orgId], queryFn: () => EMPThresholdRepo.filter({ organization_id: orgId }), ...tier3Config });

  const taskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (id) {
        return TaskRepo.update(id, data);
      }
      return TaskRepo.create({ ...data, organization_id: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTaskModalOpen(false);
      setEditingTask(null);
      toast.success(editingTask ? "Task updated" : "Task created");
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      console.log("Deleting task with ID:", id);
      return TaskRepo.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (error) => {
      console.error("Delete task error:", error);
      toast.error("Failed to delete task: " + error.message);
    }
  });

  const employeeMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Strip form-only fields that don't exist in the employees table.
      // The adapter retry loop handles unknown columns, but filtering here
      // means the INSERT succeeds on the first attempt with no 400 errors.
      const { hire_date, birthday, evaluator_role, is_qa_team, display_badges, ...employeeData } = data;
      if (id) {
        return EmployeeRepo.update(id, employeeData);
      }
      return EmployeeRepo.create({ ...employeeData, organization_id: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEmployeeModalOpen(false);
      setEditingEmployee(null);
      toast.success(editingEmployee ? "Employee updated" : "Employee added");
    },
    onError: (err) => {
      const msg = err?.message || err?.details || "Unknown error";
      toast.error(`Failed to save employee: ${msg}`);
      console.error("[employeeMutation] error:", err);
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id) => EmployeeRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      toast.success("Employee removed");
    }
  });

  const taskGroupMutation = useMutation({
    mutationFn: ({ id, data }) => 
      id ? TaskGroupRepo.update(id, data) : TaskGroupRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_groups"] });
      setTaskGroupModalOpen(false);
      setEditingTaskGroup(null);
      toast.success("Task group saved");
    }
  });

  const deleteTaskGroupMutation = useMutation({
    mutationFn: (id) => TaskGroupRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_groups"] });
      toast.success("Task group deleted");
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: (data) => TaskCommentRepo.create({ ...data, organization_id: orgId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_comments"] });
      setCommentModalOpen(false);
      setTaskToComment(null);
      toast.success("Comment added successfully!");
    }
  });

  const verifyTaskMutation = useMutation({
    mutationFn: async ({ taskId, notes, managerSignature }) => {
      const name = getManagerDisplayName();
      const d = { status: "verified", verified_by: name || user?.email, verified_at: new Date().toISOString(), verification_notes: notes || "" };
      if (managerSignature) d.verification_signature = managerSignature;
      return TaskRepo.update(taskId, d);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setVerifyTaskModalOpen(false);
      setTaskToVerify(null);
      toast.success("Task verified successfully!");
    }
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason }) => {
      const name = getManagerDisplayName();
      return TaskRepo.update(taskId, {
        status: "pending",
        completed_at: null,
        completion_notes: null,
        signature_data: null,
        rejection_reason: reason,
        rejected_by: name || user?.email,
        rejected_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setVerifyTaskModalOpen(false);
      setTaskToVerify(null);
      toast.success("Task rejected and reopened");
    }
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (data) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + data.duration_days);
      return AnnouncementRepo.create({
        ...data,
        organization_id: orgId,
        created_by: user?.email,
        created_by_name: getManagerDisplayName(),
        expiry_date: expiryDate.toISOString(),
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setAnnouncementModalOpen(false);
      toast.success("Announcement sent!");
    }
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => AnnouncementRepo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
    }
  });

  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, isRunning: false });

  const bulkUpdateTasksMutation = useMutation({
    mutationFn: async ({ taskIds, updateData }) => {
      const BATCH_SIZE = 5; // Process 5 at a time
      const DELAY_MS = 1000; // Wait 1 second between batches
      
      setBulkProgress({ current: 0, total: taskIds.length, isRunning: true });
      
      const results = [];
      for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
        const batch = taskIds.slice(i, i + BATCH_SIZE);
        
        // Process batch
        const batchResults = await Promise.all(
          batch.map(id => TaskRepo.update(id, updateData))
        );
        results.push(...batchResults);
        
        setBulkProgress({ current: Math.min(i + BATCH_SIZE, taskIds.length), total: taskIds.length, isRunning: true });
        
        // Delay before next batch (except for the last batch)
        if (i + BATCH_SIZE < taskIds.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
      
      setBulkProgress({ current: 0, total: 0, isRunning: false });
      return results;
    },
    onSuccess: (_, { taskIds }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setBulkEditModalOpen(false);
      setTasksForBulkEdit([]);
      toast.success(`Updated ${taskIds.length} tasks`);
    },
    onError: (error) => {
      setBulkProgress({ current: 0, total: 0, isRunning: false });
      toast.error(`Failed to update tasks: ${error.message}`);
    }
  });

  // Filter out group header tasks (is_group = true) from counts - only count actual work tasks
  const workTasks = tasks.filter(t => !t.is_group);

  // Calculate stats
  const stats = {
    total: workTasks.length,
    completed: workTasks.filter(t => t.status === "completed" || t.status === "verified").length,
    pending: workTasks.filter(t => t.status === "pending").length,
    in_progress: workTasks.filter(t => t.status === "in_progress").length,
    overdue: workTasks.filter(isTaskOverdue).length,
    verified: workTasks.filter(t => t.status === "verified").length
  };

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  // Weekly data
  const getWeeklyData = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayStr = format(day, "yyyy-MM-dd");
      const dayTasks = tasks.filter(t => t.due_date && t.due_date === dayStr);
      const completedTasks = dayTasks.filter(t => t.status === "completed" || t.status === "verified");
      
      days.push({
        day: format(day, "EEE"),
        assigned: dayTasks.length,
        completed: completedTasks.length
      });
    }
    
    return days;
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get task count per employee
  const getEmployeeTaskCount = (email) => {
    return tasks.filter(t => t.assigned_to === email && t.status !== "completed" && t.status !== "verified").length;
  };

  // Get date range for performance filter
  const getPerformanceDateRange = () => {
    const now = new Date();
    let start, end;

    switch (performanceTimeRange) {
      case "shift":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "day":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfDay(now);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfDay(now);
        break;
      case "quarter":
        start = startOfQuarter(now);
        end = endOfDay(now);
        break;
      case "year":
        start = startOfYear(now);
        end = endOfDay(now);
        break;
      default:
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfDay(now);
    }

    return { start, end };
  };

  // Get employee performance stats - focuses on current shift progress
  const getEmployeePerformanceStats = (employeeEmail) => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Find the employee's active session for today
    const activeSession = employeeSessions.find(s => 
      s.employee_email === employeeEmail && 
      s.status === "active"
    );
    
    // Count regular tasks due today
    const todaysTasks = tasks.filter(t => {
      if (t.assigned_to !== employeeEmail) return false;
      if (!t.due_date) return false;
      return t.due_date === today;
    });
    
    const completedTasks = todaysTasks.filter(t => t.status === "completed" || t.status === "verified").length;
    let total = todaysTasks.length;
    let completed = completedTasks;
    
    // Add special tasks from session
    if (activeSession) {
      // Diverter task
      if (activeSession.include_diverter_task) {
        total += 1;
        const diverterCompletedToday = diverterInspections.some(i => {
          if (i.inspection_date) {
            const inspectionDay = i.inspection_date.split('T')[0];
            if (inspectionDay === today) return true;
          }
          if (i.created_date) {
            const createdDay = typeof i.created_date === 'string' 
              ? i.created_date.split('T')[0] 
              : format(new Date(i.created_date), "yyyy-MM-dd");
            if (createdDay === today) return true;
          }
          return false;
        });
        if (diverterCompletedToday) completed += 1;
      }
      
      // Inventory task
      if (activeSession.include_inventory_task) {
        total += 1;
        const inventoryRecord = chemicalInventoryRecords[0];
        const inventoryCompleted = inventoryRecord && (
          inventoryRecord.status === "completed" || 
          inventoryRecord.status === "reviewed" || 
          inventoryRecord.status === "closed" ||
          (inventoryRecord.completed_at && inventoryRecord.completed_at.split('T')[0] === today)
        );
        if (inventoryCompleted) completed += 1;
      }
      
      // Drain cleaning tasks
      if (activeSession.selected_drains?.length > 0) {
        total += activeSession.selected_drains.length;
        const completedDrains = drainCleaningRecords.filter(r => 
          r.cleaned_at && r.cleaned_at.startsWith(today) && 
          activeSession.selected_drains.includes(r.drain_id)
        ).length;
        completed += completedDrains;
      }
    }

    return {
      total,
      completed,
      pending: total - completed,
      inProgress: todaysTasks.filter(t => t.status === "in_progress").length,
      shiftsWorked: employeeSessions.filter(s => s.employee_email === employeeEmail && s.status === "active").length
    };
  };

  const handleViewEmployeeDetail = (employee) => {
    setSelectedEmployeeForDetail(employee);
    setEmployeeDetailOpen(true);
  };

  const getEmployeeDetailData = () => {
    if (!selectedEmployeeForDetail) return { tasks: [], sessions: [] };

    const { start, end } = getPerformanceDateRange();
    
    const employeeTasks = tasks.filter(t => {
      if (t.assigned_to !== selectedEmployeeForDetail.email) return false;
      if (!t.due_date) return false;
      try {
        const dueDate = parseISO(t.due_date);
        if (isNaN(dueDate.getTime())) return false;
        return isWithinInterval(dueDate, { start, end });
      } catch {
        return false;
      }
    });

    const employeeSessionsInRange = employeeSessions.filter(s => {
      if (s.employee_email !== selectedEmployeeForDetail.email) return false;
      if (!s.session_date) return false;
      try {
        const sessionDate = parseISO(s.session_date);
        if (isNaN(sessionDate.getTime())) return false;
        return isWithinInterval(sessionDate, { start, end });
      } catch {
        return false;
      }
    });

    return {
      tasks: employeeTasks,
      sessions: employeeSessionsInRange
    };
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeModalOpen(true);
  };

  const handleDeleteEmployee = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleTaskGroupSubmit = (data) => {
    taskGroupMutation.mutate({ id: editingTaskGroup?.id, data });
  };

  const handleDeleteTaskGroup = (group) => {
    if (confirm(`Delete task group "${group.name}"?`)) {
      deleteTaskGroupMutation.mutate(group.id);
    }
  };

  const handleAutoAssign = (taskData) => {
    setTaskForAutoAssign(taskData);
    setAutoAssignModalOpen(true);
  };

  const handleConfirmAutoAssignment = async (employee) => {
    const taskData = {
      ...taskForAutoAssign,
      assigned_to: employee.email,
      assigned_to_name: employee.name,
      due_date: format(new Date(), "yyyy-MM-dd")
    };
    
    await taskMutation.mutateAsync({ id: editingTask?.id, data: taskData });
    setAutoAssignModalOpen(false);
    setTaskForAutoAssign(null);
    toast.success(`Task auto-assigned to ${employee.name}`);
  };

  const handleAddComment = (task) => {
    setTaskToComment(task);
    setCommentModalOpen(true);
  };

  const handleVerifyTask = (task) => {
    setTaskToVerify(task);
    setVerifyTaskModalOpen(true);
  };

  const handleBulkVerifyShift = (shiftGroup) => {
    setShiftGroupToVerify(shiftGroup);
    setBulkVerifyModalOpen(true);
  };

  const bulkVerifyTasksMutation = useMutation({
    mutationFn: async ({ taskIds, notes, managerSignature }) => {
      const name = getManagerDisplayName();
      const d = { status: "verified", verified_by: name || user?.email, verified_at: new Date().toISOString(), verification_notes: notes || "" };
      if (managerSignature) d.verification_signature = managerSignature;
      return Promise.all(taskIds.map(id => TaskRepo.update(id, d)));
    },
    onSuccess: (_, { taskIds }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setBulkVerifyModalOpen(false);
      setShiftGroupToVerify(null);
      toast.success(`Verified ${taskIds.length} tasks`);
    }
  });

  const handleBulkEdit = (selectedTasks) => {
    setTasksForBulkEdit(selectedTasks);
    setBulkEditModalOpen(true);
  };

  const handleBulkSave = async (updateData) => {
    const taskIds = tasksForBulkEdit.map(t => t.id);
    await bulkUpdateTasksMutation.mutateAsync({ taskIds, updateData });
  };

  const handleSubmitComment = (task, comment, commentType) => {
    createCommentMutation.mutate({
      task_id: task.id,
      task_title: task.title,
      employee_email: task.assigned_to,
      employee_name: task.assigned_to_name,
      manager_email: user?.email,
      manager_name: getManagerDisplayName(),
      comment: comment,
      comment_type: commentType,
      is_read: false
    });
  };

  const calculatePerformanceScores = () => calcPerfScores({ tasks, areaSignOffs, siteSettings: siteSettings[0] });
  const calculateExpectedTasks = () => calcExpTasks({ tasks, siteSettings: siteSettings[0] });

  // Custom task categories from site settings
  const customCategories = siteSettings[0]?.custom_task_categories || [];
  const handleAddCategory = async (newCat) => {
    const current = siteSettings[0]?.custom_task_categories || [];
    const updated = [...current, newCat];
    if (siteSettings[0]?.id) {
      await SiteSettingsRepo.update(siteSettings[0].id, { custom_task_categories: updated });
    } else {
      await SiteSettingsRepo.create({ organization_id: orgId, custom_task_categories: updated });
    }
    queryClient.invalidateQueries({ queryKey: ["site_settings", orgId] });
    toast.success(`Category "${newCat.label}" added`);
  };

  if (!orgId) {
    // If no site code exists, redirect to Home instead of spinning forever
    const storedCode = localStorage.getItem('site_code');
    if (!storedCode) {
      window.location.href = createPageUrl("Home");
      return null;
    }
    return <ReadyNormLoader />;
  }

  if (tasksLoading || employeesLoading) {
    return <ReadyNormLoader />;
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50", isMobile && "pb-20")}>




      <div className="w-full px-3 sm:px-4 md:px-6 max-w-[1600px] mx-auto py-3 sm:py-8">


        {/* Tabs */}
         <Tabs value={activeTab} onValueChange={(tab) => {
           setActiveTab(tab);
           // Refetch record-related data when switching to records tab to ensure freshness
           if (tab === "records") {
             queryClient.invalidateQueries({ queryKey: ["inspection_records", orgId] });
             queryClient.invalidateQueries({ queryKey: ["preop_inspections", orgId] });
             queryClient.invalidateQueries({ queryKey: ["area_sign_offs", orgId] });
             queryClient.invalidateQueries({ queryKey: ["line_cleaning_assignments", orgId] });
             queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
           }
         }} className="space-y-3 md:space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="relative space-y-4">
            {/* Widget hint tooltip */}
            {showWidgetHint && (
              <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-slate-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg max-w-[280px] text-center relative">
                  <button 
                    onClick={dismissWidgetHint}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className="font-medium mb-1">💡 Tip</p>
                  <p className="text-slate-300 text-xs mb-2">Hover over widgets to drag, drop and resize</p>
                  <button 
                    onClick={dismissWidgetHint}
                    className="text-xs text-slate-400 underline hover:text-slate-200"
                  >
                    Don't show again
                  </button>
                </div>
              </div>
            )}

            <DraggableWidgetGrid 
              widgets={visibleWidgets}
              onLayoutChange={(newLayout) => {}}
              onLongPress={() => { setWidgetConfigOpen(true); if (showWidgetHint) dismissWidgetHint(); }}
            >
              {/* Sanitation Health Score - Hero Metric */}
              {visibleWidgets.includes("health-score") && (
                <div data-widget-id="health-score">
                  <SanitationHealthScore
                    tasks={tasks}
                    employees={employees}
                    areaSignOffs={areaSignOffs}
                    drainLocations={drainLocations}
                    drainCleaningRecords={drainCleaningRecords}
                    rainDiverters={rainDiverters}
                    diverterInspections={diverterInspections}
                    chemicalInventoryRecords={chemicalInventoryRecords}
                    chemicalCountEntries={chemicalCountEntries}
                    employeeTrainings={employeeTrainings}
                    trainingDocuments={trainingDocuments}
                    competencyEvaluations={competencyEvaluations}
                    downtimeEvents={downtimeEvents}
                    capas={capas}
                    siteSettings={siteSettings[0] || {}}
                    pestFindings={pestFindings}
                    pestDevices={pestDevices}
                    pestServiceReports={pestServiceReports}
                    pestThresholds={pestThresholds}
                    pestEscalationMarkers={pestEscalationMarkers}
                    empSamples={empSamples}
                    empSites={empSites}
                    empThresholds={empThresholds}
                  />
                </div>
              )}

              {/* Executive Narrative Preview */}
              {visibleWidgets.includes("narrative-preview") && (
                <div data-widget-id="narrative-preview">
                  <NarrativePreview
                    tasks={tasks}
                    areaSignOffs={areaSignOffs}
                    drainCleaningRecords={drainCleaningRecords}
                    rainDiverters={rainDiverters}
                    onNavigate={(tab) => setActiveTab(tab)}
                  />
                </div>
              )}

              {/* Live Shift Progress */}
              {visibleWidgets.includes("live-shift-progress") && (
                <div data-widget-id="live-shift-progress">
                  <LiveShiftProgress
                    employees={employees}
                    sessions={employeeSessions}
                    tasks={tasks}
                    completedTasks={tasks.filter(t => t.status === "completed" || t.status === "verified")}
                    shiftSettings={siteSettings[0]} crews={crews} onEmployeeClick={handleViewEmployeeDetail}
                    areaSignOffs={areaSignOffs}
                    expectedTasks={calculateExpectedTasks()}
                  />
                </div>
              )}
              {/* Line Cleaning Tracker */}
              {visibleWidgets.includes("live-shift-progress") && (
                <div data-widget-id="line-cleaning">
                  <LineCleaningTracker
                    assignments={lineAssignments}
                    signOffs={areaSignOffs}
                    productionLines={productionLines}
                    areas={areas}
                    assets={assets}
                    employees={employees}
                  />
                </div>
              )}

              {/* Ways to Win */}
              {visibleWidgets.includes("live-shift-progress") && (
                <div data-widget-id="ways-to-win">
                  <WaysToWin
                    employees={employees}
                    sessions={employeeSessions}
                    tasks={tasks}
                    completedTasks={tasks.filter(t => t.status === "completed" || t.status === "verified")}
                    lineAssignments={lineAssignments}
                    signOffs={areaSignOffs}
                    verificationQueue={tasks.filter(t => t.status === "completed" && !t.verified_by)}
                    shiftSettings={siteSettings[0]}
                    crews={crews}
                    organizationId={orgId}
                    pestFindings={pestFindings}
                    pestEscalationMarkers={pestEscalationMarkers}
                    empSamples={empSamples}
                    empSites={empSites}
                  />
                </div>
              )}

              {/* Decision Intelligence - What Should I Do First */}
              {visibleWidgets.includes("decision-intelligence") && (
                <div data-widget-id="decision-intelligence">
                  <DecisionIntelligence
                    tasks={tasks}
                    employees={employees}
                    areaSignOffs={areaSignOffs}
                    drainLocations={drainLocations}
                    rainDiverters={rainDiverters}
                    diverterInspections={diverterInspections}
                    chemicalCountEntries={chemicalCountEntries}
                    employeeTrainings={employeeTrainings}
                    trainingDocuments={trainingDocuments}
                    competencyEvaluations={competencyEvaluations}
                    taskGroups={taskGroups}
                    productionLines={productionLines}
                    downtimeEvents={downtimeEvents}
                    capas={capas}
                    pestFindings={pestFindings}
                    pestServiceReports={pestServiceReports}
                    pestEscalationMarkers={pestEscalationMarkers}
                    empSamples={empSamples}
                    empSites={empSites}
                    onAssignTask={(task) => {
                      setEditingTask(task);
                      setTaskModalOpen(true);
                    }}
                    onNavigate={(tab) => {
                      if (tab.includes("/") || ["RainDiverters", "DrainManagement", "ChemicalInventory", "DowntimeTracking", "PestControl", "EnvironmentalMonitoring"].includes(tab)) {
                        window.location.href = createPageUrl(tab);
                      } else {
                        setActiveTab(tab);
                      }
                    }}
                  />
                </div>
              )}

              {/* Performance Scores */}
              {visibleWidgets.includes("performance-scores") && (
                <div data-widget-id="performance-scores">
                  <PerformanceScoresCard scores={calculatePerformanceScores()} expectedTasks={calculateExpectedTasks()} lineAssignments={lineAssignments} areaSignOffs={areaSignOffs} />
                </div>
              )}

              {/* ATP Module */}
              {visibleWidgets.includes("atp-module") && (
                <div data-widget-id="atp-module">
                  <ATPModule areaSignOffs={areaSignOffs} />
                </div>
              )}



              {/* Sanitary Condition Reports */}
              {visibleWidgets.includes("sanitary-reports") && sanitaryReports.filter(r => r.status === "open").length > 0 && (
                <div data-widget-id="sanitary-reports">
                  <Card className="border-rose-200 bg-rose-50">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-rose-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Unsanitary Conditions Reported
                          </h3>
                          <p className="text-sm text-rose-700 mt-1">
                            {sanitaryReports.filter(r => r.status === "open").length} open report{sanitaryReports.filter(r => r.status === "open").length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("reports")}
                          className="border-rose-300 hover:bg-rose-100"
                        >
                          View All
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {sanitaryReports.filter(r => r.status === "open").slice(0, 3).map(report => (
                          <div key={report.id} className="bg-white rounded-lg p-3 border border-rose-100">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={
                                    report.severity === "critical" ? "bg-rose-600 text-white" :
                                    report.severity === "high" ? "bg-orange-100 text-orange-800" :
                                    report.severity === "medium" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-slate-100 text-slate-800"
                                  }>
                                    {report.severity}
                                  </Badge>
                                  {report.production_line_name && (
                                    <span className="text-xs text-slate-500">{report.production_line_name}</span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-900 line-clamp-2">{report.description}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Reported by {report.reporter_name} • {report.created_date ? format(parseISO(report.created_date), "MMM d, h:mm a") : ""}
                                </p>
                              </div>
                              {report.photo_url && (
                                <img src={report.photo_url} alt="Condition" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Employee Performance - Compact view with top/bottom performers */}
              {visibleWidgets.includes("employee-performance") && (
                <div data-widget-id="employee-performance" className="space-y-2">
                  <div className="flex items-center justify-end">
                    <Select value={performanceTimeRange} onValueChange={setPerformanceTimeRange}>
                      <SelectTrigger className="w-32 md:w-40 text-xs h-7 md:h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shift">Current Shift</SelectItem>
                        <SelectItem value="day">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <CompactEmployeePerformanceSection
                    employees={employees}
                    getPerformanceStats={getEmployeePerformanceStats}
                    onViewDetails={handleViewEmployeeDetail}
                    timeRangeLabel={
                      performanceTimeRange === "shift" ? "Current Shift" :
                      performanceTimeRange === "day" ? "Today" :
                      performanceTimeRange === "week" ? "This Week" :
                      performanceTimeRange === "month" ? "This Month" :
                      performanceTimeRange === "quarter" ? "This Quarter" :
                      "This Year"
                    }
                  />
                </div>
              )}

              {/* Today's Tasks - Hide on Mobile */}
              {visibleWidgets.includes("todays-tasks") && !isMobile && (
                <div data-widget-id="todays-tasks">
                  <Card className="p-4">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Today's Tasks</h2>
                    {tasksLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="p-3 animate-pulse border rounded-lg">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-200 rounded w-1/2" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasks.filter(t => {
                          if (!t.due_date) return false;
                          try {
                            const date = parseISO(t.due_date);
                            return !isNaN(date.getTime()) && isToday(date);
                          } catch {
                            return false;
                          }
                        }).length === 0 ? (
                          <p className="text-slate-500 py-8 text-center">No tasks scheduled for today</p>
                        ) : (
                          tasks.filter(t => {
                            if (!t.due_date) return false;
                            try {
                              const date = parseISO(t.due_date);
                              return !isNaN(date.getTime()) && isToday(date);
                            } catch {
                              return false;
                            }
                          }).slice(0, 5).map(task => (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              onView={handleEditTask}
                              onDelete={(t) => {
                                if (confirm(`Delete task "${t.title}"?`)) {
                                  deleteTaskMutation.mutate(t.id);
                                }
                              }}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </DraggableWidgetGrid>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-2 sm:gap-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search tasks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-base h-11 sm:h-10 touch-manipulation"
                  />
                </div>
                {!isMobile && (
                  <Button 
                    variant="outline" 
                    onClick={() => setBulkImportModalOpen(true)}
                    className="h-9 sm:h-10"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Bulk Import (CSV)
                  </Button>
                )}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn(
                  "w-full text-sm",
                  isMobile ? "h-11 text-base touch-manipulation" : "h-9 sm:h-10"
                )}>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Task List - Organized by Frequency */}
              <TasksByFrequency 
                tasks={filteredTasks} 
                onViewTask={handleEditTask}
                onDeleteTask={(task) => {
                  console.log("Delete clicked for task:", task.id, task.title);
                  if (confirm(`Delete task "${task.title}"?`)) {
                    console.log("Confirmed delete, calling mutation for:", task.id);
                    deleteTaskMutation.mutate(task.id);
                  }
                }}
                hideStatus={true}
                onBulkEdit={handleBulkEdit}
                expectedTargets={calculateExpectedTasks()}
                customCategories={customCategories}
              />
          </TabsContent>

          {/* Crews Tab */}
          <TabsContent value="crews">
            <CrewsManagement />
          </TabsContent>

          {/* Line Cleanings Tab */}
          <TabsContent value="line-cleanings">
            <LineCleaningsSetup />
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments">
            <LineCleaningAssignments />
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-4 sm:space-y-6">
           {employeesLoading ? (
             <div className="space-y-3">
               <div className="h-10 bg-slate-200 rounded animate-pulse" />
               {[...Array(4)].map((_, i) => (
                 <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
               ))}
             </div>
           ) : isMobile ? (
             <>
               <div className="flex justify-between items-center">
                 <h2 className="text-base font-semibold text-slate-900">Team Members</h2>
                 <Button 
                   onClick={() => { setEditingEmployee(null); setEmployeeModalOpen(true); }}
                   className="bg-slate-900 hover:bg-slate-800 text-xs h-9 px-3 touch-manipulation"
                 >
                   <Plus className="w-3 h-3 mr-1" /> Add
                 </Button>
               </div>
               <MobileEmployeeList
                 employees={employees}
                 getTaskCount={getEmployeeTaskCount}
                 onEdit={handleEditEmployee}
                 onDelete={handleDeleteEmployee}
                 onViewDetail={handleViewEmployeeDetail}
               />
             </>
           ) : (
             <EmployeeListView
               employees={employees}
               getTaskCount={getEmployeeTaskCount}
               onEdit={handleEditEmployee}
               onDelete={handleDeleteEmployee}
               onAddEmployee={() => { setEditingEmployee(null); setEmployeeModalOpen(true); }}
             />
           )}
          </TabsContent>

          {/* Task Groups Tab */}
          <TabsContent value="task-groups" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Daily Task Groups</h2>
                <p className="text-slate-500">Group daily tasks for employees to select</p>
              </div>
              <Button onClick={() => { setEditingTaskGroup(null); setTaskGroupModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>

            {taskGroups.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-slate-200">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No task groups yet</h3>
                <p className="text-slate-500 mb-4">Create groups of daily tasks for employees to select</p>
                <Button onClick={() => { setEditingTaskGroup(null); setTaskGroupModalOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Group
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {taskGroups.map(group => (
                  <TaskGroupCard
                    key={group.id}
                    group={group}
                    tasks={tasks}
                    onEdit={(g) => { setEditingTaskGroup(g); setTaskGroupModalOpen(true); }}
                    onDelete={handleDeleteTaskGroup}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records">
            <RecordsTab
              orgId={orgId} tasks={tasks} lineAssignments={lineAssignments} areaSignOffs={areaSignOffs}
              inspectionRecords={inspectionRecords} preOpInspections={preOpInspections}
              productionLines={productionLines} areas={areas} assets={assets}
              drainLocations={drainLocations} drainCleaningRecords={drainCleaningRecords}
              rainDiverters={rainDiverters} diverterInspections={diverterInspections}
              siteSettings={siteSettings[0] || {}} onEditTask={handleEditTask}
              onAddComment={handleAddComment}
            />
          </TabsContent>

                    {/* Badges Tab */}
                    <TabsContent value="badges">
                    <BadgesManagement />
                    </TabsContent>

                    {/* Plant Schedule Tab */}
                    <TabsContent value="plant-schedule">
                    <PlantSchedule />
                    </TabsContent>

                    {/* Employee Schedules Tab */}
                    <TabsContent value="schedules">
                    <ScheduleManagement />
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings">
                    <SiteSettings />
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics">
                      <Analytics />
                    </TabsContent>

                    {/* Announcements Tab */}
                    <TabsContent value="announcements" className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
                          <p className="text-slate-500 text-sm mt-1">Send announcements to all employees</p>
                        </div>
                        <Button 
                          onClick={() => setAnnouncementModalOpen(true)}
                          className="bg-slate-900 hover:bg-slate-800"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          New Announcement
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {announcements.length === 0 ? (
                          <p className="text-slate-500 text-center col-span-3 py-12">No announcements yet</p>
                        ) : (
                          announcements.map(announcement => (
                            <AnnouncementCard
                              key={announcement.id}
                              announcement={announcement}
                              isManager={true}
                              onDelete={deleteAnnouncementMutation.mutate}
                            />
                          ))
                        )}
                      </div>
                    </TabsContent>

                    {/* Chemical Titrations Tab */}
                    <TabsContent value="chemicals">
                      <ChemicalManagement />
                    </TabsContent>

                    {/* Training Documents Tab */}
                    <TabsContent value="training-docs" className="space-y-6">
                      <TrainingGapsPanel organizationId={orgId} />
                      <TrainingDocuments />
                    </TabsContent>

                    {/* Competency Management Tab */}
                    <TabsContent value="competency">
                      <CompetencyManagement organizationId={orgId} />
                    </TabsContent>

                    {/* Verification Tab */}
                    <TabsContent value="verification" className="space-y-6">
                      <PendingVerificationList
                        tasks={tasks}
                        onVerifyTask={handleVerifyTask}
                        onBulkVerifyShift={handleBulkVerifyShift}
                        areas={areas}
                        shifts={siteSettings[0]?.shifts || []}
                      />
                    </TabsContent>

                    {/* Team Health / Fatigue Detection Tab */}
                    <TabsContent value="team-health">
                      <FatigueDetectionEngine
                        tasks={tasks}
                        employees={employees}
                        employeeSessions={employeeSessions}
                        employeeTrainings={employeeTrainings}
                        competencyEvaluations={competencyEvaluations}
                        areaSignOffs={areaSignOffs}
                        siteSettings={siteSettings[0] || {}}
                        organizationId={orgId}
                      />
                    </TabsContent>



                    {/* Scenario Simulation Tab */}
                    <TabsContent value="simulation">
                      <ScenarioSimulator organizationId={orgId} />
                    </TabsContent>

                    {/* Mentor/Coach Mode Tab */}
                    <TabsContent value="mentor-coach">
                      <MentorCoachingMode
                        tasks={tasks}
                        employees={employees}
                        areaSignOffs={areaSignOffs}
                        drainLocations={drainLocations}
                        drainCleaningRecords={drainCleaningRecords}
                        diverterInspections={diverterInspections}
                        competencyEvaluations={competencyEvaluations}
                        employeeTrainings={employeeTrainings}
                        trainingDocuments={trainingDocuments}
                        employeeSessions={employeeSessions}
                        siteSettings={siteSettings[0] || {}}
                        organizationId={orgId}
                      />
                    </TabsContent>

                    {/* Employee Feedback Tab */}
                    <TabsContent value="feedback" className="space-y-6">
                      <FeedbackTab anonymousFeedback={anonymousFeedback} peerFeedback={peerFeedback} />
                    </TabsContent>

                    {/* Condition Reports Tab */}
                    <TabsContent value="reports" className="space-y-6">
                      <ConditionReportsTab sanitaryReports={sanitaryReports} user={user} />
                    </TabsContent>
                    </Tabs>
                    </div>

      {/* Modals */}
      <TaskFormModal 
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        employees={employees}
        onSave={(data) => taskMutation.mutateAsync({ id: editingTask?.id, data })}
        isLoading={taskMutation.isPending}
        onAutoAssign={handleAutoAssign}
        organizationId={orgId}
        customCategories={customCategories}
        onAddCategory={handleAddCategory}
      />

      <AutoAssignmentModal
        open={autoAssignModalOpen}
        onOpenChange={setAutoAssignModalOpen}
        task={taskForAutoAssign}
        employees={employees}
        allTasks={tasks}
        allSignOffs={areaSignOffs}
        onConfirm={handleConfirmAutoAssignment}
        isLoading={taskMutation.isPending}
      />

      <EmployeeFormModal open={employeeModalOpen} onOpenChange={setEmployeeModalOpen} employee={editingEmployee} onSave={(data) => employeeMutation.mutate({ id: editingEmployee?.id, data })} isLoading={employeeMutation.isPending} organizationId={orgId} />

      <TaskGroupFormModal
        open={taskGroupModalOpen}
        onOpenChange={setTaskGroupModalOpen}
        group={editingTaskGroup}
        dailyTasks={tasks.filter(t => t.frequency?.toLowerCase() === 'daily')}
        allGroups={taskGroups}
        onSubmit={handleTaskGroupSubmit}
        isLoading={taskGroupMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {employeeToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteEmployeeMutation.mutate(employeeToDelete?.id)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        open={employeeDetailOpen}
        onOpenChange={setEmployeeDetailOpen}
        employee={selectedEmployeeForDetail}
        {...getEmployeeDetailData()}
      />

      <TaskCommentModal
        open={commentModalOpen}
        onOpenChange={setCommentModalOpen}
        task={taskToComment}
        onSubmit={handleSubmitComment}
        isLoading={createCommentMutation.isPending}
      />

      <AnnouncementFormModal
        open={announcementModalOpen}
        onOpenChange={setAnnouncementModalOpen}
        onSubmit={(data) => createAnnouncementMutation.mutate(data)}
        isLoading={createAnnouncementMutation.isPending}
      />

      <BulkEditTasksModal
        open={bulkEditModalOpen}
        onOpenChange={setBulkEditModalOpen}
        selectedTasks={tasksForBulkEdit}
        onSave={handleBulkSave}
        isLoading={bulkUpdateTasksMutation.isPending}
        progress={bulkProgress}
      />

      <BulkTaskImportModal
        open={bulkImportModalOpen}
        onOpenChange={setBulkImportModalOpen}
        organizationId={orgId}
        existingTasks={tasks}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }}
      />

      <WidgetConfigModal
        open={widgetConfigOpen}
        onOpenChange={setWidgetConfigOpen}
        currentWidgets={visibleWidgets}
        onSave={setVisibleWidgets}
      />

      <VerifyTaskModal
        open={verifyTaskModalOpen}
        onClose={() => {
          setVerifyTaskModalOpen(false);
          setTaskToVerify(null);
        }}
        task={taskToVerify}
        onVerify={(taskId, notes, sig) => verifyTaskMutation.mutate({ taskId, notes, managerSignature: sig })}
        onReject={(taskId, reason) => rejectTaskMutation.mutate({ taskId, reason })}
        isLoading={verifyTaskMutation.isPending || rejectTaskMutation.isPending}
      />

      <BulkShiftVerificationModal
        open={bulkVerifyModalOpen}
        onClose={() => {
          setBulkVerifyModalOpen(false);
          setShiftGroupToVerify(null);
        }}
        shiftGroup={shiftGroupToVerify}
        onBulkVerify={(taskIds, notes, sig) => bulkVerifyTasksMutation.mutate({ taskIds, notes, managerSignature: sig })}
        isLoading={bulkVerifyTasksMutation.isPending}
      />

      {/* Overdue Tasks Modal */}
      <OverdueTasksModal open={overdueModalOpen} onOpenChange={setOverdueModalOpen} tasks={workTasks.filter(isTaskOverdue)} stats={stats} onEditTask={(task) => { setOverdueModalOpen(false); handleEditTask(task); }} />

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileManagerBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badges={{
            verification: badgeCounts.verification,
            feedback: badgeCounts.feedback,
            reports: badgeCounts.reports,
            competency: badgeCounts.competency,
          }}
        />
      )}
    </div>
  );
}