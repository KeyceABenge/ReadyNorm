/**
 * Mobile Progress Header
 * Shows daily progress with large, clear visual indicators
 */

import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileProgressHeader({ 
  completed, 
  total, 
  overdue = 0,
  className 
}) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;
  
  // Determine status color
  const getStatusColor = () => {
    if (progress === 100) return "from-emerald-500 to-emerald-600";
    if (progress > 50) return "from-blue-500 to-blue-600";
    return "from-slate-500 to-slate-600";
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {/* Progress Bar - Full Width at Top */}
      <div className="h-2 bg-slate-100">
        <div 
          className={cn("h-full bg-gradient-to-r transition-all duration-500", getStatusColor())}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="p-4">
        {/* Main Progress Display */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-500 font-medium">Today's Progress</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">{progress}</span>
              <span className="text-2xl font-bold text-slate-400">%</span>
            </div>
          </div>
          
          {/* Circular Progress Indicator */}
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke={progress === 100 ? "#10b981" : "#3b82f6"}
                strokeWidth="8"
                strokeDasharray={`${progress * 2.136} 213.6`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {progress === 100 ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              ) : (
                <span className="text-lg font-bold text-slate-700">
                  {completed}/{total}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center bg-slate-50 rounded-xl p-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-slate-900">{remaining}</p>
            <p className="text-[10px] text-slate-500">Remaining</p>
          </div>
          
          <div className="flex flex-col items-center bg-slate-50 rounded-xl p-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-slate-900">{completed}</p>
            <p className="text-[10px] text-slate-500">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}