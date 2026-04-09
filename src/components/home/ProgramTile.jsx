import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ProgramTile({ 
  icon: Icon, 
  title, 
  description, 
  color, 
  enabled = true, 
  onClick,
  delay = 0,
  // Sanitation-specific props
  isSanitation = false,
  roleButtons = null
}) {
  // If this is Sanitation with role buttons, render styled card with role buttons
  if (isSanitation && enabled && roleButtons) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="h-full"
      >
        <Card className="group relative overflow-hidden bg-white/70 backdrop-blur-xl border-white/80 shadow-lg h-full">
          {/* Gradient accent */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />
          
          <div className="p-6">
            <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-lg mb-4`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
              {description}
            </p>

            {/* Stacked Role Buttons */}
            <div className="flex flex-col gap-2 w-full">
              {roleButtons}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Standard tile for other programs
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full"
    >
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300 h-full",
          enabled 
            ? "bg-white/70 backdrop-blur-xl border-white/80 shadow-lg hover:shadow-xl cursor-pointer hover:-translate-y-1" 
            : "bg-slate-100/50 border-slate-200/50 opacity-60 cursor-not-allowed"
        )}
        onClick={enabled ? onClick : undefined}
      >
        {/* Gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${enabled ? color : "bg-slate-200"}`} />
        
        {!enabled && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-slate-100 text-slate-500 border border-slate-200 gap-1">
              <Lock className="w-3 h-3" />
              Locked
            </Badge>
          </div>
        )}
        
        <div className="p-6">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-4",
            enabled ? color : "bg-slate-200"
          )}>
            <Icon className={cn("w-7 h-7", enabled ? "text-white" : "text-slate-400")} />
          </div>
          
          <h3 className={cn(
            "text-lg font-bold mb-2 group-hover:text-slate-700 transition-colors",
            enabled ? "text-slate-900" : "text-slate-400"
          )}>
            {title}
          </h3>
          <p className={cn(
            "text-sm mb-4 line-clamp-2",
            enabled ? "text-slate-500" : "text-slate-400"
          )}>
            {description}
          </p>

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

// Exported role button component for Sanitation
export function SanitationRoleButton({ icon: RoleIcon, title, color, onClick }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-auto py-2.5 px-3 flex items-center justify-start gap-3 transition-all w-full rounded-xl",
        "bg-white/60 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <RoleIcon className="w-4 h-4 text-white" />
      </div>
      <span className="text-sm font-medium text-left">{title}</span>
    </Button>
  );
}