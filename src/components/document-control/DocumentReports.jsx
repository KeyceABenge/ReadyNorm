import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Download, BarChart3, PieChart, Calendar
} from "lucide-react";
import { format, subMonths, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DocumentReports({ documents, versions, changeRequests, acknowledgments, employees }) {
  const [dateRange, setDateRange] = useState("12");

  const cutoffDate = subMonths(new Date(), parseInt(dateRange));

  // Stats calculations
  const stats = useMemo(() => {
    const total = documents.length;
    const effective = documents.filter(d => d.status === "effective").length;
    const draft = documents.filter(d => d.status === "draft").length;
    const obsolete = documents.filter(d => d.status === "obsolete" || d.status === "superseded").length;
    const overdueReview = documents.filter(d => d.next_review_date && new Date(d.next_review_date) < new Date()).length;
    
    return { total, effective, draft, obsolete, overdueReview };
  }, [documents]);

  // Documents by type
  const byType = useMemo(() => {
    const counts = {};
    documents.forEach(d => {
      counts[d.document_type] = (counts[d.document_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [documents]);

  // Documents by category
  const byCategory = useMemo(() => {
    const counts = {};
    documents.forEach(d => {
      const cat = d.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [documents]);

  // Change requests over time
  const crsByMonth = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      months[format(d, "MMM yyyy")] = { month: format(d, "MMM"), created: 0, completed: 0 };
    }
    
    changeRequests.forEach(cr => {
      const created = format(parseISO(cr.created_date), "MMM yyyy");
      if (months[created]) months[created].created++;
      if (cr.completed_at) {
        const completed = format(parseISO(cr.completed_at), "MMM yyyy");
        if (months[completed]) months[completed].completed++;
      }
    });
    
    return Object.values(months);
  }, [changeRequests]);

  // Training compliance
  const trainingCompliance = useMemo(() => {
    const docsRequiringTraining = documents.filter(d => d.requires_training && d.status === "effective");
    const totalRequired = docsRequiringTraining.length * employees.length;
    const completed = acknowledgments.filter(a => a.status === "completed").length;
    const rate = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 100;
    
    return { totalRequired, completed, rate };
  }, [documents, acknowledgments, employees]);

  const exportReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      summary: stats,
      documents_by_type: byType,
      documents_by_category: byCategory,
      training_compliance: trainingCompliance
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-control-report-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40 bg-white/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportReport}>
          <Download className="w-4 h-4 mr-1.5" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">Total Documents</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500">Effective</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.effective}</p>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Draft</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-xs text-slate-500">Overdue Review</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats.overdueReview}</p>
        </Card>
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Training Compliance</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{trainingCompliance.rate}%</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Documents by Type */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Documents by Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={byType}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Documents by Category */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Documents by Category
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Change Requests Over Time */}
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 p-4 md:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Change Requests Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}