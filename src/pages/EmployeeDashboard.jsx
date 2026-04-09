// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { EmployeeRepo, SiteSettingsRepo, CrewRepo, RoleConfigRepo, TaskRepo, TaskGroupRepo, LineCleaningAssignmentRepo, AreaSignOffRepo, PreOpInspectionRepo, TaskCommentRepo, TitrationAreaRepo, TitrationRecordRepo, EmployeeSessionRepo, EmployeeShiftRepo, CrewScheduleRepo, AnnouncementRepo, DiverterTaskSettingsRepo, DiverterInspectionRepo, ChemicalInventorySettingsRepo, DrainCleaningSettingsRepo, TitrationSettingsRepo, ChemicalInventoryRecordRepo, DrainLocationRepo, DrainCleaningRecordRepo, DrainFacilityMapRepo, EmployeeTrainingRepo, EmployeePeerFeedbackRepo, AnonymousFeedbackRepo, TaskTrainingGapRepo } from "@/lib/adapters/database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TaskSelectionModal from "@/components/modals/TaskSelectionModal";
import AddTasksModal from "@/components/modals/AddTasksModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LanguageProvider, useTranslation } from "@/components/i18n";
import { 
  CheckCircle2, Loader2, RefreshCw, Calendar, LogOut, Power, Plus, MessageSquare, ThumbsUp, MessageCircle, StickyNote, Gift, Lock, Package2, FlaskConical, Star, Droplets, Map, Droplet
} from "lucide-react";


import { format, isToday, parseISO, isPast, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import StatsCard from "@/components/dashboard/StatsCard";
import TaskCard from "@/components/dashboard/TaskCard";
import { Folder, ChevronDown, ChevronRight } from "lucide-react";

import CompleteTaskModal from "@/components/modals/CompleteTaskModal";
import CompleteTitrationModal from "@/components/modals/CompleteTitrationModal";
import LifetimeStats from "@/components/employee/LifetimeStats";
import PeerFeedbackModal from "@/components/employee/PeerFeedbackModal";
import AnonymousFeedbackModal from "@/components/employee/AnonymousFeedbackModal";
import EmployeeScheduleView from "@/components/employee/EmployeeScheduleView";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import EmployeeTrainingTab from "@/components/training/EmployeeTrainingTab";
import EvaluatorPendingSection from "@/components/competency/EvaluatorPendingSection";
import DrainMapViewer from "@/components/employee/DrainMapViewer";
import LineCleaningTab from "@/components/employee/LineCleaningTab";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useSessionActivityTracker, recordTaskCompletion } from "@/components/session/ShiftSessionEngine";
import { useContentTranslation } from "@/components/i18n/useContentTranslation";
import { useSessionValidator } from "@/components/session/useSessionValidator";
import { TASK_CATEGORIES, CATEGORY_ORDER, classifyTask, getCategoryConfig } from "@/components/tasks/taskCategoryClassifier";

// Translated Announcement Popup Component
function TranslatedAnnouncementPopup({ announcements, language, onClose, t, employeeName }) {
  // Replace {name} placeholders in birthday announcements
  const processedAnnouncements = announcements.map(a => {
    if (!employeeName) return a;
    return {
      ...a,
      title: (a.title || "").replace(/\{name\}/g, employeeName),
      content: (a.content || "").replace(/\{name\}/g, employeeName),
    };
  });

  // Build content object for translation
  const contentToTranslate = {};
  processedAnnouncements.forEach(a => {
    contentToTranslate[`title_${a.id}`] = a.title;
    contentToTranslate[`content_${a.id}`] = a.content;
  });
  
  const { translatedContent, isTranslating } = useContentTranslation(contentToTranslate, language);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="p-6 pb-3 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-slate-900">
            📢 {t("dashboard", "newAnnouncement", "New Announcement")}{announcements.length > 1 ? 's' : ''}
          </h2>
        </div>
        <div className="px-6 overflow-y-auto flex-1 space-y-4">
          {processedAnnouncements.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isManager={false}
              translatedTitle={translatedContent[`title_${announcement.id}`]}
              translatedContent={translatedContent[`content_${announcement.id}`]}
            />
          ))}
        </div>
        <div className="p-6 pt-3 flex-shrink-0 border-t border-slate-100">
          <Button 
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800"
          >
            {t("common", "gotIt", "Got it")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Translated Announcements List Component  
function TranslatedAnnouncementsList({ announcements, language }) {
  // Build content object for translation
  const contentToTranslate = {};
  announcements.forEach(a => {
    contentToTranslate[`title_${a.id}`] = a.title;
    contentToTranslate[`content_${a.id}`] = a.content;
  });
  
  const { translatedContent } = useContentTranslation(contentToTranslate, language);

  return (
    <div className="grid grid-cols-2 gap-3">
      {announcements.map(announcement => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          isManager={false}
          translatedTitle={translatedContent[`title_${announcement.id}`]}
          translatedContent={translatedContent[`content_${announcement.id}`]}
          compact
        />
      ))}
    </div>
  );
}

// Mobile components
import MobileTaskCard from "@/components/mobile/MobileTaskCard";
import MobileProgressHeader from "@/components/mobile/MobileProgressHeader";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";

