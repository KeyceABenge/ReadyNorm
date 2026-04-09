/**
 * Hook and helpers for fetching multi-site executive data.
 * Uses a backend function to avoid frontend rate limits.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { invokeFunction } from "@/lib/adapters/functions";
import { subDays } from "date-fns";

/**
 * Compute quality/safety metrics from raw entity arrays.
 */
export function computeMetrics(capas, auditFindings, empSamples, empSites, pestFindings, pestEscalationMarkers, complaints, risks, areaSignOffs) {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  const openCapas = capas.filter(c => c.status !== "closed");
  const overdueCapas = openCapas.filter(c => c.due_date && new Date(c.due_date) < now);
  const ineffectiveCapas = capas.filter(c => c.effectiveness_status === "ineffective");
  const checksDue = capas.filter(c => c.status === "implemented" && c.effectiveness_status !== "effective" && c.effectiveness_status !== "ineffective");

  const majorGaps = auditFindings.filter(f => f.compliance_status === "major_gap" || f.compliance_status === "critical_gap");
  const needsCapa = auditFindings.filter(f => f.requires_capa && !f.capa_id);

  const pathogenPositives = empSamples.filter(s =>
    new Date(s.collection_date) >= thirtyDaysAgo &&
    s.overall_result === "fail" &&
    s.test_results?.some(t => (t.test_type === "listeria_mono" || t.test_type === "salmonella") && t.result === "positive")
  );
  const pendingReswabs = empSamples.filter(s => s.reswab_status === "pending");
  const activeSites = empSites.filter(s => s.status === "active");

  const criticalPest = pestFindings.filter(f => f.threshold_exceeded && f.exceedance_severity === "critical");
  const escalations = (pestEscalationMarkers || []).filter(m => m.status === "active");
  const recentPest = pestFindings.filter(f => new Date(f.service_date || f.created_date) >= thirtyDaysAgo);

  const openComplaints = complaints.filter(c => c.status !== "closed");
  const criticalMajor = complaints.filter(c => c.status !== "closed" && (c.severity === "critical" || c.severity === "major"));
  const recentComplaints = complaints.filter(c => new Date(c.received_date || c.created_date) >= thirtyDaysAgo);

  const highCriticalRisks = risks.filter(r => r.status !== "closed" && (r.risk_level === "critical" || r.risk_level === "high"));
  const openRisks = risks.filter(r => r.status !== "closed");

  // ATP metrics from AreaSignOff records
  const atpRecords = (areaSignOffs || []).filter(r => r.atp_test_result && r.atp_test_result !== 'not_required');
  const atpPass = atpRecords.filter(r => r.atp_test_result === 'pass').length;
  const atpFail = atpRecords.filter(r => r.atp_test_result === 'fail').length;
  const atpTotal = atpPass + atpFail;
  const atpFailRate = atpTotal > 0 ? Math.round((atpFail / atpTotal) * 100) : 0;

  let score = 100;
  const issues = [];

  if (overdueCapas.length > 0) { score -= Math.min(overdueCapas.length * 5, 20); issues.push(`${overdueCapas.length} overdue CAPA(s)`); }
  if (ineffectiveCapas.length > 0) { score -= Math.min(ineffectiveCapas.length * 5, 15); issues.push(`${ineffectiveCapas.length} ineffective CAPA(s)`); }
  if (majorGaps.length > 0) { score -= Math.min(majorGaps.length * 3, 15); issues.push(`${majorGaps.length} major audit gap(s)`); }
  if (pathogenPositives.length > 0) { score -= Math.min(pathogenPositives.length * 10, 25); issues.push(`${pathogenPositives.length} pathogen positive(s)`); }
  if (criticalPest.length > 0) { score -= Math.min(criticalPest.length * 5, 15); issues.push(`${criticalPest.length} critical pest exceedance(s)`); }
  if (criticalMajor.length > 0) { score -= Math.min(criticalMajor.length * 5, 10); issues.push(`${criticalMajor.length} critical complaint(s)`); }
  if (highCriticalRisks.length > 0) { score -= Math.min(highCriticalRisks.length * 3, 10); issues.push(`${highCriticalRisks.length} high/critical risk(s)`); }
  if (atpFailRate > 10) { score -= Math.min(atpFail * 2, 10); issues.push(`${atpFailRate}% ATP fail rate`); }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "needs_attention" : "critical";

  return {
    score, status, issues,
    capas: { open: openCapas.length, overdue: overdueCapas.length, ineffective: ineffectiveCapas.length, checksDue: checksDue.length },
    audit: { majorGaps: majorGaps.length, needsCapa: needsCapa.length, totalFindings: auditFindings.length },
    emp: { pathogenPositives: pathogenPositives.length, pendingReswabs: pendingReswabs.length, activeSites: activeSites.length },
    pest: { critical: criticalPest.length, escalations: escalations.length, recent30d: recentPest.length },
    complaints: { open: openComplaints.length, criticalMajor: criticalMajor.length, recent30d: recentComplaints.length },
    risks: { highCritical: highCriticalRisks.length, open: openRisks.length, total: risks.length },
    atp: { total: atpTotal, pass: atpPass, fail: atpFail, failRate: atpFailRate },
    actions: {
      overdueCapas: overdueCapas.length,
      ineffectiveCapas: ineffectiveCapas.length,
      effectivenessChecksDue: checksDue.length,
      gapsNeedingCAPAs: needsCapa.length,
      pathogenPositives: pathogenPositives.length,
    },
    mss: null,
  };
}

