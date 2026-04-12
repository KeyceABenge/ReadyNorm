// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { isAuthenticated, getCurrentUser } from "@/lib/adapters/auth";
import { invokeLLM } from "@/lib/adapters/integrations";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Loader2, Sparkles, Building2, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import { useExecutiveData, computeMetrics } from "@/components/executive/useMultiSiteData";
import { computeMSSCompletion, getCurrentWeekRange } from "@/components/executive/mssCompletionCalc";
import SiteMetricsCard from "@/components/executive/SiteMetricsCard";
import ProgramStatusGrid from "@/components/executive/ProgramStatusGrid";
import TopRisksSection from "@/components/executive/TopRisksSection";
import ActionsRequired from "@/components/executive/ActionsRequired";
import FiscalPeriodSelector, { buildPeriodOptions } from "@/components/executive/FiscalPeriodSelector";

export default function ExecutiveCommandCenter() {
  const [narrativeText, setNarrativeText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPeriodId, setSelectedPeriodId] = useState("ytd");
  // Use cached auth data from React Query (shared with Layout/Home)
  const { data: cachedUser } = useQuery({
    queryKey: ["auth_me"],
    queryFn: async () => {
      const isAuth = await isAuthenticated();
      if (!isAuth) return null;
      return getCurrentUser();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const storedSiteCode = localStorage.getItem("site_code");

  useEffect(() => {
    if (!storedSiteCode) {
      window.location.href = createPageUrl("Home");
    }
  }, [storedSiteCode]);

  const {
    currentOrg,
    orgGroup,
    orgGroupSites,
    isMultiSite,
    allOrgIds,
    allMetrics,
    perSiteMetrics,
    rawData,
    isLoading: dataLoading,
    loadError,
    meta,
  } = useExecutiveData(storedSiteCode);

  const allSiteSettings = rawData?.siteSettings || [];
  const primaryFiscalSettings = allSiteSettings[0]?.fiscal_year_settings || {};

  const periodOptions = useMemo(() => buildPeriodOptions(primaryFiscalSettings), [primaryFiscalSettings]);
  const selectedPeriod = periodOptions.find(p => p.id === selectedPeriodId) || periodOptions.find(p => p.id === "ytd") || periodOptions[periodOptions.length - 1];

  const filterByPeriod = (items, dateField) => {
    if (!selectedPeriod?.startDate) return items;
    const start = selectedPeriod.startDate;
    const end = selectedPeriod.endDate;
    return items.filter(item => {
      const d = new Date(item[dateField] || item.created_date);
      return d >= start && d <= end;
    });
  };

  const periodRawData = useMemo(() => {
    if (!rawData?.capas) return null;
    return {
      capas: filterByPeriod(rawData.capas, "created_date"),
      auditFindings: filterByPeriod(rawData.auditFindings, "created_date"),
      empSamples: filterByPeriod(rawData.empSamples, "collection_date"),
      empSites: rawData.empSites,
      pestFindings: filterByPeriod(rawData.pestFindings, "service_date"),
      pestEscalationMarkers: rawData.pestEscalationMarkers,
      complaints: filterByPeriod(rawData.complaints, "received_date"),
      risks: filterByPeriod(rawData.risks, "created_date"),
      areaSignOffs: filterByPeriod(rawData.areaSignOffs || [], "signed_off_at"),
    };
  }, [rawData, selectedPeriod]);

  const { start: weekStart, end: weekEnd } = useMemo(() => getCurrentWeekRange(), []);

  const periodAllMetrics = useMemo(() => {
    if (!periodRawData) return null;
    const m = computeMetrics(
      periodRawData.capas, periodRawData.auditFindings, periodRawData.empSamples,
      periodRawData.empSites, periodRawData.pestFindings, periodRawData.pestEscalationMarkers,
      periodRawData.complaints, periodRawData.risks, periodRawData.areaSignOffs
    );
    m.mss = computeMSSCompletion(rawData?.tasks || [], weekStart, weekEnd);
    return m;
  }, [periodRawData, rawData?.tasks, weekStart, weekEnd]);

  const periodPerSiteMetrics = useMemo(() => {
    if (!periodRawData) return [];
    const tasks = rawData?.tasks || [];
    return allOrgIds.map(id => {
      const m = computeMetrics(
        periodRawData.capas.filter(c => c._org_id === id),
        periodRawData.auditFindings.filter(a => a._org_id === id),
        periodRawData.empSamples.filter(e => e._org_id === id),
        periodRawData.empSites.filter(e => e._org_id === id),
        periodRawData.pestFindings.filter(p => p._org_id === id),
        periodRawData.pestEscalationMarkers.filter(p => p._org_id === id),
        periodRawData.complaints.filter(c => c._org_id === id),
        periodRawData.risks.filter(r => r._org_id === id),
        (periodRawData.areaSignOffs || []).filter(a => a._org_id === id)
      );
      m.mss = computeMSSCompletion(tasks.filter(t => t._org_id === id), weekStart, weekEnd);
      return { orgId: id, metrics: m };
    });
  }, [periodRawData, allOrgIds, rawData?.tasks, weekStart, weekEnd]);

  const generateExecutiveNarrative = async () => {
    if (!periodAllMetrics) return;
    setIsGenerating(true);
    try {
      const m = periodAllMetrics;
      const siteCount = allOrgIds.length;
      const periodLabel = selectedPeriod?.name || "All Time";
      const result = await invokeLLM({
        prompt: `You are generating an executive summary for food safety and quality leadership. Write a concise one-sentence narrative.

${isMultiSite ? `Viewing ${siteCount} sites across the organization.` : "Viewing single site."}

Period: ${periodLabel}
Current Status:
- Quality Health Score: ${m.score}/100 (${m.status})
- Open CAPAs: ${m.capas.open}, Overdue: ${m.capas.overdue}, Ineffective: ${m.capas.ineffective}
- Pathogen positives (30d): ${m.emp.pathogenPositives}
- Major audit gaps: ${m.audit.majorGaps}
- Critical pest exceedances: ${m.pest.critical}
- Critical complaints: ${m.complaints.criticalMajor}
- High/Critical risks: ${m.risks.highCritical}

Issues: ${m.issues.join(", ")}

Write ONE sentence (max 30 words) that is direct, actionable. ${isMultiSite ? "Mention if issues are concentrated at specific sites or spread across all." : ""}`,
        response_json_schema: {
          type: "object",
          properties: { narrative: { type: "string" } }
        }
      });
      setNarrativeText(result.narrative);
    } catch (error) {
      console.error("Failed to generate narrative:", error);
      setNarrativeText("Unable to generate executive summary at this time.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (periodAllMetrics && !dataLoading) {
      generateExecutiveNarrative();
    }
  }, [periodAllMetrics?.score, dataLoading, selectedPeriodId]);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 flex flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Loading Executive Command Center</p>
          <p className="text-xs text-slate-400 mt-1">Fetching data across all sites — this may take up to a minute...</p>
        </div>
      </div>
    );
  }

  // If loading finished but no data or there was an error
  if (loadError || !periodAllMetrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => window.location.href = createPageUrl("Home")}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
            >
              <span className="text-slate-600 text-lg">←</span>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Executive Command Center</h1>
          </div>
          <Card><CardContent className="py-12 text-center">
            {loadError ? (
              <>
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-slate-700 font-medium mb-1">Failed to load executive data</p>
                <p className="text-sm text-slate-500">{loadError}</p>
              </>
            ) : (
              <p className="text-slate-500">No data available yet. Please ensure your site has programs configured.</p>
            )}
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  const getScoreBg = (score) => {
    if (score >= 85) return "bg-emerald-50 border-emerald-200";
    if (score >= 70) return "bg-blue-50 border-blue-200";
    if (score >= 50) return "bg-amber-50 border-amber-200";
    return "bg-rose-50 border-rose-200";
  };

  const siteMap = {};
  orgGroupSites.forEach(s => { siteMap[s.id] = s; });
  if (!isMultiSite && currentOrg) { siteMap[currentOrg.id] = currentOrg; }

  const getTabMetrics = () => {
    if (activeTab === "all") return periodAllMetrics;
    const site = periodPerSiteMetrics.find(s => s.orgId === activeTab);
    return site?.metrics || periodAllMetrics;
  };

  const getTabRawData = () => {
    if (activeTab === "all") return periodRawData;
    return {
      capas: periodRawData.capas.filter(c => c._org_id === activeTab),
      auditFindings: periodRawData.auditFindings.filter(a => a._org_id === activeTab),
      empSamples: periodRawData.empSamples.filter(e => e._org_id === activeTab),
      empSites: periodRawData.empSites.filter(e => e._org_id === activeTab),
      pestFindings: periodRawData.pestFindings.filter(p => p._org_id === activeTab),
      pestEscalationMarkers: periodRawData.pestEscalationMarkers.filter(p => p._org_id === activeTab),
      complaints: periodRawData.complaints.filter(c => c._org_id === activeTab),
      risks: periodRawData.risks.filter(r => r._org_id === activeTab),
      areaSignOffs: (periodRawData.areaSignOffs || []).filter(a => a._org_id === activeTab),
    };
  };

  const tabMetrics = getTabMetrics();
  const tabRawData = getTabRawData();
  const tabSiteName = activeTab !== "all" ? (siteMap[activeTab]?.site_name || siteMap[activeTab]?.name) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-orange-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => window.location.href = createPageUrl("Home")}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="text-slate-600 text-lg">←</span>
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            <span className="text-sm font-semibold text-slate-900 hidden sm:block">Executive Command Center</span>
            <span className="text-sm font-semibold text-slate-900 sm:hidden">Command Center</span>
            {isMultiSite && orgGroup && (
              <Badge variant="outline" className="text-xs ml-1">
                <Building2 className="w-3 h-3 mr-1" />
                {orgGroup.name} · {orgGroupSites.length} sites
              </Badge>
            )}
          </div>
          <div className="w-10" />
        </div>

        {/* Fiscal Period Selector */}
        <FiscalPeriodSelector
          fiscalSettings={primaryFiscalSettings}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={setSelectedPeriodId}
        />

        {/* Multi-Site Overview */}
        {isMultiSite && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Sites Overview
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {periodPerSiteMetrics.map(({ orgId, metrics }) => {
                const site = siteMap[orgId];
                return (
                  <button key={orgId} onClick={() => setActiveTab(orgId)} className="text-left">
                    <SiteMetricsCard
                      siteName={site?.site_name || site?.name}
                      siteCode={site?.site_code}
                      metrics={metrics}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab selector for multi-site */}
        {isMultiSite && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all" className="text-xs">All Sites Combined</TabsTrigger>
              {orgGroupSites.map(site => (
                <TabsTrigger key={site.id} value={site.id} className="text-xs">
                  {site.site_name || site.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Executive Narrative */}
        <Card className={cn("border-2", getScoreBg(tabMetrics.score))}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center border-3 flex-shrink-0",
                tabMetrics.score >= 85 ? "border-emerald-400 bg-emerald-100" :
                tabMetrics.score >= 70 ? "border-blue-400 bg-blue-100" :
                tabMetrics.score >= 50 ? "border-amber-400 bg-amber-100" :
                "border-rose-400 bg-rose-100"
              )}>
                <span className={cn("text-2xl font-bold", getScoreColor(tabMetrics.score))}>
                  {tabMetrics.score}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900">
                    {tabSiteName ? `${tabSiteName} — Quality Health` : "Overall Quality Health"}
                  </h3>
                  <Badge className={cn(
                    "text-xs",
                    tabMetrics.score >= 85 ? "bg-emerald-600" :
                    tabMetrics.score >= 70 ? "bg-blue-600" :
                    tabMetrics.score >= 50 ? "bg-amber-600" : "bg-rose-600",
                    "text-white"
                  )}>
                    {tabMetrics.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                {activeTab === "all" ? (
                  isGenerating ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating executive summary...</span>
                    </div>
                  ) : (
                    <p className="text-slate-700 text-lg font-medium italic">"{narrativeText}"</p>
                  )
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tabMetrics.issues.map((issue, i) => (
                      <Badge key={i} variant="outline" className="text-xs text-slate-600">{issue}</Badge>
                    ))}
                  </div>
                )}
                {activeTab === "all" && (
                  <Button variant="ghost" size="sm" onClick={generateExecutiveNarrative} disabled={isGenerating} className="mt-2 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Quality Warning */}
        {meta?.failures?.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Some data couldn't be loaded: {meta.failures.join(', ')}. Results may be incomplete.
                <button onClick={() => window.location.reload()} className="ml-2 underline font-medium">Retry</button>
              </p>
            </CardContent>
          </Card>
        )}



        {/* Top 3 Risks */}
        <TopRisksSection rawData={tabRawData} siteName={tabSiteName} />

        {/* Program Status Grid */}
        <ProgramStatusGrid metrics={tabMetrics} showLinks={activeTab === "all" || !isMultiSite} />

        {/* Actions Required */}
        <ActionsRequired metrics={tabMetrics} siteName={tabSiteName} />
      </div>
    </div>
  );
}