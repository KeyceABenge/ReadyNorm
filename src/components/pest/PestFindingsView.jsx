import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, AlertTriangle, CheckCircle2, Filter, Download, Calendar, Plus, ExternalLink
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AutoCAPATrigger from "@/components/capa/AutoCAPATrigger";

import { toast } from "sonner";

const ACTIVITY_COLORS = {
  none: "bg-slate-100 text-slate-600",
  low: "bg-green-100 text-green-800",
  moderate: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  severe: "bg-red-100 text-red-800"
};

export default function PestFindingsView({ 
  findings, devices, serviceReports, thresholds, areas, productionLines, capas, organizationId, user, onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPestType, setFilterPestType] = useState("all");
  const [filterExceedance, setFilterExceedance] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [showCAPATrigger, setShowCAPATrigger] = useState(false);
  const [selectedFindingForCAPA, setSelectedFindingForCAPA] = useState(null);

  const filteredFindings = useMemo(() => {
    const cutoffDate = dateRange === "all" 
      ? new Date(0) 
      : subDays(new Date(), parseInt(dateRange));

    return findings.filter(f => {
      if (new Date(f.service_date) < cutoffDate) return false;
      
      const matchesSearch = 
        f.device_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.area_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPest = filterPestType === "all" || f.pest_type === filterPestType;
      
      const matchesExceedance = 
        filterExceedance === "all" ||
        (filterExceedance === "exceeded" && f.threshold_exceeded) ||
        (filterExceedance === "normal" && !f.threshold_exceeded);
      
      return matchesSearch && matchesPest && matchesExceedance;
    });
  }, [findings, searchQuery, filterPestType, filterExceedance, dateRange]);

  // Group by service date
  const groupedFindings = useMemo(() => {
    const groups = {};
    filteredFindings.forEach(f => {
      const date = f.service_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(f);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [filteredFindings]);

  const exportFindings = () => {
    const csv = [
      ["Date", "Device Code", "Pest Type", "Count", "Activity", "Threshold Exceeded", "Severity", "Area", "Notes"].join(","),
      ...filteredFindings.map(f => [
        f.service_date,
        f.device_code,
        f.pest_type,
        f.count,
        f.activity_level,
        f.threshold_exceeded ? "Yes" : "No",
        f.exceedance_severity || "",
        f.area_name || "",
        `"${(f.finding_notes || "").replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pest-findings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const stats = useMemo(() => {
    return {
      total: filteredFindings.length,
      exceedances: filteredFindings.filter(f => f.threshold_exceeded).length,
      totalCount: filteredFindings.reduce((sum, f) => sum + (f.count || 0), 0)
    };
  }, [filteredFindings]);

  const handleCreateCAPA = (finding) => {
    setSelectedFindingForCAPA(finding);
    setShowCAPATrigger(true);
  };

  const handleCAPACreated = async (capa) => {
    try {
      await PestFindingRepo.update(selectedFindingForCAPA.id, {
        linked_capa_id: capa.id,
        corrective_action_required: true
      });
      toast.success("CAPA linked to pest finding");
      onRefresh?.();
    } catch (error) {
      console.error("Failed to link CAPA:", error);
    }
    setShowCAPATrigger(false);
    setSelectedFindingForCAPA(null);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by device or area..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPestType} onValueChange={setFilterPestType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Pest Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pests</SelectItem>
                <SelectItem value="rodents">Rodents</SelectItem>
                <SelectItem value="flies">Flies</SelectItem>
                <SelectItem value="stored_product_insects">SPI</SelectItem>
                <SelectItem value="cockroaches">Cockroaches</SelectItem>
                <SelectItem value="ants">Ants</SelectItem>
                <SelectItem value="birds">Birds</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterExceedance} onValueChange={setFilterExceedance}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Findings</SelectItem>
                <SelectItem value="exceeded">Exceedances Only</SelectItem>
                <SelectItem value="normal">Normal Only</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportFindings}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-slate-500">Total Findings</p>
          </CardContent>
        </Card>
        <Card className={stats.exceedances > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${stats.exceedances > 0 ? "text-red-600" : ""}`}>
              {stats.exceedances}
            </p>
            <p className="text-sm text-slate-500">Threshold Exceedances</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalCount}</p>
            <p className="text-sm text-slate-500">Total Pest Count</p>
          </CardContent>
        </Card>
      </div>

      {/* Findings List */}
      {groupedFindings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
            <p className="text-slate-500">No findings match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedFindings.map(([date, dateFindings]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{format(parseISO(date), "EEEE, MMMM d, yyyy")}</span>
                  <Badge variant="outline">
                    {dateFindings.length} finding{dateFindings.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dateFindings.map(finding => (
                    <div 
                      key={finding.id}
                      className={`p-4 rounded-lg border ${
                        finding.threshold_exceeded 
                          ? finding.exceedance_severity === "critical"
                            ? "bg-red-50 border-red-200"
                            : "bg-amber-50 border-amber-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold">{finding.device_code}</span>
                            <Badge variant="outline">{finding.device_type}</Badge>
                            {finding.threshold_exceeded && (
                              <Badge className={
                                finding.exceedance_severity === "critical"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {finding.exceedance_severity}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Pest Type:</span>
                              <span className="ml-2 font-medium">
                                {finding.pest_type?.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Count:</span>
                              <span className="ml-2 font-bold">{finding.count}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Activity:</span>
                              <Badge className={`ml-2 ${ACTIVITY_COLORS[finding.activity_level] || ACTIVITY_COLORS.none}`}>
                                {finding.activity_level}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-slate-500">Area:</span>
                              <span className="ml-2">{finding.area_name || "—"}</span>
                            </div>
                          </div>

                          {finding.finding_notes && (
                            <p className="mt-2 text-sm text-slate-600 bg-white/50 p-2 rounded">
                              {finding.finding_notes}
                            </p>
                          )}

                          {/* CAPA Actions */}
                          <div className="mt-3 flex items-center gap-2">
                            {finding.linked_capa_id ? (
                              <Link to={createPageUrl("CAPAProgram")}>
                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View CAPA
                                </Button>
                              </Link>
                            ) : finding.threshold_exceeded && (finding.exceedance_severity === "critical" || finding.exceedance_severity === "major") && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCreateCAPA(finding)}
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Create CAPA
                              </Button>
                            )}
                          </div>
                        </div>

                        {finding.ai_extracted && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            AI Extracted
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Auto CAPA Trigger Modal */}
      {showCAPATrigger && selectedFindingForCAPA && (
        <AutoCAPATrigger
          open={showCAPATrigger}
          onClose={() => {
            setShowCAPATrigger(false);
            setSelectedFindingForCAPA(null);
          }}
          sourceType="pest"
          sourceRecord={selectedFindingForCAPA}
          organizationId={organizationId}
          user={user}
          severity={selectedFindingForCAPA.exceedance_severity === "critical" ? "critical" : "high"}
          autoTitle={`Pest Threshold Exceedance: ${selectedFindingForCAPA.device_code}`}
          autoDescription={`Critical pest activity detected at device ${selectedFindingForCAPA.device_code}\n\nPest Type: ${selectedFindingForCAPA.pest_type?.replace(/_/g, " ")}\nCount: ${selectedFindingForCAPA.count}\nActivity Level: ${selectedFindingForCAPA.activity_level}\nArea: ${selectedFindingForCAPA.area_name || 'N/A'}\nService Date: ${selectedFindingForCAPA.service_date}`}
          onCAPACreated={handleCAPACreated}
        />
      )}
    </div>
  );
}