/**
 * Primary hook: calls backend function to fetch all executive data in one shot.
 */
export function useExecutiveData(siteCode) {
  const [currentOrg, setCurrentOrg] = useState(null);
  const [orgGroup, setOrgGroup] = useState(null);
  const [orgGroupSites, setOrgGroupSites] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    if (!siteCode) {
      setIsLoading(false);
      return;
    }

    const thisLoadId = ++loadIdRef.current;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        console.log("[ECC] Calling backend function for siteCode:", siteCode);
        const response = await invokeFunction("fetchExecutiveData", { siteCode });
        
        // Only update state if this is still the latest load
        if (thisLoadId !== loadIdRef.current) return;

        const { currentOrg: org, orgGroup: group, orgGroupSites: sites, rawData: data, _meta } = response.data;
        
        setCurrentOrg(org);
        setOrgGroup(group);
        setOrgGroupSites(sites || []);
        setRawData(data);
        setMeta(_meta || null);
        console.log("[ECC] Data loaded:", sites?.length, "sites,", data?.tasks?.length, "tasks,", _meta?.failures?.length || 0, "failures");
      } catch (err) {
        console.error("[ECC] Failed to load executive data:", err);
        if (thisLoadId === loadIdRef.current) {
          setLoadError(err.message || "Failed to load data");
        }
      }
      setIsLoading(false);
    }

    load();
  }, [siteCode]);

  const isMultiSite = orgGroupSites.length > 1;
  const allOrgIds = useMemo(() => orgGroupSites.map(s => s.id), [orgGroupSites]);

  const allMetrics = useMemo(() => {
    if (!rawData) return null;
    return computeMetrics(
      rawData.capas || [], rawData.auditFindings || [], rawData.empSamples || [], rawData.empSites || [],
      rawData.pestFindings || [], rawData.pestEscalationMarkers || [], rawData.complaints || [], rawData.risks || [],
      rawData.areaSignOffs || []
    );
  }, [rawData]);

  const perSiteMetrics = useMemo(() => {
    if (!rawData) return [];
    return allOrgIds.map(id => ({
      orgId: id,
      metrics: computeMetrics(
        (rawData.capas || []).filter(c => c._org_id === id),
        (rawData.auditFindings || []).filter(a => a._org_id === id),
        (rawData.empSamples || []).filter(e => e._org_id === id),
        (rawData.empSites || []).filter(e => e._org_id === id),
        (rawData.pestFindings || []).filter(p => p._org_id === id),
        (rawData.pestEscalationMarkers || []).filter(p => p._org_id === id),
        (rawData.complaints || []).filter(c => c._org_id === id),
        (rawData.risks || []).filter(r => r._org_id === id),
        (rawData.areaSignOffs || []).filter(a => a._org_id === id)
      ),
    }));
  }, [rawData, allOrgIds]);

  return {
    currentOrg, orgGroup, orgGroupSites, isMultiSite, allOrgIds,
    allMetrics, perSiteMetrics, rawData, isLoading, loadError, meta,
  };
}