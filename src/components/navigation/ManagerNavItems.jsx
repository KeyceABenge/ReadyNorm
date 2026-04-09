import { 
  LayoutDashboard, ClipboardList, Users, FileText, BarChart3, 
  Settings, Megaphone, MessageSquare, CheckSquare,
  GraduationCap, UserCog, Trophy, Calendar, Package2,
  AlertTriangle, Microscope, Bug, FolderOpen, ShieldCheck, Beaker
} from "lucide-react";

// Manager navigation items organized by category
export const MANAGER_NAV_SECTIONS = [
  {
    title: "Dashboard",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ]
  },
  {
    title: "Sanitation",
    items: [
      { id: "tasks", label: "Tasks", icon: ClipboardList },
      { id: "crews", label: "Crews", icon: Users },
      { id: "line-cleanings", label: "Line Cleanings", icon: Package2 },
      { id: "assignments", label: "Assignments", icon: ClipboardList },
    ]
  },
  {
    title: "Records & Verification",
    items: [
      { id: "records", label: "Records", icon: FileText },
      { id: "verification", label: "Verification", icon: CheckSquare },
    ]
  },
  {
    title: "Programs",
    items: [
      { id: "capa", label: "CAPA", icon: AlertTriangle, page: "CAPAProgram" },
      { id: "emp", label: "EMP", icon: Microscope, page: "EnvironmentalMonitoring" },
      { id: "pest", label: "Pest Control", icon: Bug, page: "PestControl" },
      { id: "audit", label: "Internal Audit", icon: ShieldCheck, page: "InternalAudit" },
      { id: "documents", label: "Document Control", icon: FolderOpen, page: "DocumentControl" },
    ]
  },
  {
    title: "People & Training",
    items: [
      { id: "employees", label: "Employees", icon: Users },
      { id: "training-docs", label: "Training Docs", icon: GraduationCap },
      { id: "competency", label: "Competency", icon: UserCog },
    ]
  },
  {
    title: "Communication",
    items: [
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "feedback", label: "Feedback", icon: MessageSquare },
    ]
  },
  {
    title: "Settings",
    items: [
      { id: "settings", label: "Site Settings", icon: Settings },
      { id: "schedules", label: "Schedules", icon: Calendar },
      { id: "badges", label: "Badges", icon: Trophy },
      { id: "chemicals", label: "Chemicals", icon: Beaker },
    ]
  }
];

// Flat list of all manager nav items
export const MANAGER_NAV_ITEMS = MANAGER_NAV_SECTIONS.flatMap(section => section.items);

export default MANAGER_NAV_ITEMS;