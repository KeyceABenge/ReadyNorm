import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, ClipboardCheck, HandHelping, ChevronRight, ArrowLeft } from "lucide-react";
import ProxiedImage from "@/components/ui/ProxiedImage";
import { createPageUrl } from "@/utils";

const options = [
  {
    id: "employee",
    title: "Sanitation Employee",
    description: "Complete daily tasks, line cleanings, and drain management",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    page: "EmployeeLogin"
  },
  {
    id: "quality",
    title: "Pre-Op Inspections (Quality)",
    description: "Conduct pre-operational inspections and quality checks",
    icon: ClipboardCheck,
    color: "from-yellow-500 to-amber-500",
    page: "QualityLogin"
  },
  {
    id: "helper",
    title: "Helper / Volunteer",
    description: "Assist with line cleanings and general tasks",
    icon: HandHelping,
    color: "from-orange-500 to-orange-600",
    page: "HelperLogin"
  }
];

export default function EmployeeLanding({ organization, siteCode, settings, onChangeRole }) {
  const handleClick = (option) => {
    sessionStorage.setItem('standalone_program', 'true');
    window.location.href = createPageUrl(option.page) + `?site=${siteCode}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 p-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 sm:mb-8"
        >
          <button 
            onClick={onChangeRole}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>

          <div className="flex items-center gap-2">
            <img src="/readynorm-logo-large.svg" alt="ReadyNorm" className="h-7 w-auto" />
            <div className="h-5 w-px bg-slate-300" />
            {organization?.logo_url ? (
              <ProxiedImage src={organization.logo_url} alt="" className="h-6 w-auto" />
            ) : settings?.logo_url ? (
              <ProxiedImage src={settings.logo_url} alt="" className="h-6 w-auto" />
            ) : null}
            <span className="text-sm font-semibold text-slate-900">{organization?.name || "ReadyNorm"}</span>
          </div>

          {siteCode && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Site</span>
              <code className="text-xs font-mono font-bold text-slate-800">{siteCode}</code>
            </div>
          )}
        </motion.div>

        {/* Hero prompt */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            Welcome 👋
          </h1>
          <p className="text-sm text-slate-600">Select how you'd like to proceed</p>
        </motion.div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card
                  className="p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 bg-white border-slate-200 rounded-2xl shadow-sm group"
                  onClick={() => handleClick(option)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">{option.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Removed — back arrow at top handles this */}
      </div>
    </div>
  );
}