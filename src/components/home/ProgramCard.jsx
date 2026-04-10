import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export default function ProgramCard({ 
  icon: Icon, 
  title, 
  description, 
  color, 
  enabled = true, 
  onClick, 
  delay = 0,
  badge,
  subModules = []
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card 
        className={`group relative overflow-hidden transition-all duration-300 ${
          enabled 
            ? "bg-white border-slate-200 shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-1 rounded-2xl" 
            : "bg-slate-100/50 border-slate-200 opacity-60 rounded-2xl"
        }`}
        onClick={() => enabled && onClick?.()}
      >
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            {badge && (
              <Badge className={badge.className}>
                {badge.text}
              </Badge>
            )}
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">
            {description}
          </p>

          {subModules.length > 0 && (
            <div className="space-y-1 mb-4">
              {subModules.slice(0, 4).map((mod, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  {mod}
                </div>
              ))}
              {subModules.length > 4 && (
                <div className="text-xs text-slate-400">+{subModules.length - 4} more</div>
              )}
            </div>
          )}

          {enabled && (
            <div className="flex items-center text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
              Enter Program
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {!enabled && (
            <Badge variant="outline" className="text-xs">
              Not Enabled
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
}