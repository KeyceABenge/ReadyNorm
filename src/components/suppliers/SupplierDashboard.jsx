import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertTriangle, Clock, TrendingUp, ArrowRight, CheckCircle2, FileWarning } from "lucide-react";

const RISK_CONFIG = {
  low: { color: "bg-emerald-100 text-emerald-700", label: "Low Risk" },
  medium: { color: "bg-yellow-100 text-yellow-700", label: "Medium Risk" },
  high: { color: "bg-orange-100 text-orange-700", label: "High Risk" },
  critical: { color: "bg-rose-100 text-rose-700", label: "Critical Risk" }
};

const STATUS_CONFIG = {
  pending_approval: { color: "bg-slate-100 text-slate-700", label: "Pending" },
  approved: { color: "bg-emerald-100 text-emerald-700", label: "Approved" },
  conditional: { color: "bg-amber-100 text-amber-700", label: "Conditional" },
  suspended: { color: "bg-rose-100 text-rose-700", label: "Suspended" },
  disqualified: { color: "bg-red-100 text-red-700", label: "Disqualified" },
  inactive: { color: "bg-slate-100 text-slate-600", label: "Inactive" }
};

export default function SupplierDashboard({ suppliers, materials, nonconformances, onSelectSupplier }) {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const highRiskSuppliers = suppliers.filter(s => 
    (s.risk_rating === "high" || s.risk_rating === "critical") && s.status === "approved"
  ).slice(0, 5);

  const overdueReviews = suppliers.filter(s => 
    s.next_review_date && new Date(s.next_review_date) < today && s.status === "approved"
  ).slice(0, 5);

  const expiringDocuments = [];
  suppliers.forEach(s => {
    (s.required_documents || []).forEach(doc => {
      if (doc.expiration_date && new Date(doc.expiration_date) < thirtyDaysFromNow && new Date(doc.expiration_date) > today) {
        expiringDocuments.push({ supplier: s, document: doc });
      }
    });
  });

  const openNCs = nonconformances.filter(nc => nc.status !== "closed").slice(0, 5);

  const statusCounts = {
    approved: suppliers.filter(s => s.status === "approved").length,
    conditional: suppliers.filter(s => s.status === "conditional").length,
    suspended: suppliers.filter(s => s.status === "suspended").length,
    pending_approval: suppliers.filter(s => s.status === "pending_approval").length
  };

  const riskCounts = {
    low: suppliers.filter(s => s.risk_rating === "low" && s.status === "approved").length,
    medium: suppliers.filter(s => s.risk_rating === "medium" && s.status === "approved").length,
    high: suppliers.filter(s => s.risk_rating === "high" && s.status === "approved").length,
    critical: suppliers.filter(s => s.risk_rating === "critical" && s.status === "approved").length
  };

  const avgPerformance = suppliers.filter(s => s.performance_score).length > 0
    ? Math.round(suppliers.filter(s => s.performance_score).reduce((sum, s) => sum + s.performance_score, 0) / suppliers.filter(s => s.performance_score).length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              High Risk Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highRiskSuppliers.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No high-risk suppliers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {highRiskSuppliers.map(supplier => (
                  <div key={supplier.id} onClick={() => onSelectSupplier(supplier)}
                    className="p-3 bg-white/80 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{supplier.supplier_code}</span>
                          <Badge className={RISK_CONFIG[supplier.risk_rating]?.color}>{RISK_CONFIG[supplier.risk_rating]?.label}</Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-800">{supplier.name}</p>
                        <p className="text-xs text-slate-500">{supplier.total_nonconformances || 0} NCs • {supplier.supplier_type}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Total Suppliers</span>
              <span className="text-lg font-bold text-slate-800">{suppliers.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-emerald-700">Avg Performance</span>
              <span className="text-lg font-bold text-emerald-600">{avgPerformance}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">Materials</span>
              <span className="text-lg font-bold text-blue-600">{materials.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Overdue Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueReviews.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All reviews up to date</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueReviews.map(supplier => (
                  <div key={supplier.id} onClick={() => onSelectSupplier(supplier)}
                    className="p-3 bg-orange-50 rounded-lg border border-orange-100 hover:border-orange-200 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{supplier.name}</p>
                        <p className="text-xs text-orange-600">Due: {format(new Date(supplier.next_review_date), "MMM d, yyyy")}</p>
                      </div>
                      <Badge className={RISK_CONFIG[supplier.risk_rating]?.color}>{supplier.risk_rating}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-amber-500" />
              Recent Nonconformances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openNCs.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No open nonconformances</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openNCs.map(nc => (
                  <div key={nc.id} className="p-3 bg-white/80 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-slate-400">{nc.nc_number}</p>
                        <p className="text-sm font-medium text-slate-800">{nc.supplier_name}</p>
                        <p className="text-xs text-slate-500">{nc.nc_type.replace(/_/g, " ")}</p>
                      </div>
                      <Badge className={nc.severity === "critical" ? "bg-rose-100 text-rose-700" : nc.severity === "major" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                        {nc.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Supplier Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "approved", label: "Approved", color: "bg-emerald-500" },
                { key: "conditional", label: "Conditional", color: "bg-amber-500" },
                { key: "suspended", label: "Suspended", color: "bg-rose-500" },
                { key: "pending_approval", label: "Pending", color: "bg-slate-500" }
              ].map(status => (
                <div key={status.key} className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg border border-slate-100">
                  <div className={`w-3 h-3 rounded-full ${status.color}`} />
                  <span className="text-sm text-slate-600">{status.label}</span>
                  <span className="text-sm font-bold text-slate-800">{statusCounts[status.key]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "low", label: "Low", color: "bg-emerald-500" },
                { key: "medium", label: "Medium", color: "bg-yellow-500" },
                { key: "high", label: "High", color: "bg-orange-500" },
                { key: "critical", label: "Critical", color: "bg-rose-500" }
              ].map(risk => (
                <div key={risk.key} className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg border border-slate-100">
                  <div className={`w-3 h-3 rounded-full ${risk.color}`} />
                  <span className="text-sm text-slate-600">{risk.label}</span>
                  <span className="text-sm font-bold text-slate-800">{riskCounts[risk.key]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}