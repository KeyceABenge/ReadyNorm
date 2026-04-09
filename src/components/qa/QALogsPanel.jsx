/**
 * Manager panel for viewing Q&A logs and identifying training gaps
 */

import { useState } from "react";
import { EmployeeQALogRepo } from "@/lib/adapters/database";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageCircleQuestion, AlertTriangle, TrendingUp, Search,
  FileQuestion, CheckCircle, XCircle, BarChart3
} from "lucide-react";
import { format, parseISO, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS = {
  sanitation: { label: "Sanitation", color: "bg-blue-100 text-blue-800" },
  food_safety: { label: "Food Safety", color: "bg-green-100 text-green-800" },
  quality: { label: "Quality", color: "bg-purple-100 text-purple-800" },
  chemicals: { label: "Chemicals", color: "bg-orange-100 text-orange-800" },
  allergens: { label: "Allergens", color: "bg-red-100 text-red-800" },
  ppe: { label: "PPE", color: "bg-cyan-100 text-cyan-800" },
  equipment: { label: "Equipment", color: "bg-slate-100 text-slate-800" },
  training: { label: "Training", color: "bg-indigo-100 text-indigo-800" },
  other: { label: "Other", color: "bg-gray-100 text-gray-800" }
};

export default function QALogsPanel({ organizationId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("7days");

  const { data: qaLogs = [], isLoading } = useQuery({
    queryKey: ["qa_logs", organizationId],
    queryFn: () => EmployeeQALogRepo.filter(
      { organization_id: organizationId }, 
      "-created_date", 
      500
    ),
    enabled: !!organizationId,
    staleTime: 60000
  });

  // Filter by time range
  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "24h": return { start: subDays(now, 1), end: now };
      case "7days": return { start: subDays(now, 7), end: now };
      case "30days": return { start: subDays(now, 30), end: now };
      default: return { start: subDays(now, 7), end: now };
    }
  };

  const { start, end } = getDateRange();

  const filteredLogs = qaLogs.filter(log => {
    // Time filter
    if (log.created_date) {
      const logDate = parseISO(log.created_date);
      if (!isWithinInterval(logDate, { start: startOfDay(start), end: endOfDay(end) })) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== "all" && log.topic_category !== categoryFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.question?.toLowerCase().includes(query) ||
        log.employee_name?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Calculate stats
  const stats = {
    total: filteredLogs.length,
    answered: filteredLogs.filter(l => l.was_answered).length,
    unanswered: filteredLogs.filter(l => !l.was_answered).length,
    flagged: filteredLogs.filter(l => l.flagged_for_review).length
  };

  // Get top unanswered topics (training gaps)
  const trainingGaps = filteredLogs
    .filter(l => !l.was_answered)
    .reduce((acc, log) => {
      const category = log.topic_category || "other";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

  const sortedGaps = Object.entries(trainingGaps)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Category breakdown
  const categoryBreakdown = filteredLogs.reduce((acc, log) => {
    const category = log.topic_category || "other";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5" />
            Employee Q&A Insights
          </h2>
          <p className="text-sm text-slate-500">
            Track questions and identify training gaps
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <MessageCircleQuestion className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.answered}</p>
                <p className="text-xs text-slate-500">Answered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <FileQuestion className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.unanswered}</p>
                <p className="text-xs text-slate-500">No Source Found</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.flagged}</p>
                <p className="text-xs text-slate-500">Flagged for Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gaps">
        <TabsList>
          <TabsTrigger value="gaps">Training Gaps</TabsTrigger>
          <TabsTrigger value="logs">Question Log</TabsTrigger>
          <TabsTrigger value="breakdown">By Category</TabsTrigger>
        </TabsList>

        {/* Training Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4">
          {sortedGaps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-500">No unanswered questions in this period!</p>
                <p className="text-sm text-slate-400 mt-1">
                  Your documentation is covering employee needs well.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Topics Needing Documentation
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Questions that couldn't be answered from internal sources
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedGaps.map(([category, count]) => {
                    const config = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
                    const percentage = Math.round((count / stats.unanswered) * 100);
                    return (
                      <div key={category} className="flex items-center gap-3">
                        <Badge className={cn("w-24 justify-center", config.color)}>
                          {config.label}
                        </Badge>
                        <div className="flex-1">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium w-16 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Unanswered questions list */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Recent Unanswered Questions</h4>
                  <div className="space-y-2">
                    {filteredLogs
                      .filter(l => !l.was_answered)
                      .slice(0, 5)
                      .map(log => (
                        <div key={log.id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                          <p className="text-sm text-slate-900">"{log.question}"</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <span>{log.employee_name || "Anonymous"}</span>
                            <span>•</span>
                            <span>{log.created_date ? format(parseISO(log.created_date), "MMM d, h:mm a") : ""}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Question Log Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logs list */}
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageCircleQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No questions found</p>
                </CardContent>
              </Card>
            ) : (
              filteredLogs.slice(0, 50).map(log => {
                const categoryConfig = CATEGORY_LABELS[log.topic_category] || CATEGORY_LABELS.other;
                return (
                  <Card key={log.id} className={cn(
                    log.flagged_for_review && "border-amber-200 bg-amber-50/50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 mb-2">"{log.question}"</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={cn("text-xs", categoryConfig.color)}>
                              {categoryConfig.label}
                            </Badge>
                            {log.was_answered ? (
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Answered
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 text-xs">
                                <XCircle className="w-3 h-3 mr-1" />
                                No Source
                              </Badge>
                            )}
                            {log.flagged_for_review && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Review
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>{log.employee_name || "Anonymous"}</p>
                          <p>{log.created_date ? format(parseISO(log.created_date), "MMM d") : ""}</p>
                        </div>
                      </div>
                      {log.source_used && log.source_type !== "no_source" && (
                        <p className="text-xs text-slate-500 mt-2 pt-2 border-t">
                          Source: {log.source_used}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Category Breakdown Tab */}
        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Questions by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => {
                    const config = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
                    const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={category} className="flex items-center gap-3">
                        <Badge className={cn("w-24 justify-center", config.color)}>
                          {config.label}
                        </Badge>
                        <div className="flex-1">
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium w-20 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}