import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Users, ClipboardCheck, HandHelping, ShieldCheck, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function SanitationRoleSelector({ 
  siteCode, 
  organization, 
  onBack,
  onManagerLogin 
}) {
  const handleEmployeeLogin = () => {
    window.location.href = createPageUrl("EmployeeLogin") + `?site=${siteCode}`;
  };

  const handleQualityLogin = () => {
    window.location.href = createPageUrl("QualityLogin") + `?site=${siteCode}`;
  };

  const handleHelperLogin = () => {
    window.location.href = createPageUrl("HelperLogin") + `?site=${siteCode}`;
  };

  const roles = [
    {
      id: "employee",
      title: "Sanitation Employee",
      description: "View and complete your assigned tasks, sign off on cleanings, and track your daily progress.",
      icon: Users,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      onClick: handleEmployeeLogin
    },
    {
      id: "quality",
      title: "Quality",
      description: "Perform pre-operational inspections on production lines before they run.",
      icon: ClipboardCheck,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      onClick: handleQualityLogin
    },
    {
      id: "helper",
      title: "Helper / Volunteer",
      description: "Quick sign-in for temporary helpers. Limited access to assist with tasks.",
      icon: HandHelping,
      color: "bg-gradient-to-br from-amber-500 to-amber-600",
      buttonColor: "bg-amber-600 hover:bg-amber-700",
      onClick: handleHelperLogin
    },
    {
      id: "manager",
      title: "Manager",
      description: "Access the full dashboard to manage tasks, employees, line cleanings, and view all records.",
      icon: ShieldCheck,
      color: "bg-gradient-to-br from-slate-700 to-slate-900",
      buttonColor: "bg-slate-900 hover:bg-slate-800",
      onClick: onManagerLogin
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-6"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Programs
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Sanitation Program
        </h2>
        <p className="text-sm text-slate-600">
          Select your role to continue
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {roles.map((role, index) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-5 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
              <div className="flex flex-col items-center text-center h-full">
                <div className={`w-12 h-12 rounded-full ${role.color} flex items-center justify-center mb-3`}>
                  <role.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {role.title}
                </h3>
                <p className="text-xs text-slate-600 mb-4 flex-1">
                  {role.description}
                </p>

                <Button
                  onClick={role.onClick}
                  size="sm"
                  className={`w-full ${role.buttonColor}`}
                >
                  Continue
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}