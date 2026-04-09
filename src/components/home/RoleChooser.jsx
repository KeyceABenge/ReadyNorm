import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Users, ShieldCheck, ChevronRight } from "lucide-react";

const roles = [
  {
    id: "employee",
    title: "Employee",
    description: "Access sanitation tasks, pre-op inspections, and volunteer work.",
    icon: Users,
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "manager",
    title: "Manager",
    description: "Full access to dashboards, analytics, scheduling, and team management. Requires admin approval.",
    icon: ShieldCheck,
    color: "from-slate-700 to-slate-900"
  }
];

export default function RoleChooser({ onSelect }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h2 className="text-xl font-bold text-slate-800 mb-2">How are you joining?</h2>
        <p className="text-sm text-slate-600">Select your role to get started</p>
      </motion.div>

      <div className="space-y-3">
        {roles.map((role, index) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className="p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 bg-white border-slate-200 rounded-2xl shadow-sm group"
              onClick={() => onSelect(role.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0`}>
                  <role.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 group-hover:text-slate-700">{role.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}