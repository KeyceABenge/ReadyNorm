export const CONTROL_TEMPLATES = [
  // ACCESS CONTROL
  {
    name: "MFA Enforcement",
    category: "access_control",
    description: "Verify MFA is enabled for all user accounts on all production systems, cloud consoles, and third-party services.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Screenshot of MFA enforcement settings from each system (identity provider, cloud console, GitHub)"
  },
  {
    name: "Quarterly Access Review",
    category: "access_control",
    description: "Export user list from all systems, review each account for appropriateness, disable unused accounts (no login 90+ days), document findings.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "User export spreadsheet + review notes + sign-off record"
  },
  {
    name: "Immediate Deprovisioning",
    category: "access_control",
    description: "Upon employee/contractor termination, remove all access within 4 business hours. Disable accounts on email, GitHub, cloud, database, and all third-party tools.",
    frequency: "per_event",
    responsible: "Founder / System Administrator",
    evidence: "Completed offboarding checklist with timestamps"
  },
  {
    name: "Multi-Tenant Authorization Check",
    category: "access_control",
    description: "Verify that all API endpoints enforce organization_id and site_code authorization. Test that users cannot access other organizations' data.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Test results showing authorization enforcement across endpoints"
  },
  // CHANGE MANAGEMENT
  {
    name: "Code Changes via GitHub PRs",
    category: "change_management",
    description: "All code changes go through GitHub pull requests. Direct commits to main branch are prohibited.",
    frequency: "per_event",
    responsible: "Founder / System Administrator",
    evidence: "GitHub branch protection settings screenshot + PR history"
  },
  {
    name: "Code Review Required",
    category: "change_management",
    description: "Every pull request requires at least one reviewer approval before merge.",
    frequency: "per_event",
    responsible: "Founder / System Administrator",
    evidence: "GitHub PR review history showing approvals"
  },
  {
    name: "Deployment Logging",
    category: "change_management",
    description: "All production deployments are logged with timestamp, author, change description, and rollback plan.",
    frequency: "per_event",
    responsible: "Founder / System Administrator",
    evidence: "Deployment log entries"
  },
  // LOGGING & MONITORING
  {
    name: "Authentication Log Review",
    category: "logging_monitoring",
    description: "Review authentication logs for anomalies: failed login attempts, unusual login times/locations, unauthorized access attempts.",
    frequency: "weekly",
    responsible: "Founder / System Administrator",
    evidence: "Weekly log review record with findings (even if 'no anomalies found')"
  },
  {
    name: "System Activity Log Review",
    category: "logging_monitoring",
    description: "Review system logs for unusual activity, errors, and security-relevant events.",
    frequency: "monthly",
    responsible: "Founder / System Administrator",
    evidence: "Monthly log review summary"
  },
  {
    name: "Alert Configuration Check",
    category: "logging_monitoring",
    description: "Verify automated alerting is configured for critical events: failed login spikes, unauthorized access, system errors.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Screenshot of alert configuration settings"
  },
  // BACKUPS
  {
    name: "Automated Daily Backup Verification",
    category: "backups",
    description: "Verify that automated daily backups are running successfully. Check backup logs for any failures.",
    frequency: "monthly",
    responsible: "Founder / System Administrator",
    evidence: "Backup log screenshots showing successful daily backups"
  },
  {
    name: "Backup Restore Test",
    category: "backups",
    description: "Restore from backup to a test environment. Verify data integrity and measure restoration time.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Restore test report: date, backup used, result, time to restore, data verification"
  },
  {
    name: "Backup Encryption Verification",
    category: "backups",
    description: "Verify backups are encrypted at rest and stored in a separate region/availability zone.",
    frequency: "annually",
    responsible: "Founder / System Administrator",
    evidence: "Backup encryption configuration screenshot"
  },
  // INCIDENT RESPONSE
  {
    name: "Incident Documentation",
    category: "incident_response",
    description: "All security incidents are documented within 24 hours: description, classification, timeline, actions taken, root cause, remediation.",
    frequency: "per_event",
    responsible: "Founder / System Administrator",
    evidence: "Incident report document"
  },
  {
    name: "Post-Incident Review",
    category: "incident_response",
    description: "Conduct post-incident review within 7 days of incident resolution. Document lessons learned and action items.",
    frequency: "per_event",
    responsible: "Founder / System Administrator",
    evidence: "Post-incident review report"
  },
  {
    name: "Incident Response Plan Test",
    category: "incident_response",
    description: "Tabletop exercise: walk through a simulated security incident to test response procedures.",
    frequency: "annually",
    responsible: "Founder / System Administrator",
    evidence: "Tabletop exercise report with participants, scenario, findings"
  },
  // RISK MANAGEMENT
  {
    name: "Annual Risk Assessment",
    category: "risk_management",
    description: "Conduct comprehensive risk assessment: identify assets, threats, vulnerabilities. Evaluate likelihood and impact. Update risk register.",
    frequency: "annually",
    responsible: "Founder / System Administrator",
    evidence: "Risk assessment report + updated risk register"
  },
  {
    name: "Risk Register Review",
    category: "risk_management",
    description: "Review risk register for status updates on mitigation actions. Update risk levels as needed.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Quarterly risk register update with review notes"
  },
  // VENDOR MANAGEMENT
  {
    name: "Vendor Inventory Maintenance",
    category: "vendor_management",
    description: "Maintain current vendor list with: vendor name, service, data access level, SOC 2 status, contract expiry, risk rating.",
    frequency: "annually",
    responsible: "Founder / System Administrator",
    evidence: "Updated vendor inventory spreadsheet"
  },
  {
    name: "Annual Vendor Review",
    category: "vendor_management",
    description: "Review each vendor's security posture: check SOC 2 report, review contract terms, assess risk rating, verify data handling practices.",
    frequency: "annually",
    responsible: "Founder / System Administrator",
    evidence: "Vendor review records + updated SOC 2 reports on file"
  },
  // MULTI-TENANT SECURITY
  {
    name: "Tenant Isolation Testing",
    category: "multi_tenant_security",
    description: "Test that API endpoints enforce organization-level isolation. Attempt to access data from Organization A using Organization B credentials.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Test results demonstrating cross-tenant access is blocked"
  },
  {
    name: "Site-Level Access Verification",
    category: "multi_tenant_security",
    description: "Verify users can only access their assigned sites within their organization. Test site_code authorization on all endpoints.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Test results showing site-level access enforcement"
  },
  {
    name: "RLS (Row-Level Security) Audit",
    category: "multi_tenant_security",
    description: "Review database queries and entity configurations to confirm all data access is scoped by organization_id.",
    frequency: "quarterly",
    responsible: "Founder / System Administrator",
    evidence: "Code review findings + RLS configuration screenshots"
  }
];