import MobileHeader from "@/components/mobile/MobileHeader";
import MobileTaskGroup from "@/components/mobile/MobileTaskGroup";
import MobileCompleteModal from "@/components/mobile/MobileCompleteModal";
import EmployeeQAButton from "@/components/qa/EmployeeQAButton";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import ShiftGoalBanner from "@/components/employee/ShiftGoalBanner";
import CompletedTodayTab from "@/components/employee/CompletedTodayTab";
import ReadyNormLoader from "@/components/loading/ReadyNormLoader";
import TaskTrainingPopup from "@/components/training/TaskTrainingPopup";
import { isBirthdayToday } from "@/components/birthday/birthdayUtils";
import BirthdayCakeIcon from "@/components/birthday/BirthdayCakeIcon";
import EmployeeBadgeIcons from "@/components/badges/EmployeeBadgeIcons";
function EmployeeDashboardContent() {
    // Read tab from URL param if present
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get("tab") || "tasks";
    const [activeTab, setActiveTab] = useState(initialTab);
  const [activeTaskTab, setActiveTaskTab] = useState("today");
  const [employee, setEmployee] = useState(null);
  const { t, formatDate, formatTime, language } = useTranslation();
  const [session, setSession] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [taskSelectionOpen, setTaskSelectionOpen] = useState(false);
  const [addTasksModalOpen, setAddTasksModalOpen] = useState(false);
  const [peerFeedbackOpen, setPeerFeedbackOpen] = useState(false);
  const [selectedPeerEmployee, setSelectedPeerEmployee] = useState(null);
  const [anonymousFeedbackOpen, setAnonymousFeedbackOpen] = useState(false);
  const [announcementPopupOpen, setAnnouncementPopupOpen] = useState(false);
  const [newAnnouncements, setNewAnnouncements] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [titrationModalOpen, setTitrationModalOpen] = useState(false);
  const [selectedTitration, setSelectedTitration] = useState(null);
  const [completedTitrationIds, setCompletedTitrationIds] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileCompleteModalOpen, setMobileCompleteModalOpen] = useState(false);
  const [trainingPopupTask, setTrainingPopupTask] = useState(null);
  const queryClient = useQueryClient();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track session activity for auto-end detection
  useSessionActivityTracker(session, 60000); // Update every minute

  useEffect(() => {
    const stored = localStorage.getItem("selectedEmployee");
    if (!stored) {
      window.location.href = createPageUrl("EmployeeLogin");
      return;
    }
    let emp;
    try {
      emp = JSON.parse(stored);
    } catch {
      localStorage.removeItem("selectedEmployee");
      window.location.href = createPageUrl("EmployeeLogin");
      return;
    }
    setEmployee(emp);
    if (emp.preferred_language) {
      localStorage.setItem("employee_language", emp.preferred_language);
    }
    const sessionStored = localStorage.getItem("employeeSession");
    if (sessionStored) {
      setSession(JSON.parse(sessionStored));
    }
    
    // Sync employee data from DB to pick up changes (e.g. avatar updates)
    // Query by ID instead of fetching all employees
    if (emp.id) {
      EmployeeRepo.filter({ id: emp.id })
        .then(results => {
          const fresh = results[0];
          if (fresh && fresh.avatar_url !== emp.avatar_url) {
            const synced = { ...emp, avatar_url: fresh.avatar_url };
            localStorage.setItem("selectedEmployee", JSON.stringify(synced));
            setEmployee(synced);
          }
        })
        .catch(() => {}); // Silently fail if offline
    }
    
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["line_cleaning_assignments_employee"] });
    }, 500);
  }, [queryClient]);

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings", employee?.organization_id],
    queryFn: () => SiteSettingsRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id,
    staleTime: 5 * 60 * 1000,
    initialData: []
  });

  const settings = siteSettings[0];
  const frequencySettings = settings?.frequency_settings || {};

  // Crews query - must be before useSessionValidator which depends on it
  const { data: crews = [] } = useQuery({
    queryKey: ["crews_employee", employee?.organization_id],
    queryFn: () => CrewRepo.filter({ organization_id: employee?.organization_id, status: "active" }),
    enabled: !!employee?.organization_id
  });

  // Validate session against DB and auto-end stale sessions client-side
  useSessionValidator(employee, session, setSession, siteSettings, 60000, crews);
  const { data: roleConfigs = [] } = useQuery({ queryKey: ["role_configs_emp", employee?.organization_id], queryFn: () => RoleConfigRepo.filter({ organization_id: employee?.organization_id, is_active: true }), enabled: !!employee?.organization_id });
  const quotas = useMemo(() => { const sq = settings?.task_quotas || {}; let bq = sq; if (employee?.role && roleConfigs.length) { const rc = roleConfigs.find(r => r.role_name.toLowerCase() === employee.role.toLowerCase()); if (rc?.task_quotas && Object.keys(rc.task_quotas).length && Object.values(rc.task_quotas).some(v => v > 0)) bq = rc.task_quotas; } const crew = crews.find(c => c.members?.includes(employee?.email)); const sz = crew?.members?.length || 1; if (sz <= 1) return bq; const pq = {}; Object.entries(bq).forEach(([f, t]) => { pq[f] = Math.ceil((Number(t) || 0) / sz); }); return pq; }, [settings?.task_quotas, employee?.role, employee?.email, roleConfigs, crews]);

  // Fetch ALL org tasks for shift target calculation (used by ShiftGoalBanner)
  const { data: allOrgTasks = [] } = useQuery({
    queryKey: ["tasks", employee?.organization_id],
    queryFn: () => TaskRepo.filter({ organization_id: employee?.organization_id }, "-created_date", 2000),
    enabled: !!employee?.organization_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allTasks = [], isLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["my-tasks", employee?.email, employee?.organization_id],
    queryFn: () => TaskRepo.filter({ organization_id: employee?.organization_id, assigned_to: employee?.email }, "-due_date"),
    enabled: !!employee?.email && !!employee?.organization_id,
    staleTime: 0
  });
  
  const refetch = async () => {
    await Promise.all([refetchTasks(), refetchAssignments(), refetchDrainCleanings(), refetchDiverterInspections(),
      queryClient.invalidateQueries({ queryKey: ["announcements"] }), queryClient.invalidateQueries({ queryKey: ["task_comments"] })]);
  };

  const { data: taskGroups = [] } = useQuery({
    queryKey: ["task_groups", employee?.organization_id],
    queryFn: () => TaskGroupRepo.filter({ organization_id: employee?.organization_id, status: "active" }),
    enabled: !!employee?.organization_id
  });

  // Helper: filter tasks by employee role eligibility
  const isTaskEligibleForEmployee = (task, emp) => {
    if (!task.eligible_roles || task.eligible_roles.length === 0) return true;
    if (!emp?.role) return true; // no role set = show all
    return task.eligible_roles.some(r => r.toLowerCase() === emp.role.toLowerCase());
  };

  const { data: availableTasks = [] } = useQuery({
    queryKey: ["available-tasks", employee?.email, employee?.organization_id, employee?.role, taskGroups],
    queryFn: async () => {
      const allPendingTasks = await TaskRepo.filter({ organization_id: employee?.organization_id, status: "pending" });
      return allPendingTasks.filter(t => (!t.assigned_to || t.assigned_to === employee?.email) && isTaskEligibleForEmployee(t, employee));
    },
    enabled: !!employee?.email && !!employee?.organization_id && (taskSelectionOpen || addTasksModalOpen),
    staleTime: 0
  });
  const { data: allEmployees = [] } = useQuery({ queryKey: ["all_employees", employee?.organization_id], queryFn: () => EmployeeRepo.filter({ organization_id: employee?.organization_id }), enabled: !!employee?.organization_id });

  const { data: lineCleaningAssignments = [], isLoading: lineCleaningsLoading, refetch: refetchAssignments } = useQuery({
    queryKey: ["line_cleaning_assignments_employee", employee?.organization_id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const assignments = await LineCleaningAssignmentRepo.filter({ 
        organization_id: employee?.organization_id
      });

      // Only show scheduled/in_progress assignments from today or future
      return assignments
        .filter(a => 
          (a.status === "scheduled" || a.status === "in_progress") &&
          a.scheduled_date >= today &&
          a.production_line_name &&
          a.expected_line_down_time &&
          a.duration_minutes != null
        )
        .sort((a, b) => {
          const dateA = a.scheduled_date || "";
          const dateB = b.scheduled_date || "";
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return (a.sequence_number || 0) - (b.sequence_number || 0);
        });
    },
    enabled: !!employee?.organization_id,
    refetchInterval: 60000, // Refresh every 60 seconds (was 30)
    staleTime: 30000
  });

  // Subscribe to real-time line cleaning assignment changes
  useEffect(() => {
    if (!employee?.organization_id) return;

    const unsubscribe = LineCleaningAssignmentRepo.subscribe(() => {
      refetchAssignments();
    });

    return () => unsubscribe();
  }, [employee?.organization_id, refetchAssignments]);

  const { data: areaSignOffs = [] } = useQuery({
    queryKey: ["area_sign_offs", employee?.organization_id],
    queryFn: () => AreaSignOffRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  const { data: preOpInspections = [] } = useQuery({
    queryKey: ["preop_inspections_employee", employee?.organization_id],
    queryFn: () => PreOpInspectionRepo.filter({ organization_id: employee?.organization_id }, "-inspection_date"),
    enabled: !!employee?.organization_id
  });

  const { data: taskComments = [] } = useQuery({
    queryKey: ["task_comments", employee?.email, employee?.organization_id],
    queryFn: () => TaskCommentRepo.filter({ organization_id: employee?.organization_id, employee_email: employee?.email }, "-created_date"),
    enabled: !!employee?.email && !!employee?.organization_id
  });

  const { data: titrationAreas = [] } = useQuery({
    queryKey: ["titration_areas_employee", employee?.organization_id],
    queryFn: () => TitrationAreaRepo.filter({ organization_id: employee?.organization_id, status: "active" }),
    enabled: !!employee?.organization_id
  });

  // Fetch recent titration records to check which are already completed this period
  const { data: recentTitrationRecords = [] } = useQuery({
    queryKey: ["recent_titration_records", employee?.organization_id],
    queryFn: async () => {
      const records = await TitrationRecordRepo.filter({ 
        organization_id: employee?.organization_id 
      }, "-completed_at", 500);
      return records;
    },
    enabled: !!employee?.organization_id && (taskSelectionOpen || addTasksModalOpen)
  });

  // Fetch today's employee sessions to check which task groups are already claimed
  const { data: todaySessions = [] } = useQuery({
    queryKey: ["today_sessions", employee?.organization_id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const sessions = await EmployeeSessionRepo.filter({ 
        organization_id: employee?.organization_id,
        session_date: today
      });
      return sessions;
    },
    enabled: !!employee?.organization_id && (taskSelectionOpen || addTasksModalOpen)
  });

  const { data: employeeShifts = [] } = useQuery({
    queryKey: ["employee_shifts", employee?.email, employee?.organization_id],
    queryFn: () => EmployeeShiftRepo.filter({ organization_id: employee?.organization_id, employee_email: employee?.email }),
    enabled: !!employee?.email && !!employee?.organization_id
  });

  const { data: crewSchedules = [] } = useQuery({
    queryKey: ["crew_schedules", employee?.organization_id],
    queryFn: () => CrewScheduleRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements", employee?.organization_id],
    queryFn: () => AnnouncementRepo.filter({ organization_id: employee?.organization_id }, "-created_date"),
    enabled: !!employee?.organization_id
  });

  // Fetch diverter task settings - always enabled so modal can show immediately
  const { data: diverterSettings = [] } = useQuery({
    queryKey: ["diverter_settings", employee?.organization_id],
    queryFn: () => DiverterTaskSettingsRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  // Fetch recent diverter inspections - always enabled
  const { data: recentDiverterInspections = [], refetch: refetchDiverterInspections } = useQuery({
    queryKey: ["recent_diverter_inspections", employee?.organization_id],
    queryFn: () => DiverterInspectionRepo.filter({ 
      organization_id: employee?.organization_id
    }, "-inspection_date", 100),
    enabled: !!employee?.organization_id,
    refetchInterval: 60000, // Refresh every 60 seconds (was 10)
    staleTime: 30000
  });

  // Fetch chemical inventory settings
  const { data: inventorySettings = [] } = useQuery({
    queryKey: ["inventory_settings", employee?.organization_id],
    queryFn: () => ChemicalInventorySettingsRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  // Fetch drain cleaning settings (for training requirement)
  const { data: drainCleaningSettings = [] } = useQuery({
    queryKey: ["drain_cleaning_settings", employee?.organization_id],
    queryFn: () => DrainCleaningSettingsRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  // Fetch titration settings (for training requirement)
  const { data: titrationSettingsData = [] } = useQuery({
    queryKey: ["titration_settings", employee?.organization_id],
    queryFn: () => TitrationSettingsRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  // Fetch current week's inventory record
  const { data: inventoryRecords = [] } = useQuery({
    queryKey: ["inventory_records", employee?.organization_id],
    queryFn: () => ChemicalInventoryRecordRepo.filter({ organization_id: employee?.organization_id }, "-week_start_date", 1),
    enabled: !!employee?.organization_id
  });

  // Fetch drain locations for cleaning tasks
  const { data: drainLocations = [] } = useQuery({
    queryKey: ["drain_locations", employee?.organization_id],
    queryFn: () => DrainLocationRepo.filter({ organization_id: employee?.organization_id }),
    enabled: !!employee?.organization_id
  });

  // Fetch recent drain cleaning records - refetch frequently to track progress
  const { data: recentDrainCleanings = [], refetch: refetchDrainCleanings } = useQuery({
    queryKey: ["drain_cleaning_records", employee?.organization_id],
    queryFn: () => DrainCleaningRecordRepo.filter({ organization_id: employee?.organization_id }, "-cleaned_at", 100),
    enabled: !!employee?.organization_id,
    staleTime: 30000,
    refetchInterval: 60000  // Refetch every 60 seconds (was 30)
  });

  // Fetch drain facility maps for map display
  const { data: drainFacilityMaps = [] } = useQuery({
    queryKey: ["drain_facility_maps", employee?.organization_id],
    queryFn: () => DrainFacilityMapRepo.filter({ organization_id: employee?.organization_id, status: "active" }),
    enabled: !!employee?.organization_id
  });

  const { data: employeeTrainings = [] } = useQuery({
    queryKey: ["employee_trainings", employee?.id, employee?.organization_id],
    queryFn: () => EmployeeTrainingRepo.filter({ 
      organization_id: employee?.organization_id, 
      employee_id: employee?.id 
    }),
    enabled: !!employee?.id && !!employee?.organization_id
  });

  const { data: peerRecognitions = [] } = useQuery({
    queryKey: ["peer_recognitions", employee?.email, employee?.organization_id],
    queryFn: () => EmployeePeerFeedbackRepo.filter({ 
      organization_id: employee?.organization_id, 
      to_email: employee?.email 
    }, "-created_date"),
    enabled: !!employee?.email && !!employee?.organization_id
  });

  // Track whether task selection flow has been resolved THIS page load
  const [taskSelectionChecked, setTaskSelectionChecked] = useState(false);

  const getSeenTodayIds = () => { if (!employee?.id) return []; const k = `announcements_seen_${employee.id}`; try { const p = JSON.parse(localStorage.getItem(k) || "{}"); return p.date === format(new Date(), "yyyy-MM-dd") ? (p.ids || []) : []; } catch { return []; } };
  const markSeenToday = (ids) => { if (!employee?.id) return; const k = `announcements_seen_${employee.id}`, today = format(new Date(), "yyyy-MM-dd"), merged = [...new Set([...getSeenTodayIds(), ...ids])]; localStorage.setItem(k, JSON.stringify({ date: today, ids: merged })); };

  // Show announcements once per day per employee, only after task selection resolved
  // Also inject birthday announcement if today is the employee's birthday
  useEffect(() => {
    if (!taskSelectionChecked || taskSelectionOpen || !employee) return;
    
    const seenToday = getSeenTodayIds();
    const regularUnseen = announcements.filter(a => 
      a.is_active !== false && 
      !a.is_birthday_template &&
      (a.expiry_date ? new Date(a.expiry_date) >= new Date() : true) && 
      !seenToday.includes(a.id)
    );
    
    // Check for birthday
    const birthdayAnnouncements = [];
    if (isBirthdayToday(employee)) {
      const birthdayTemplate = announcements.find(a => a.is_birthday_template && a.is_active !== false);
      const birthdayKey = `birthday_${employee.id}`;
      if (birthdayTemplate && !seenToday.includes(birthdayKey)) {
        birthdayAnnouncements.push({
          ...birthdayTemplate,
          id: birthdayKey,
          title: birthdayTemplate.title.replace(/\{name\}/g, employee.name),
          content: birthdayTemplate.content.replace(/\{name\}/g, employee.name),
        });
      }
    }
    
    const allUnseen = [...birthdayAnnouncements, ...regularUnseen];
    if (allUnseen.length > 0) { setNewAnnouncements(allUnseen); setAnnouncementPopupOpen(true); }
  }, [taskSelectionChecked, taskSelectionOpen, announcements, employee]);

  const peerFeedbackMutation = useMutation({
    mutationFn: (data) => EmployeePeerFeedbackRepo.create({
      organization_id: employee.organization_id,
      from_email: employee.email,
      from_name: employee.name,
      ...data
    }),
    onSuccess: () => {
      setPeerFeedbackOpen(false);
      setSelectedPeerEmployee(null);
      toast.success("Feedback sent! 🎉");
    }
  });

  const anonymousFeedbackMutation = useMutation({
    mutationFn: (data) => AnonymousFeedbackRepo.create({ ...data, organization_id: employee.organization_id }),
    onSuccess: () => {
      setAnonymousFeedbackOpen(false);
      toast.success("Your feedback has been submitted anonymously!");
    }
  });

  const unreadCommentsCount = taskComments.filter(c => !c.is_read).length;
  
  const getUnreadAnnouncementCount = () => {
    const seenAnnouncementIds = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
    return announcements.filter(a => 
      !seenAnnouncementIds.includes(a.id) && 
      new Date(a.expiry_date) >= new Date()
    ).length;
  };
  
  const markAnnouncementsAsSeen = () => {
    const seenAnnouncementIds = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
    const activeAnnouncements = announcements.filter(a => new Date(a.expiry_date) >= new Date());
    const updatedSeenIds = [...new Set([...seenAnnouncementIds, ...activeAnnouncements.map(a => a.id)])];
    localStorage.setItem("seenAnnouncements", JSON.stringify(updatedSeenIds));
  };

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => TaskRepo.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["my-tasks"] });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(["my-tasks", employee?.email, employee?.organization_id]);
      
      // Optimistically update
      queryClient.setQueryData(["my-tasks", employee?.email, employee?.organization_id], (old) => {
        if (!old) return old;
        return old.map(task => 
          task.id === id ? { ...task, ...data } : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(["my-tasks", employee?.email, employee?.organization_id], context.previousTasks);
      }
      toast.error("Failed to update task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      setCompleteModalOpen(false);
      setTaskToComplete(null);
      toast.success("Task updated");
    }
  });

  const markCommentReadMutation = useMutation({
    mutationFn: (id) => TaskCommentRepo.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task_comments"] });
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => EmployeeSessionRepo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      toast.success("Tasks selected successfully");
    }
  });

  const createTitrationRecordMutation = useMutation({
    mutationFn: (data) => TitrationRecordRepo.create({
      organization_id: employee.organization_id,
      completed_by: employee.email,
      completed_by_name: employee.name,
      completed_at: new Date().toISOString(),
      ...data
    }),
    onSuccess: (_, variables) => {
      setCompletedTitrationIds(prev => [...prev, variables.titration_area_id]);
      setTitrationModalOpen(false);
      setSelectedTitration(null);
      toast.success("Titration recorded!");
      queryClient.invalidateQueries({ queryKey: ["titration_records"] });
    }
  });

  // Check if employee needs to select tasks
    useEffect(() => {
      if (!employee) return;
      
      const checkTaskSelection = async () => {
        // No session at all — no task selection needed, safe to show announcements
        if (!session) {
          setTaskSelectionChecked(true);
          return;
        }

        const hasQuotas = Object.keys(quotas).length > 0 && Object.values(quotas).some(q => q > 0);

        if (hasQuotas && !session.task_selection_completed) {
          const allPendingTasks = await TaskRepo.filter({ organization_id: employee.organization_id, status: "pending" });
          const availableTasksForEmployee = allPendingTasks.filter(t => 
            (!t.assigned_to || t.assigned_to === employee.email) &&
            isTaskEligibleForEmployee(t, employee)
          );

          if (availableTasksForEmployee.length > 0) {
            setTaskSelectionOpen(true);
          } else {
            await EmployeeSessionRepo.update(session.id, { task_selection_completed: true });
            const updatedSession = { ...session, task_selection_completed: true };
            setSession(updatedSession);
            localStorage.setItem("employeeSession", JSON.stringify(updatedSession));
            setTaskSelectionChecked(true);
          }
        } else {
          // No task selection needed (no quotas or already completed)
          setTaskSelectionChecked(true);
        }
      };

      checkTaskSelection();
    }, [employee, session, quotas]);

  // Filter tasks — show ALL assigned incomplete tasks (not just today's due_date)
  // Tasks persist until completed, or session ends (manual/auto) and returns them to pool
  const todayTasks = allTasks.filter(t => {
    return t.status !== "completed" && t.status !== "verified";
  });



  const completedTasks = allTasks.filter(t => 
    t.status === "completed" || t.status === "verified"
  );

  const overdueTasks = allTasks.filter(t => {
    if (!t.assigned_to || t.status === "completed" || t.status === "verified") return false;
    const now = new Date();
    const freq = t.frequency?.toLowerCase() || "";
    if (t.cycle_start_date) {
      try {
        const cs = parseISO(t.cycle_start_date);
        let ce;
        if (freq.includes("daily")) { ce = new Date(cs); ce.setHours(23,59,59); }
        else if (freq.includes("week") && !freq.includes("bi") && !freq.includes("2")) { ce = new Date(cs); ce.setDate(ce.getDate()+7); }
        else if (freq.includes("bi-week") || freq.includes("biweek") || freq.includes("2 week")) { ce = new Date(cs); ce.setDate(ce.getDate()+14); }
        else if (freq.includes("month") && !freq.includes("bi")) { ce = new Date(cs); ce.setMonth(ce.getMonth()+1); }
        else if (freq.includes("bimonth") || freq.includes("bi-month") || freq.includes("2 month")) { ce = new Date(cs); ce.setMonth(ce.getMonth()+2); }
        else if (freq.includes("quarter")) { ce = new Date(cs); ce.setMonth(ce.getMonth()+3); }
        else if (freq.includes("annual") || freq.includes("year")) { ce = new Date(cs); ce.setFullYear(ce.getFullYear()+1); }
        else if (t.due_date) { ce = parseISO(t.due_date); }
        else return false;
        return now > ce;
      } catch { return false; }
    }
    if (t.due_date) { try { const d = parseISO(t.due_date); return isPast(startOfDay(d)) && !isToday(d); } catch { return false; } }
    return false;
  });

  const stats = {
    today: todayTasks.length,  // Now shows ALL assigned incomplete tasks
    completed: completedTasks.length,
    overdue: overdueTasks.length,
    lineCleanings: lineCleaningAssignments.length
  };

  const handleStartTask = async (task) => {
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: { status: "in_progress" }
    });
  };

  const handleCompleteTask = (task) => {
    setTaskToComplete(task);
    if (isMobile) {
      setMobileCompleteModalOpen(true);
    } else {
      setCompleteModalOpen(true);
    }
  };

  const calculateNextDueDate = (freq, freqSettings) => {
    const now = new Date();
    let d = new Date(now);
    const mk = Object.keys(freqSettings).find(k => freq.includes(k));
    const s = mk ? freqSettings[mk] : null;
    if (s) {
      switch (s.interval_type) {
        case "daily": {
          const rt = s.reset_times || ["05:00"], ct = now.getHours()*60+now.getMinutes();
          let found = false;
          for (const t of rt.sort()) { const [h,m] = t.split(":").map(Number); if (h*60+m > ct) { d.setHours(h,m,0,0); found=true; break; } }
          if (!found) { d.setDate(d.getDate()+1); const [h,m]=rt[0].split(":").map(Number); d.setHours(h,m,0,0); }
          break; }
        case "days": d.setDate(d.getDate()+(s.interval_days||7)); break;
        case "monthly_dates": { const dt=(s.monthly_dates||[1]).sort((a,b)=>a-b), cd=now.getDate(), nd=dt.find(x=>x>cd); if(nd) d.setDate(nd); else { d.setMonth(d.getMonth()+1); d.setDate(dt[0]); } break; }
        case "months": d.setMonth(d.getMonth()+(s.interval_months||1)); d.setDate(1); break;
        case "yearly": { const tm=(s.yearly_month||1)-1, td=s.yearly_day||1, ty=new Date(now.getFullYear(),tm,td); d=ty>now?ty:new Date(now.getFullYear()+1,tm,td); break; }
        default: d.setDate(d.getDate()+7);
      }
    } else {
      if (freq.includes("daily")) { d.setDate(d.getDate()+1); d.setHours(5,0,0,0); }
      else if (freq.includes("week") && !freq.includes("biweek") && !freq.includes("bi-week")) d.setDate(d.getDate()+7);
      else if (freq.includes("biweek") || freq.includes("bi-week")) { if(now.getDate()<15) d.setDate(15); else { d.setMonth(d.getMonth()+1); d.setDate(1); } }
      else if (freq.includes("month")) { d.setMonth(d.getMonth()+1); d.setDate(1); }
      else if (freq.includes("quarter")) { d.setMonth(d.getMonth()+3); d.setDate(1); }
      else if (freq.includes("year") || freq.includes("annual")) { d.setFullYear(d.getFullYear()+1); d.setMonth(0); d.setDate(1); }
      else d.setDate(d.getDate()+7);
    }
    return d;
  };

  const handleConfirmComplete = async (task, notes, signatureData, extras = {}) => {
    if (!task?.id) return;
    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: {
        status: "completed",
        completed_at: new Date().toISOString(),
        completion_notes: notes,
        signature_data: signatureData,
        ...(extras.photo_before_url ? { photo_before_url: extras.photo_before_url } : {}),
        ...(extras.photo_after_url ? { photo_after_url: extras.photo_after_url } : {})
      }
    });

    // Record task completion in session for tracking
    if (session?.id) {
      try {
        const result = await recordTaskCompletion(session, task.id);
        // Update local session state
        setSession(prev => ({
          ...prev,
          completed_tasks: result.completedTasks,
          tasks_completed_count: result.tasksCompletedCount,
          completion_rate: result.completionRate
        }));
      } catch (e) {
        console.error("Failed to record task completion in session:", e);
      }
    }

    // If recurring, regenerate only if no pending instance already exists for this base task
    if (task.is_recurring && task.frequency) {
      const baseId = task.parent_task_id || task.id;
      const hasPending = allTasks.some(t => t.status === "pending" && t.id !== task.id && (t.parent_task_id === baseId || t.id === baseId));
      if (!hasPending) {
        const nextDue = calculateNextDueDate(task.frequency.toLowerCase(), frequencySettings);
        const { id, created_date, updated_date, created_by, completed_at, completion_notes, signature_data, verified_by, verified_at, verification_notes, verification_signature, rejected_by, rejected_at, rejection_reason, photo_before_url, photo_after_url, ...fields } = task;
        await TaskRepo.create({ ...fields, assigned_to: null, assigned_to_name: null, due_date: format(nextDue, "yyyy-MM-dd"), cycle_start_date: format(new Date(), "yyyy-MM-dd"), status: "pending", parent_task_id: baseId, is_group: false });
      }
      toast.success("Task completed!");
    }
  };

  const handleTaskSelection = async (selectedTaskIds, selectedTitrationIds = [], trainingGaps = [], includeDiverterTask = false, includeInventoryTask = false, selectedDrainIds = []) => {
    if (!session) {
      console.error("handleTaskSelection: NO SESSION", { sessionFromState: session, localStorage: localStorage.getItem("employeeSession") });
      toast.error("No active session. Please log out and back in.");
      return;
    }
    try {
      // Record training gaps if any
      if (trainingGaps.length > 0) {
        const today = format(new Date(), "yyyy-MM-dd");
        await Promise.all(trainingGaps.map(gap =>
          TaskTrainingGapRepo.create({
            organization_id: employee.organization_id,
            employee_id: employee.id,
            employee_email: employee.email,
            employee_name: employee.name,
            task_id: gap.taskId,
            task_title: gap.taskTitle,
            training_id: gap.trainingId,
            training_title: gap.trainingTitle,
            session_date: today,
            status: "pending"
          })
        ));
      }

      if (selectedTaskIds.length > 0) {
        const today = format(new Date(), "yyyy-MM-dd");
        const allPendingTasks = await TaskRepo.filter({ organization_id: employee.organization_id, status: "pending" });
        const updatePromises = selectedTaskIds.map(taskId => {
          const task = allPendingTasks.find(t => t.id === taskId);
          if (task && isTaskEligibleForEmployee(task, employee)) {
            return TaskRepo.update(taskId, {
              assigned_to: employee.email,
              assigned_to_name: employee.name,
              due_date: today
            });
          }
        });
        await Promise.all(updatePromises.filter(p => p));
      }

      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: {
          selected_tasks: selectedTaskIds,
          selected_titrations: selectedTitrationIds,
          include_diverter_task: includeDiverterTask,
          include_inventory_task: includeInventoryTask,
          selected_drains: selectedDrainIds,
          task_selection_completed: true
        }
      });

      const updatedSession = { ...session, selected_tasks: selectedTaskIds, selected_titrations: selectedTitrationIds, include_diverter_task: includeDiverterTask, include_inventory_task: includeInventoryTask, selected_drains: selectedDrainIds, task_selection_completed: true };
      setSession(updatedSession);
      localStorage.setItem("employeeSession", JSON.stringify(updatedSession));
      setTaskSelectionOpen(false);
      setTaskSelectionChecked(true);
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["available-tasks"] });
      await refetch();
    } catch (error) {
      console.error("Task selection failed:", error);
      toast.error("Failed to confirm selection: " + (error?.message || "Unknown error"));
    }
  };

  const handleAddTasks = async (selectedTaskIds, includeDiverterTask = false) => {
    const totalTasks = selectedTaskIds.length + (includeDiverterTask ? 1 : 0);
    if (totalTasks === 0) return;

    // Assign selected tasks to employee
    const today = format(new Date(), "yyyy-MM-dd");
    const updatePromises = selectedTaskIds.map(taskId => {
      const task = availableTasks.find(t => t.id === taskId);
      if (task) {
        return TaskRepo.update(taskId, {
          assigned_to: employee.email,
          assigned_to_name: employee.name,
          due_date: today
        });
      }
    });

    await Promise.all(updatePromises.filter(p => p));

    // Update session: add new task IDs to selected_tasks AND diverter if selected
    if (session) {
      const existingSelected = session.selected_tasks || [];
      const mergedSelected = [...new Set([...existingSelected, ...selectedTaskIds])];
      const sessionUpdate = { selected_tasks: mergedSelected };
      if (includeDiverterTask) {
        sessionUpdate.include_diverter_task = true;
      }
      await EmployeeSessionRepo.update(session.id, sessionUpdate);
      const updatedSession = { ...session, ...sessionUpdate };
      setSession(updatedSession);
      localStorage.setItem("employeeSession", JSON.stringify(updatedSession));
    }

    setAddTasksModalOpen(false);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    toast.success(`${totalTasks} task${totalTasks > 1 ? 's' : ''} added to your agenda`);
  };

  const handleLogout = () => {
    localStorage.removeItem("selectedEmployee");
    localStorage.removeItem("employeeSession");
    window.location.href = createPageUrl("EmployeeLogin");
  };

  const endDayMutation = useMutation({
    mutationFn: async () => {
      if (session) {
        // Unassign ALL tasks assigned to this employee (both completed and incomplete)
        // Completed tasks are already stored as records, incomplete ones go back to pool
        const employeeTasks = allTasks.filter(t => t.assigned_to === employee.email);
        const incompleteTasks = employeeTasks.filter(t => 
          t.status !== "completed" && t.status !== "verified"
        );
        
        // Calculate completion stats
        const completedTasks = session.completed_tasks || [];
        const selectedTasks = session.selected_tasks || [];
        const tasksCompletedCount = completedTasks.length;
        const tasksSelectedCount = selectedTasks.length;
        const completionRate = tasksSelectedCount > 0 
          ? Math.round((tasksCompletedCount / tasksSelectedCount) * 100) 
          : 0;
        
        await Promise.all([
          // Update session with final stats
          EmployeeSessionRepo.update(session.id, {
            status: "ended",
            end_time: new Date().toISOString(),
            end_reason: "manual",
            reopened_tasks: incompleteTasks.map(t => t.id),
            tasks_selected_count: tasksSelectedCount,
            tasks_completed_count: tasksCompletedCount,
            completion_rate: completionRate
          }),
          // Unassign incomplete tasks - they go back to the pool
          ...incompleteTasks.map(task => 
            TaskRepo.update(task.id, {
              assigned_to: null,
              assigned_to_name: null,
              status: "pending"
            })
          )
        ]);
      }
    },
    onSuccess: () => {
      localStorage.removeItem("selectedEmployee");
      localStorage.removeItem("employeeSession");
      toast.success("Day ended successfully!");
      setTimeout(() => {
        window.location.href = createPageUrl("EmployeeLogin");
      }, 1000);
    }
  });

  if (isLoading || lineCleaningsLoading || !employee) {
    return <ReadyNormLoader />;
  }

  const initials = employee.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  // Calculate overall progress - based on ALL assigned tasks (pending + completed)
  const allTasksDueToday = allTasks;
  
  const completedTasksTodayList = allTasks.filter(t => (t.status === "completed" || t.status === "verified") && t.completed_at && (() => { try { return isToday(parseISO(t.completed_at)); } catch { return false; } })());
  const completedTasksToday = allTasksDueToday.filter(t => t.status === "completed" || t.status === "verified").length;
  
  // Calculate special task progress (diverters, inventory, drains)
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Diverter task progress - check if ANY inspections were completed today for this org
  const hasDiverterTask = session?.include_diverter_task && diverterSettings[0]?.is_enabled;
  const diverterCompleted = hasDiverterTask && recentDiverterInspections.some(i => {
    // Check inspection_date - can be ISO format like "2026-01-19T04:20:18.583Z"
    if (i.inspection_date) {
      const inspectionDay = i.inspection_date.split('T')[0];
      if (inspectionDay === today) return true;
    }
    // Also check created_date as fallback
    if (i.created_date) {
      const createdDay = typeof i.created_date === 'string' 
        ? i.created_date.split('T')[0] 
        : format(new Date(i.created_date), "yyyy-MM-dd");
      if (createdDay === today) return true;
    }
    return false;
  });
  
  // Inventory task progress
  const hasInventoryTask = session?.include_inventory_task && inventorySettings[0]?.is_enabled;
  // Check if this week's inventory is completed - verify the record covers the current week
  const inventoryRecord = inventoryRecords[0];
  const inventoryRecordIsCurrentWeek = inventoryRecord?.week_start_date && inventoryRecord?.week_end_date &&
    today >= inventoryRecord.week_start_date && today <= inventoryRecord.week_end_date;
  const inventoryCompleted = hasInventoryTask && inventoryRecord && inventoryRecordIsCurrentWeek && (
    inventoryRecord.status === "completed" || 
    inventoryRecord.status === "reviewed" || 
    inventoryRecord.status === "closed"
  );
  
  // Drain cleaning progress
  const selectedDrainCount = session?.selected_drains?.length || 0;
  const todaysDrainCleaningsForProgress = recentDrainCleanings.filter(r => 
    r.cleaned_at && r.cleaned_at.startsWith(today) && 
    session?.selected_drains?.includes(r.drain_id)
  );
  const completedDrainCountForProgress = todaysDrainCleaningsForProgress.length;
  
  // Add special tasks to totals
  const specialTasksTotal = (hasDiverterTask ? 1 : 0) + (hasInventoryTask ? 1 : 0) + selectedDrainCount;
  const specialTasksCompleted = (diverterCompleted ? 1 : 0) + (inventoryCompleted ? 1 : 0) + completedDrainCountForProgress;
  
  const totalTasksForDay = allTasksDueToday.length + specialTasksTotal;
  const completedTasksForDay = completedTasksToday + specialTasksCompleted;
  const overallProgress = totalTasksForDay > 0 ? Math.round((completedTasksForDay / totalTasksForDay) * 100) : 0;

  // Mobile badges for bottom nav
  const mobileBadges = {
    feedback: unreadCommentsCount + getUnreadAnnouncementCount(),
    training: 0
  };

  // Pull to refresh handler
  const handlePullToRefresh = async () => {
    await refetch();
  };

  return (
    <PullToRefresh onRefresh={handlePullToRefresh} className={cn("min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 overflow-x-hidden", isMobile && "pb-20")}>
      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          employee={employee}
          onRefresh={refetch}
          onAddTasks={() => setAddTasksModalOpen(true)}
          onLogout={handleLogout}
          onEndDay={() => endDayMutation.mutate()}
        />
      )}

      <div className="w-full px-3 sm:px-4 md:px-6 max-w-[1600px] mx-auto py-4 sm:py-8">
        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden md:flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 xs:gap-4 min-w-0">
            <div className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-xs xs:text-sm sm:text-lg flex-shrink-0">
              {employee.avatar_url ? (
                <img src={employee.avatar_url} alt={employee.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 truncate flex items-center gap-2">
                {t("dashboard", "welcome", "Welcome")}, {employee.name}
                <EmployeeBadgeIcons employee={employee} size="md" />
                <BirthdayCakeIcon employee={employee} className="w-6 h-6" />
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 xs:gap-3 flex-wrap justify-end">
            <Button variant="outline" onClick={() => refetch()} className="h-9 xs:h-10 px-3 xs:px-4 text-xs xs:text-sm">
              <RefreshCw className="w-3 xs:w-4 h-3 xs:h-4" />
            </Button>
            <Button 
              onClick={() => setAddTasksModalOpen(true)}
              variant="outline"
              className="h-9 xs:h-10 px-3 xs:px-4 text-xs xs:text-sm"
            >
              <Plus className="w-3 xs:w-4 h-3 xs:h-4 mr-1 xs:mr-2" />
              {t("tasks", "add", "Add")} {t("tasks", "tasks", "Tasks")}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="text-rose-600 hover:text-rose-700 text-xs xs:text-sm h-9 xs:h-10 px-3 xs:px-4">
              <LogOut className="w-3 xs:w-4 h-3 xs:h-4 mr-1 xs:mr-2" />
              <span className="hidden xs:inline">Change Person</span>
              <span className="xs:hidden">Switch</span>
            </Button>
          </div>
        </div>

        {/* Main Content - Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">

          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            {/* Shift Goal Banner */}
            {session && settings && <ShiftGoalBanner employee={employee} session={session} siteSettings={settings} crews={crews} quotas={quotas} completedToday={completedTasksForDay} totalTasksForDay={totalTasksForDay} allOrgTasks={allOrgTasks} />}
            {/* Mobile Progress Header */}
            {isMobile ? (
              <MobileProgressHeader
                completed={completedTasksForDay}
                total={totalTasksForDay}
              />
            ) : (
              <>
                {/* Desktop Progress Bar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-x-hidden">
                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-4 mb-2 xs:mb-4">
                    <h2 className="text-base xs:text-lg font-semibold text-slate-900">{t("dashboard", "todaysTasks", "Today's Progress")}</h2>
                    <span className="text-xl xs:text-2xl font-bold text-slate-900">{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 xs:h-4 mb-2">
                    <div
                      className="bg-gradient-to-r from-slate-700 to-slate-900 h-3 xs:h-4 rounded-full transition-all duration-300"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <p className="text-xs xs:text-sm text-slate-600">
                    {completedTasksForDay} {t("common", "of", "of")} {totalTasksForDay} {t("tasks", "tasks", "tasks")} {t("status", "completed", "completed").toLowerCase()}
                  </p>
                </div>

                {/* Desktop Stats */}
                <div className="grid grid-cols-3 gap-1 xs:gap-2">
                  <StatsCard 
                    title={t("time", "today", "Today")} 
                    value={stats.today}
                    icon={Calendar}
                    bgColor="bg-blue-600"
                    compact
                  />
                  <StatsCard 
                    title={t("common", "done", "Done")} 
                    value={stats.completed}
                    icon={CheckCircle2}
                    bgColor="bg-emerald-600"
                    compact
                  />

                  <StatsCard 
                    title={t("cleaning", "lineCleaning", "Lines")} 
                    value={stats.lineCleanings}
                    icon={Package2}
                    bgColor="bg-purple-600"
                    compact
                  />
                </div>
              </>
            )}




        {/* Task Tabs */}
        <Tabs value={activeTaskTab} onValueChange={setActiveTaskTab} className="space-y-4 sm:space-y-6">
          <TabsList className="flex bg-white border border-slate-200 rounded-2xl shadow-sm p-1 h-auto flex-wrap w-full justify-center overflow-x-auto">
            <TabsTrigger value="today" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-4 py-2">
              <Calendar className="w-4 h-4 mr-2" />
              {t("time", "today", "Today")}
              {stats.today > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-700">{stats.today}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="line-cleanings" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-4 py-2">
              <Package2 className="w-4 h-4 mr-2" />
              {t("cleaning", "lineCleaning", "Lines")}
              {stats.lineCleanings > 0 && <Badge className="ml-2 bg-purple-100 text-purple-700">{stats.lineCleanings}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="completed-today" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white px-4 py-2">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t("status", "completed", "Completed")}
              {completedTasksTodayList.length > 0 && <Badge className="ml-2 bg-emerald-100 text-emerald-700">{completedTasksTodayList.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-3 sm:space-y-4">
            {!isMobile && (
                <h2 className="text-base xs:text-lg font-semibold text-slate-900 truncate">
                  {t("dashboard", "todaysTasks", "Today's Tasks")} - {format(new Date(), "EEE, MMM d")}
                </h2>
              )}
            
            {/* Rain Diverter Task Section */}
            {session?.include_diverter_task && diverterSettings[0]?.is_enabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "border rounded-lg overflow-hidden",
                  diverterCompleted ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"
                )}
              >
                <Link to={createPageUrl("RainDiverters")}>
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-opacity-80 transition-colors">
                    {diverterCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Droplets className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-base">
                        {diverterSettings[0]?.task_title || "Rain Diverter Bucket Check"}
                      </p>
                      <p className="text-sm text-slate-600 capitalize">
                        {diverterCompleted 
                          ? t("status", "completedToday", "Completed today")
                          : `${t("cleaning", (diverterSettings[0]?.frequency || "weekly").toLowerCase(), diverterSettings[0]?.frequency || "weekly")} ${t("tasks", "task", "task")}`
                        }
                      </p>
                    </div>
                    {diverterCompleted ? (
                      <Badge className="bg-emerald-600 text-white px-3 py-1">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {t("status", "completed", "Completed")}
                      </Badge>
                    ) : (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        {t("cleaning", "startInspection", "Start Inspection")}
                      </Button>
                    )}
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Chemical Inventory Task Section */}
            {session?.include_inventory_task && inventorySettings[0]?.is_enabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "border rounded-lg overflow-hidden",
                  inventoryCompleted ? "bg-emerald-50 border-emerald-300" : "bg-teal-50 border-teal-200"
                )}
              >
                <Link to={createPageUrl("EmployeeInventoryCount")}>
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-opacity-80 transition-colors">
                    {inventoryCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <FlaskConical className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-base">
                        {inventorySettings[0]?.task_title || "Chemical Inventory Count"}
                      </p>
                      <p className="text-sm text-slate-600 capitalize">
                        {inventoryCompleted 
                          ? t("status", "completedToday", "Completed today")
                          : `${t("cleaning", (inventorySettings[0]?.frequency || "weekly").toLowerCase(), inventorySettings[0]?.frequency || "weekly")} ${t("tasks", "task", "task")}`
                        }
                      </p>
                    </div>
                    {inventoryCompleted ? (
                      <Badge className="bg-emerald-600 text-white px-3 py-1">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {t("status", "completed", "Completed")}
                      </Badge>
                    ) : (
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                        {t("chemicals", "startCount", "Start Count")}
                      </Button>
                    )}
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Drain Cleaning Task Section with Integrated Map */}
            {session?.selected_drains?.length > 0 && (() => {
              // Calculate drain cleaning progress
              const today = format(new Date(), "yyyy-MM-dd");
              const todaysDrainCleanings = recentDrainCleanings.filter(r => 
                r.cleaned_at && r.cleaned_at.startsWith(today) && 
                session.selected_drains.includes(r.drain_id)
              );
              const completedDrainCount = todaysDrainCleanings.length;
              const totalDrainCount = session.selected_drains.length;
              const allDrainsCompleted = completedDrainCount >= totalDrainCount;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "border-2 rounded-lg overflow-hidden",
                    allDrainsCompleted ? "bg-emerald-50 border-emerald-300" : "bg-cyan-50 border-cyan-300"
                  )}
                >
                  <div className="flex items-center gap-3 p-4">
                    {allDrainsCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Droplet className="w-6 h-6 text-cyan-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-lg">
                        {t("cleaning", "drainCleaning", "Drain Cleaning")}
                      </p>
                      <p className="text-sm text-slate-600">
                        {completedDrainCount}/{totalDrainCount} {t("cleaning", "drains", "drains")} {t("status", "completed", "cleaned").toLowerCase()} {t("time", "today", "today").toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {drainFacilityMaps.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, drainMap: !prev.drainMap }))}
                          className={cn(
                            allDrainsCompleted ? "border-emerald-300 text-emerald-700" : "border-cyan-300 text-cyan-700"
                          )}
                        >
                          <Map className="w-4 h-4 mr-1" />
                          {expandedGroups.drainMap ? t("common", "hide", "Hide") : t("common", "view", "View")} {t("common", "map", "Map")}
                        </Button>
                      )}
                      {allDrainsCompleted ? (
                        <Badge className="bg-emerald-600 text-white px-3 py-1">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {t("status", "completed", "Completed")}
                        </Badge>
                      ) : (
                        <Link to={createPageUrl("EmployeeDrainCleaning") + `?drains=${session.selected_drains.join(",")}`}>
                          <Button className="bg-cyan-600 hover:bg-cyan-700">
                            {completedDrainCount > 0 ? t("common", "continue", "Continue") : t("common", "start", "Start")} {t("cleaning", "cleaning", "Cleaning")}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Expandable Facility Map */}
                  {drainFacilityMaps.length > 0 && expandedGroups.drainMap && (
                    <DrainMapViewer 
                      facilityMaps={drainFacilityMaps}
                      drainLocations={drainLocations}
                      selectedDrainIds={session.selected_drains}
                    />
                  )}

                  {/* Drain list summary */}
                  <div className={cn(
                    "px-4 pb-3 pt-1 bg-white border-t",
                    allDrainsCompleted ? "border-emerald-100" : "border-cyan-100"
                  )}>
                    <div className="flex flex-wrap gap-1">
                      {drainLocations
                        .filter(d => session.selected_drains.includes(d.id))
                        .map(drain => {
                          const isCleanedToday = todaysDrainCleanings.some(r => r.drain_id === drain.id);
                          return (
                            <Badge 
                              key={drain.id} 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                isCleanedToday 
                                  ? "border-emerald-400 text-emerald-700 bg-emerald-50" 
                                  : "border-cyan-300 text-cyan-700"
                              )}
                            >
                              {isCleanedToday && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {drain.drain_id}
                            </Badge>
                          );
                        })}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Selected Titrations Section */}
            {session?.selected_titrations?.length > 0 && titrationAreas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg bg-blue-50 border-blue-200 overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setExpandedGroups(prev => ({ ...prev, titrations: !prev.titrations }))}
                >
                  {expandedGroups.titrations ? (
                    <ChevronDown className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                  <FlaskConical className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-base">{t("chemicals", "chemicalTitrations", "Chemical Titrations")}</p>
                    <p className="text-sm text-slate-600">
                      {completedTitrationIds.filter(id => session.selected_titrations.includes(id)).length}/{session.selected_titrations.length} {t("status", "completed", "completed").toLowerCase()}
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white">{session.selected_titrations.length} {t("atp", "tests", "tests")}</Badge>
                </div>
                {expandedGroups.titrations && (
                  <div className="border-t border-blue-200 p-3 space-y-2 bg-white">
                    {session.selected_titrations.map(titrationId => {
                      const area = titrationAreas.find(a => a.id === titrationId);
                      if (!area) return null;
                      const isCompleted = completedTitrationIds.includes(titrationId);
                      return (
                        <Card 
                          key={titrationId} 
                          className={cn(
                            "p-3 border cursor-pointer transition-all hover:shadow-md",
                            isCompleted 
                              ? "border-emerald-300 bg-emerald-50" 
                              : "border-slate-200 hover:border-blue-300"
                          )}
                          onClick={() => {
                            if (!isCompleted) {
                              setSelectedTitration(area);
                              setTitrationModalOpen(true);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                              <div>
                                <p className={cn("font-medium", isCompleted ? "text-emerald-700" : "text-slate-900")}>
                                  {area.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {area.chemical_name} • {area.target_min}-{area.target_max} {area.measurement_type === "oz_gal" ? "oz/gal" : "PPM"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">{area.type?.replace("_", " ")}</Badge>
                              {!isCompleted && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8">
                                  {t("common", "record", "Record")}
                                </Button>
                              )}
                              {isCompleted && (
                                <Badge className="bg-emerald-600">{t("common", "done", "Done")}</Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <AnimatePresence>
              {todayTasks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 sm:py-12"
                >
                  <CheckCircle2 className="w-8 sm:w-12 h-8 sm:h-12 text-emerald-500 mx-auto mb-2 sm:mb-4" />
                  <p className="text-slate-600 font-medium text-sm sm:text-base">{t("dashboard", "noTasksAvailable", "All caught up!")}</p>
                  <p className="text-slate-500 text-xs sm:text-sm">{t("dashboard", "noTasksSelected", "No tasks scheduled for today")}</p>
                </motion.div>
              ) : (
                (() => {
                  // Group tasks by category (MSS, PIC, PEC, FIRE, ONE_OFF)
                  const actualTasks = todayTasks.filter(task => !task.is_group);
                  
                  const getTaskCat = (task) => {
                    if (task.category && TASK_CATEGORIES[task.category]) return task.category;
                    return classifyTask(task);
                  };
                  
                  const tasksByCategory = {};
                  actualTasks.forEach(task => {
                    const catId = getTaskCat(task);
                    if (!tasksByCategory[catId]) tasksByCategory[catId] = [];
                    tasksByCategory[catId].push(task);
                  });
                  
                  const sortedCats = [
                    ...CATEGORY_ORDER.filter(id => tasksByCategory[id]),
                    ...Object.keys(tasksByCategory).filter(id => !CATEGORY_ORDER.includes(id))
                  ];

                  // If only 1 category, render tasks flat without the category header
                  if (sortedCats.length <= 1) {
                    return actualTasks.map(task => {
                      const taskNeedsTraining = task.required_training_id && 
                        !employeeTrainings.some(tr => tr.document_id === task.required_training_id);
                      return (
                        <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                          {isMobile ? (
                            <MobileTaskCard task={task} onStart={handleStartTask} onComplete={handleCompleteTask}
                              needsTraining={taskNeedsTraining} requiredTrainingTitle={taskNeedsTraining ? task.required_training_title : null}
                              onTap={taskNeedsTraining ? (tsk) => setTrainingPopupTask(tsk) : undefined} />
                          ) : (
                            <TaskCard task={task} isEmployee onStart={handleStartTask} onComplete={handleCompleteTask}
                              needsTraining={taskNeedsTraining} onTrainingTap={taskNeedsTraining ? (tsk) => setTrainingPopupTask(tsk) : undefined} />
                          )}
                        </motion.div>
                      );
                    });
                  }

                  return sortedCats.map(catId => {
                    const catConfig = getCategoryConfig(catId);
                    const catTasks = tasksByCategory[catId];
                    const isExpanded = expandedGroups[`cat_${catId}`] !== false;
                    const completedCount = catTasks.filter(t => t.status === "completed" || t.status === "verified").length;

                    if (isMobile) {
                      return (
                        <MobileTaskGroup
                          key={catId}
                          groupName={catConfig.shortLabel}
                          tasks={catTasks}
                          area={`${catTasks.length - completedCount} remaining`}
                          onTaskStart={handleStartTask}
                          onTaskComplete={handleCompleteTask}
                          employeeTrainings={employeeTrainings}
                          onTrainingTap={(tsk) => setTrainingPopupTask(tsk)}
                        />
                      );
                    }

                    return (
                      <motion.div key={catId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={cn("border-2 rounded-lg overflow-hidden", catConfig.borderColor, catConfig.color)}>
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer transition-colors hover:opacity-90"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [`cat_${catId}`]: !isExpanded }))}
                        >
                          {isExpanded ? <ChevronDown className={cn("w-5 h-5 flex-shrink-0", catConfig.iconColor)} /> : <ChevronRight className={cn("w-5 h-5 flex-shrink-0", catConfig.iconColor)} />}
                          <Folder className={cn("w-5 h-5 flex-shrink-0", catConfig.iconColor)} />
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-semibold text-base", catConfig.textColor)}>{catConfig.label}</p>
                            <p className="text-xs text-slate-500">{completedCount}/{catTasks.length} {t("status", "completed", "completed").toLowerCase()}</p>
                          </div>
                          <Badge className={catConfig.badgeColor}>{catTasks.length}</Badge>
                        </div>
                        {isExpanded && (
                          <div className={cn("border-t p-3 space-y-3 bg-white", catConfig.borderColor)}>
                            {catTasks.map(task => {
                              const taskNeedsTraining = task.required_training_id && 
                                !employeeTrainings.some(tr => tr.document_id === task.required_training_id);
                              return (
                                <TaskCard key={task.id} task={task} isEmployee onStart={handleStartTask} onComplete={handleCompleteTask}
                                  needsTraining={taskNeedsTraining} onTrainingTap={taskNeedsTraining ? (tsk) => setTrainingPopupTask(tsk) : undefined} />
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    );
                  });
                })()
              )}
            </AnimatePresence>
            )}
          </TabsContent>



          {/* Line Cleanings Tab */}
          <TabsContent value="line-cleanings" className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between"><div><h2 className="text-base xs:text-lg font-semibold text-slate-900">{t("cleaning", "lineCleaningAssignments", "Line Cleaning Assignments")}</h2><p className="text-xs xs:text-sm text-slate-500">{t("dashboard", "upcomingCleanings", "Upcoming scheduled cleanings")}</p></div></div>
            <LineCleaningTab assignments={lineCleaningAssignments} isLoading={lineCleaningsLoading} t={t} preOpInspections={preOpInspections} />
          </TabsContent>

          <TabsContent value="completed-today" className="space-y-3 sm:space-y-4">
            <CompletedTodayTab tasks={completedTasksTodayList} t={t} />
          </TabsContent>
        </Tabs>

            {/* End Day Button - Desktop Only */}
            {!isMobile && (
              <div className="mt-6 sm:mt-8 pb-4 sm:pb-8">
                <Button
                  onClick={() => endDayMutation.mutate()}
                  disabled={endDayMutation.isPending}
                  variant="outline"
                  className="w-full border-2 border-slate-300 hover:bg-slate-50 text-sm sm:text-base h-9 sm:h-10"
                >
                  {endDayMutation.isPending ? (
                    <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 mr-2 animate-spin" />
                  ) : (
                    <Power className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  )}
                  {t("dashboard", "endMyDay", "End My Day")}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4 sm:space-y-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
                <Button 
                  onClick={() => setPeerFeedbackOpen(true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-sm h-9 xs:h-10"
                >
                  <Gift className="w-3 xs:w-4 h-3 xs:h-4 mr-1 xs:mr-2" />
                  <span className="hidden xs:inline">{t("dashboard", "givePeerFeedback", "Give Peer Feedback")}</span>
                  <span className="xs:hidden">{t("dashboard", "peerFeedback", "Peer Feedback")}</span>
                </Button>
                <Button 
                  onClick={() => setAnonymousFeedbackOpen(true)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-sm h-9 xs:h-10"
                >
                  <Lock className="w-3 xs:w-4 h-3 xs:h-4 mr-1 xs:mr-2" />
                  <span className="hidden xs:inline">{t("dashboard", "anonymousFeedback", "Anonymous Feedback")}</span>
                  <span className="xs:hidden">{t("common", "anonymous", "Anonymous")}</span>
                </Button>
              </div>

              {/* Peer Recognition Section */}
              {peerRecognitions.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    {t("dashboard", "recognitionFromTeammates", "Recognition from Teammates")}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {peerRecognitions.map(recognition => {
                      const categoryConfig = {
                        teamwork: { color: "bg-blue-100 text-blue-800", label: "Teamwork" },
                        communication: { color: "bg-purple-100 text-purple-800", label: "Communication" },
                        quality: { color: "bg-emerald-100 text-emerald-800", label: "Quality" },
                        initiative: { color: "bg-amber-100 text-amber-800", label: "Initiative" },
                        helpfulness: { color: "bg-pink-100 text-pink-800", label: "Helpfulness" },
                        other: { color: "bg-slate-100 text-slate-800", label: "Other" }
                      }[recognition.category] || { color: "bg-slate-100 text-slate-800", label: recognition.category };

                      return (
                        <Card key={recognition.id} className="p-3 border border-amber-200 bg-amber-50">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={categoryConfig.color}>{categoryConfig.label}</Badge>
                            <span className="text-xs text-slate-500">
                              {format(parseISO(recognition.created_date), "MMM d")}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm line-clamp-2 mb-2">{recognition.feedback}</p>
                          <p className="text-xs text-amber-700 font-medium">From {recognition.from_name || "A teammate"}</p>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Announcements Section */}
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">{t("dashboard", "announcements", "Announcements")}</h2>
                {announcements.filter(a => !a.is_birthday_template && new Date(a.expiry_date) >= new Date()).length === 0 ? (
                  <p className="text-slate-500 text-center py-6 sm:py-8 text-sm">{t("dashboard", "noAnnouncements", "No announcements")}</p>
                ) : (
                  <TranslatedAnnouncementsList 
                    announcements={announcements.filter(a => !a.is_birthday_template && new Date(a.expiry_date) >= new Date())}
                    language={language}
                  />
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">{t("dashboard", "managerFeedback", "Manager Feedback")}</h2>
              <AnimatePresence>
                {taskComments.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 sm:py-12"
                  >
                    <MessageSquare className="w-8 sm:w-12 h-8 sm:h-12 text-slate-400 mx-auto mb-2 sm:mb-4" />
                    <p className="text-slate-600 font-medium text-sm sm:text-base">{t("dashboard", "noFeedbackYet", "No feedback yet")}</p>
                    <p className="text-slate-500 text-xs sm:text-sm">{t("dashboard", "managerCommentsWillAppear", "Your manager's comments on completed tasks will appear here")}</p>
                  </motion.div>
                ) : (
                  taskComments.map(comment => {
                    const commentTypeConfig = {
                      positive: { icon: ThumbsUp, color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700", badgeColor: "bg-emerald-600" },
                      constructive: { icon: MessageCircle, color: "bg-blue-50 border-blue-200", textColor: "text-blue-700", badgeColor: "bg-blue-600" },
                      note: { icon: StickyNote, color: "bg-slate-50 border-slate-200", textColor: "text-slate-700", badgeColor: "bg-slate-600" }
                    }[comment.comment_type] || { icon: MessageCircle, color: "bg-slate-50", textColor: "text-slate-700", badgeColor: "bg-slate-600" };

                    const CommentIcon = commentTypeConfig.icon;

                    return (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={() => !comment.is_read && markCommentReadMutation.mutate(comment.id)}
                      >
                        <Card className={cn(
                          "p-3 sm:p-4 border-2 transition-all overflow-hidden",
                          commentTypeConfig.color,
                          !comment.is_read && "ring-2 ring-rose-400"
                        )}>
                          <div className="flex flex-col xs:flex-row xs:items-start xs:gap-3 gap-2">
                            <div className={cn("p-2 rounded-lg flex-shrink-0", commentTypeConfig.color)}>
                              <CommentIcon className={cn("w-4 xs:w-5 h-4 xs:h-5", commentTypeConfig.textColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between xs:gap-2 gap-1 mb-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-slate-900 text-sm xs:text-base truncate">{comment.task_title}</h3>
                                  <p className="text-xs xs:text-sm text-slate-600 mt-0.5 xs:mt-1 truncate">
                                  {t("common", "from", "From")} {t("dashboard", "supervisor", "Supervisor")}
                                </p>
                                </div>
                                <div className="flex flex-wrap items-end gap-1 xs:flex-col xs:items-end xs:gap-2">
                                  <Badge className={cn(commentTypeConfig.badgeColor, "text-xs")}>
                                    {comment.comment_type === "positive" ? t("dashboard", "positive", "Positive") : 
                                     comment.comment_type === "constructive" ? t("dashboard", "constructive", "Constructive") : t("dashboard", "note", "Note")}
                                  </Badge>
                                  {!comment.is_read && (
                                    <Badge className="bg-rose-600 text-xs">{t("common", "new", "New")}</Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-slate-700 mb-2 text-xs xs:text-sm break-words">{comment.comment}</p>
                              <p className="text-xs text-slate-500">
                                {format(parseISO(comment.created_date), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <LifetimeStats 
              employee={employee} 
              allTasks={allTasks} 
              allSignOffs={areaSignOffs}
              allEmployees={allEmployees}
            />
          </TabsContent>

          <TabsContent value="schedule">
            <EmployeeScheduleView 
              employeeEmail={employee?.email}
              employeeShifts={employeeShifts}
              crewSchedules={crewSchedules}
              crews={crews}
              employee={employee}
            />
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            {/* Evaluator Section - Only shows if employee has evaluator role */}
            <EvaluatorPendingSection 
              employee={employee}
              organizationId={employee?.organization_id}
            />
            
            <EmployeeTrainingTab 
              employee={employee}
              organizationId={employee?.organization_id}
            />
          </TabsContent>

          <TabsContent value="diverters" className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Droplets className="w-12 h-12 text-blue-500 mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Rain Diverter Bucket Check</h2>
              <p className="text-sm text-slate-500 mb-4">
                View, add, and inspect rain leak diverters
              </p>
              {session?.include_diverter_task && (
                <Badge className="bg-blue-600 mb-4">Selected for today</Badge>
              )}
              <Link to={createPageUrl("RainDiverters")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Droplets className="w-4 h-4 mr-2" />
                  Open Rain Diverters
                </Button>
              </Link>
            </div>
          </TabsContent>
          </Tabs>


          </div>

          {/* Complete Task Modal */}
      <CompleteTaskModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        task={taskToComplete}
        onComplete={handleConfirmComplete}
        isLoading={updateTaskMutation.isPending}
      />

      {/* Task Selection Modal */}
      <TaskSelectionModal
        open={taskSelectionOpen}
        onClose={() => {}}
        tasks={availableTasks}
        taskGroups={taskGroups}
        titrationAreas={titrationAreas}
        quotas={quotas}
        onConfirm={handleTaskSelection}
        isLoading={updateSessionMutation.isPending}
        employeeTrainings={employeeTrainings}
        employee={employee}
        taskHistory={completedTasks}
        recentTitrationRecords={recentTitrationRecords}
        todaySessions={todaySessions}
        diverterSettings={diverterSettings[0]}
        recentDiverterInspections={recentDiverterInspections}
        inventorySettings={inventorySettings[0]}
        currentInventoryRecord={inventoryRecords[0]}
        drainLocations={drainLocations}
        recentDrainCleanings={recentDrainCleanings}
        drainCleaningSettings={drainCleaningSettings[0]}
        titrationSettings={titrationSettingsData[0]}
        employeeLanguage={employee?.preferred_language}
      />

      {/* Add Tasks Modal */}
      <AddTasksModal
        open={addTasksModalOpen}
        onOpenChange={setAddTasksModalOpen}
        tasks={availableTasks}
        onConfirm={handleAddTasks}
        isLoading={false}
        currentEmployeeEmail={employee?.email}
        diverterSettings={diverterSettings[0]}
        recentDiverterInspections={recentDiverterInspections}
        completedTasksForDay={completedTasksForDay}
        totalTasksForDay={totalTasksForDay}
      />

      {/* Peer Feedback Modal */}
      <div>
        {peerFeedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setPeerFeedbackOpen(false)} />
            <div className="relative bg-white rounded-t-lg sm:rounded-lg shadow-lg max-w-2xl w-full sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">{t("peerFeedback", "givePositiveFeedback", "Give Positive Feedback")}</h2>

                <div>
                  <Label htmlFor="peer">{t("peerFeedback", "selectColleague", "Select Colleague")}</Label>
                  <Select value={selectedPeerEmployee?.email || ""} onValueChange={(email) => {
                    const emp = allEmployees.find(e => e.email === email);
                    setSelectedPeerEmployee(emp);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("peerFeedback", "chooseColleague", "Choose a colleague...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {allEmployees.filter(e => e.email !== employee?.email).map(emp => (
                        <SelectItem key={emp.id} value={emp.email}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPeerEmployee && (
                  <PeerFeedbackModal 
                    open={true}
                    onOpenChange={(open) => {
                      if (!open) {
                        setPeerFeedbackOpen(false);
                        setSelectedPeerEmployee(null);
                      }
                    }}
                    selectedEmployee={selectedPeerEmployee}
                    onSubmit={(data) => peerFeedbackMutation.mutate(data)}
                    isLoading={peerFeedbackMutation.isPending}
                    language={language}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Anonymous Feedback Modal */}
      <AnonymousFeedbackModal
        open={anonymousFeedbackOpen}
        onOpenChange={setAnonymousFeedbackOpen}
        onSubmit={(data) => anonymousFeedbackMutation.mutate(data)}
        isLoading={anonymousFeedbackMutation.isPending}
        language={language}
      />

      {/* Complete Titration Modal */}
      <CompleteTitrationModal
        open={titrationModalOpen}
        onOpenChange={setTitrationModalOpen}
        titrationArea={selectedTitration}
        onComplete={(data) => createTitrationRecordMutation.mutate(data)}
        isLoading={createTitrationRecordMutation.isPending}
      />

      {/* Training Required Popup */}
      <TaskTrainingPopup open={!!trainingPopupTask} onOpenChange={(open) => { if (!open) setTrainingPopupTask(null); }} task={trainingPopupTask} onGoToTraining={() => { setTrainingPopupTask(null); setTimeout(() => setActiveTab("training"), 100); }} />

      {/* Mobile Complete Task Modal */}
      <MobileCompleteModal
        open={mobileCompleteModalOpen}
        onClose={() => { setMobileCompleteModalOpen(false); setTaskToComplete(null); }}
        task={taskToComplete}
        onComplete={handleConfirmComplete}
        isLoading={updateTaskMutation.isPending}
      />

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badges={mobileBadges}
        />
      )}

      {/* New Announcements Popup Modal */}
      {announcementPopupOpen && newAnnouncements.length > 0 && (
        <TranslatedAnnouncementPopup
          announcements={newAnnouncements}
          language={language}
          onClose={() => {
            setAnnouncementPopupOpen(false);
            markSeenToday(newAnnouncements.map(a => a.id));
          }}
          t={t}
          employeeName={employee?.name}
        />
      )}

      {/* Q&A Assistant Button */}
      <EmployeeQAButton
        context="general"
        organizationId={employee?.organization_id}
        employee={employee}
      />
    </PullToRefresh>
  );
}

// Wrapper component that provides language context
export default function EmployeeDashboard() {
  // Get initial language from localStorage
  const initialLanguage = localStorage.getItem("employee_language") || "en";
  
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <EmployeeDashboardContent />
    </LanguageProvider>
  );
}