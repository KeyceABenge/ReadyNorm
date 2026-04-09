import { ClipboardList, GraduationCap, MessageSquare, BarChart3, Calendar, Droplets, HelpCircle } from "lucide-react";

// Employee navigation items - limited set
export const EMPLOYEE_NAV_ITEMS = [
  { id: "tasks", label: "My Tasks", icon: ClipboardList },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "diverters", label: "Rain Diverters", icon: Droplets },
  { id: "ask", label: "Ask Sanitation", icon: HelpCircle },
];

export default EMPLOYEE_NAV_ITEMS;