import { differenceInDays, parseISO, format, addDays, addWeeks, addMonths, addYears } from "date-fns";

// Calculate the real compliance status of a control based on dates and evidence
export function calculateControlStatus(control, evidenceItems) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  
  // Per-event controls are always "on_track" unless explicitly overdue
  if (control.frequency === "per_event") {
    if (evidenceItems.length === 0 && control.status !== "on_track") {
      return "not_started";
    }
    return control.status || "on_track";
  }

  // No next_due_date means not started
  if (!control.next_due_date) return "not_started";

  const dueDate = parseISO(control.next_due_date);
  const daysUntilDue = differenceInDays(dueDate, today);

  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 14) return "due_soon";
  return "on_track";
}

// Calculate next due date from a given date based on frequency
export function getNextDueDate(fromDate, frequency) {
  const d = typeof fromDate === "string" ? parseISO(fromDate) : fromDate;
  switch (frequency) {
    case "daily": return format(addDays(d, 1), "yyyy-MM-dd");
    case "weekly": return format(addWeeks(d, 1), "yyyy-MM-dd");
    case "monthly": return format(addMonths(d, 1), "yyyy-MM-dd");
    case "quarterly": return format(addMonths(d, 3), "yyyy-MM-dd");
    case "annually": return format(addYears(d, 1), "yyyy-MM-dd");
    default: return null;
  }
}

// Determine if a control is "compliant" (has evidence + on schedule)
export function getComplianceStatus(control, evidenceItems) {
  const dateStatus = calculateControlStatus(control, evidenceItems);
  
  if (control.frequency === "per_event") {
    return { status: "compliant", label: "Compliant", reason: "Per-event control" };
  }

  if (dateStatus === "overdue") {
    return { status: "non_compliant", label: "Non-Compliant", reason: "Control is overdue" };
  }

  if (dateStatus === "not_started") {
    return { status: "non_compliant", label: "Non-Compliant", reason: "Control not started" };
  }

  // Check if there's evidence from the current period
  if (evidenceItems.length === 0) {
    return { status: "missing_evidence", label: "Missing Evidence", reason: "No evidence uploaded for this control" };
  }

  return { status: "compliant", label: "Compliant", reason: "On schedule with evidence" };
}

// Run a full audit across all controls + evidence
export function runInternalAudit(controls, allEvidence, policies) {
  const findings = [];
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let missingEvidenceCount = 0;

  controls.forEach(control => {
    const controlEvidence = allEvidence.filter(e => e.control_id === control.id);
    const compliance = getComplianceStatus(control, controlEvidence);
    
    if (compliance.status === "compliant") {
      compliantCount++;
    } else if (compliance.status === "missing_evidence") {
      missingEvidenceCount++;
      findings.push({
        type: "missing_evidence",
        severity: "medium",
        control_id: control.id,
        control_name: control.control_name,
        category: control.category,
        description: `No evidence uploaded for "${control.control_name}".`,
        corrective_action: `Upload required evidence: ${control.evidence_description || "See control description"}.`,
      });
    } else {
      nonCompliantCount++;
      findings.push({
        type: "overdue",
        severity: compliance.reason.includes("overdue") ? "high" : "medium",
        control_id: control.id,
        control_name: control.control_name,
        category: control.category,
        description: `${control.control_name}: ${compliance.reason}.`,
        corrective_action: compliance.reason.includes("overdue")
          ? `Execute this control immediately and upload evidence. Next due: ${control.next_due_date || "Not set"}.`
          : `Initialize this control by setting a start date and completing the first execution.`,
      });
    }
  });

  // Check policy-control alignment
  const controlCategories = new Set(controls.map(c => c.category));
  const expectedCategories = ["access_control", "change_management", "logging_monitoring", "backups", "incident_response", "risk_management", "vendor_management", "multi_tenant_security"];
  
  expectedCategories.forEach(cat => {
    const catControls = controls.filter(c => c.category === cat);
    if (catControls.length === 0) {
      findings.push({
        type: "gap",
        severity: "high",
        control_name: null,
        category: cat,
        description: `No controls defined for category "${formatCategory(cat)}".`,
        corrective_action: `Add controls covering ${formatCategory(cat)} using the "Generate All Controls" feature.`,
      });
    }
  });

  // Check multi-tenant security specifically
  const mtControls = controls.filter(c => c.category === "multi_tenant_security");
  if (mtControls.length === 0) {
    findings.push({
      type: "gap",
      severity: "critical",
      control_name: null,
      category: "multi_tenant_security",
      description: "No multi-tenant security validation controls exist. This is a HIGH RISK gap.",
      corrective_action: "Add tenant isolation testing, site-level access verification, and RLS audit controls immediately.",
    });
  }

  // Check policies exist
  if (policies.length === 0) {
    findings.push({
      type: "gap",
      severity: "critical",
      control_name: null,
      category: "policies",
      description: "No security policies are defined.",
      corrective_action: "Generate all policies using the Policies tab.",
    });
  } else {
    const unapproved = policies.filter(p => p.status !== "approved");
    if (unapproved.length > 0) {
      findings.push({
        type: "gap",
        severity: "medium",
        control_name: null,
        category: "policies",
        description: `${unapproved.length} policies are not yet approved.`,
        corrective_action: "Review and approve all policies before audit.",
      });
    }
  }

  const totalControls = controls.length;
  const compliancePercentage = totalControls > 0 ? Math.round((compliantCount / totalControls) * 100) : 0;

  return {
    compliancePercentage,
    compliantCount,
    nonCompliantCount,
    missingEvidenceCount,
    totalControls,
    findings: findings.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)),
    auditDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
  };
}

function severityOrder(s) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s] ?? 4;
}

export function formatCategory(cat) {
  const map = {
    access_control: "Access Control",
    change_management: "Change Management",
    logging_monitoring: "Logging & Monitoring",
    backups: "Backups",
    incident_response: "Incident Response",
    risk_management: "Risk Management",
    vendor_management: "Vendor Management",
    multi_tenant_security: "Multi-Tenant Security",
    policies: "Policies",
  };
  return map[cat] || cat;
}