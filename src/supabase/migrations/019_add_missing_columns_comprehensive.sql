-- =============================================================================
-- ReadyNorm — Migration 019: Comprehensive missing columns audit (batch 3)
--
-- WHY THIS IS NEEDED:
--   Systematic audit of all frontend writes vs. DB schema revealed ~80 missing
--   columns across 12 tables. Without these columns, the auto-heal loop in
--   database.js silently strips the fields on every save — data appears to save
--   in the UI but is never actually persisted to PostgreSQL.
--
-- HOW TO RUN:
--   Paste this entire file into Supabase Dashboard → SQL Editor → Run.
--   All statements use ADD COLUMN IF NOT EXISTS so this is safe to re-run.
--
-- TABLES MODIFIED:
--   1.  site_settings        — 7 new JSONB/TEXT columns
--   2.  employees            — 6 new columns (profile/HR fields)
--   3.  organizations        — 2 new columns (passcode + deletion)
--   4.  announcements        — 1 new column (birthday template flag)
--   5.  audit_standards      — 3 new columns (counts + parsing status)
--   6.  audit_sections       — 3 new columns (standard_name, sort_order, status)
--   7.  audit_requirements   — 5 new columns (text, guidance_notes, flags)
--   8.  audit_results        — 16 new columns (full summary data model)
--   9.  audit_findings       — 16 new columns (full findings data model)
--   10. scheduled_audits     — 3 new columns (result link + timestamps)
--   11. issues               — 11 new columns (investigation/escalation workflow)
--   12. customer_complaints  — 2 new columns (CAPA linkage)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SITE_SETTINGS
--    SiteSettings.jsx (shifts tab), ManagerDashboard (categories),
--    AuditSettings (audit config), QuotaAdjustmentDashboard (task_quotas),
--    GeneralSiteSettings (app_name), QualityProgram / FoodSafetyProgram
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE site_settings
  -- Shift windows: [{id, name, start_time, end_time, buffer_before_minutes, buffer_after_minutes}]
  ADD COLUMN IF NOT EXISTS shifts                   JSONB,

  -- Auto-end session settings: {enabled, grace_period_minutes, idle_threshold_minutes, reopen_incomplete_tasks}
  ADD COLUMN IF NOT EXISTS auto_end_settings        JSONB,

  -- Custom task category definitions added by managers: [{id, label, description}]
  ADD COLUMN IF NOT EXISTS custom_task_categories   JSONB,

  -- Internal audit module settings blob (notification emails, escalation config, etc.)
  ADD COLUMN IF NOT EXISTS audit_settings           JSONB,

  -- AI-recommended task quotas per role (from QuotaAdjustmentDashboard)
  ADD COLUMN IF NOT EXISTS task_quotas              JSONB,

  -- Which program tabs are enabled: {sanitation: true, quality: true, food_safety: true, …}
  ADD COLUMN IF NOT EXISTS programs_enabled         JSONB,

  -- Custom application name displayed in the nav header
  ADD COLUMN IF NOT EXISTS app_name                 TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EMPLOYEES
--    EmployeeFormModal collects these fields; ManagerDashboard was explicitly
--    stripping them because they didn't exist in the DB. BadgeSelector writes
--    display_badges. EmployeeProfile writes deletion_requested_at.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE employees
  -- HR profile fields
  ADD COLUMN IF NOT EXISTS hire_date                DATE,
  ADD COLUMN IF NOT EXISTS birthday                 DATE,

  -- Competency evaluation role: 'none' | 'supervisor' | 'manager'
  ADD COLUMN IF NOT EXISTS evaluator_role           TEXT    DEFAULT 'none',

  -- Whether this employee is part of the QA team (affects QA log visibility)
  ADD COLUMN IF NOT EXISTS is_qa_team               BOOLEAN DEFAULT false,

  -- Badge IDs pinned to the employee's profile: [uuid, uuid, …]
  ADD COLUMN IF NOT EXISTS display_badges           JSONB,

  -- Set when an employee requests account deletion (GDPR/CCPA)
  ADD COLUMN IF NOT EXISTS deletion_requested_at    TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ORGANIZATIONS
--    GeneralSiteSettings writes manager_passcode and deletion_requested_at.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE organizations
  -- 4-digit (or longer) PIN used to access the Manager Dashboard from a kiosk
  ADD COLUMN IF NOT EXISTS manager_passcode         TEXT,

  -- Set when the org owner requests site deletion
  ADD COLUMN IF NOT EXISTS deletion_requested_at    TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ANNOUNCEMENTS
--    AnnouncementFormModal sets is_birthday_template = true for birthday cards.
--    EmployeeDashboard filters on this flag to show birthday greetings.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS is_birthday_template     BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AUDIT_STANDARDS
--    StandardUploadModal updates these counts after parsing an uploaded PDF/doc.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_standards
  ADD COLUMN IF NOT EXISTS total_sections           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_requirements       INTEGER DEFAULT 0,

  -- 'pending' | 'in_progress' | 'completed' | 'failed'
  ADD COLUMN IF NOT EXISTS parsing_status           TEXT    DEFAULT 'pending';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. AUDIT_SECTIONS
--    StandardUploadModal and SectionEditModal write these when creating sections.
--    Note: migration 002 has order_index; frontend writes sort_order (different
--    name). Adding sort_order as a separate column rather than renaming to avoid
--    breaking any existing data. Both serve the same purpose.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_sections
  -- Denormalized name of the parent standard (avoids extra join in lists)
  ADD COLUMN IF NOT EXISTS standard_name            TEXT,

  -- Sort position within the standard (frontend writes sort_order, not order_index)
  ADD COLUMN IF NOT EXISTS sort_order               INTEGER DEFAULT 0,

  -- 'active' | 'archived'
  ADD COLUMN IF NOT EXISTS status                   TEXT    DEFAULT 'active';


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. AUDIT_REQUIREMENTS
--    Migration 002 schema uses `description` as the requirement text, but the
--    frontend writes `text` (matching the parsed document structure).
--    Both columns are kept — `description` is the legacy field, `text` is the
--    active one. Also adds guidance, criticality flags, sort order, status.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_requirements
  -- The actual requirement text (frontend writes this field, not `description`)
  ADD COLUMN IF NOT EXISTS text                     TEXT,

  -- Auditor guidance notes shown during execution
  ADD COLUMN IF NOT EXISTS guidance_notes           TEXT,

  -- Whether this requirement is flagged as safety-critical
  ADD COLUMN IF NOT EXISTS is_critical              BOOLEAN DEFAULT false,

  -- Sort position within the section
  ADD COLUMN IF NOT EXISTS sort_order               INTEGER DEFAULT 0,

  -- 'active' | 'archived'
  ADD COLUMN IF NOT EXISTS status                   TEXT    DEFAULT 'active';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. AUDIT_RESULTS
--    Migration 002 modelled this as a per-requirement result (like a checkbox).
--    The frontend evolved to use it as an audit-level summary record — one row
--    per audit execution with aggregate scores. Adding all new summary columns.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_results
  -- Which section this result covers (for section-level audits)
  ADD COLUMN IF NOT EXISTS section_id               UUID,
  ADD COLUMN IF NOT EXISTS section_number           TEXT,
  ADD COLUMN IF NOT EXISTS section_title            TEXT,

  -- Denormalised standard name (avoids join)
  ADD COLUMN IF NOT EXISTS standard_name            TEXT,

  -- Who performed the audit
  ADD COLUMN IF NOT EXISTS auditor_email            TEXT,
  ADD COLUMN IF NOT EXISTS auditor_name             TEXT,
  ADD COLUMN IF NOT EXISTS audit_date               DATE,

  -- Aggregate counts from all requirement findings
  ADD COLUMN IF NOT EXISTS total_requirements       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compliant_count          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minor_gaps               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS major_gaps               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critical_gaps            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS not_applicable_count     INTEGER DEFAULT 0,

  -- Score as a percentage (0–100)
  ADD COLUMN IF NOT EXISTS score_percentage         NUMERIC,

  -- 'pass' | 'conditional_pass' | 'fail'
  ADD COLUMN IF NOT EXISTS overall_status           TEXT,

  -- 'not_started' | 'in_progress' | 'completed'
  ADD COLUMN IF NOT EXISTS status                   TEXT    DEFAULT 'not_started',

  -- Extra JSON summary blob (for AI-generated narrative, etc.)
  ADD COLUMN IF NOT EXISTS summary_data             JSONB;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. AUDIT_FINDINGS
--    Migration 002 had a generic findings model. The frontend uses a requirement-
--    level findings model tied to specific requirements and compliance statuses.
--    Adding all the columns AuditExecutionModal and AuditFindingsReview write.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_findings
  -- Link to the audit summary record
  ADD COLUMN IF NOT EXISTS audit_result_id          UUID,

  -- Link to the scheduled audit (parallel to existing audit_id)
  ADD COLUMN IF NOT EXISTS scheduled_audit_id       UUID,

  -- Denormalized references (avoid joins in list views)
  ADD COLUMN IF NOT EXISTS standard_id              UUID,
  ADD COLUMN IF NOT EXISTS section_id               UUID,
  ADD COLUMN IF NOT EXISTS requirement_number       TEXT,

  -- The actual requirement text (snapshot at time of audit)
  ADD COLUMN IF NOT EXISTS requirement_text         TEXT,

  -- 'compliant' | 'minor_gap' | 'major_gap' | 'critical_gap' | 'not_applicable'
  ADD COLUMN IF NOT EXISTS compliance_status        TEXT,

  -- Auditor's observation notes for this requirement
  ADD COLUMN IF NOT EXISTS finding_notes            TEXT,

  -- Notes about evidence seen or missing
  ADD COLUMN IF NOT EXISTS evidence_notes           TEXT,

  -- Whether a corrective action is required for this finding
  ADD COLUMN IF NOT EXISTS corrective_action_required   BOOLEAN DEFAULT false,

  -- Corrective action details
  ADD COLUMN IF NOT EXISTS corrective_action_notes  TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action_due_date DATE,

  -- Auditor who recorded this finding
  ADD COLUMN IF NOT EXISTS auditor_email            TEXT,
  ADD COLUMN IF NOT EXISTS auditor_name             TEXT,
  ADD COLUMN IF NOT EXISTS audit_date               DATE,

  -- CAPA auto-created from this finding
  ADD COLUMN IF NOT EXISTS linked_capa_id           UUID;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SCHEDULED_AUDITS
--     AuditExecutionModal updates the scheduled audit record with the result
--     link and timestamps when an audit is started or completed.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE scheduled_audits
  -- Points to the audit_results row for this execution
  ADD COLUMN IF NOT EXISTS audit_result_id          UUID,

  -- Timestamps written when audit execution begins / finishes
  ADD COLUMN IF NOT EXISTS started_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at             TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ISSUES
--     IssueDetailModal writes investigation results, verification, closure
--     info, and CAPA escalation data. All these columns are missing from
--     migration 002's issues schema.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE issues
  -- Root cause analysis (separate from resolution_notes which is for the fix)
  ADD COLUMN IF NOT EXISTS root_cause               TEXT,

  -- Investigation outputs
  ADD COLUMN IF NOT EXISTS corrective_actions       TEXT,
  ADD COLUMN IF NOT EXISTS preventive_actions       TEXT,

  -- Verification step (issue is verified before being marked closed)
  ADD COLUMN IF NOT EXISTS verified_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by              TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes       TEXT,

  -- Closure
  ADD COLUMN IF NOT EXISTS closed_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by                TEXT,

  -- CAPA escalation linkage
  ADD COLUMN IF NOT EXISTS linked_capa_id           UUID,
  ADD COLUMN IF NOT EXISTS linked_capa_number       TEXT,
  ADD COLUMN IF NOT EXISTS escalated_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_by             TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. CUSTOMER_COMPLAINTS
--     ComplaintDetailModal escalates complaints to CAPAs and stores the link.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE customer_complaints
  ADD COLUMN IF NOT EXISTS linked_capa_id           UUID,
  ADD COLUMN IF NOT EXISTS linked_capa_number       TEXT;


-- =============================================================================
-- INDEXES — Speed up common join/lookup patterns for the new columns
-- =============================================================================

-- Audit execution lookups
CREATE INDEX IF NOT EXISTS idx_audit_results_scheduled_audit
  ON audit_results(audit_id);

CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_result
  ON audit_findings(audit_result_id);

CREATE INDEX IF NOT EXISTS idx_audit_findings_compliance_status
  ON audit_findings(organization_id, compliance_status);

CREATE INDEX IF NOT EXISTS idx_audit_findings_requirement
  ON audit_findings(requirement_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_audits_result
  ON scheduled_audits(audit_result_id);

-- Issues workflow
CREATE INDEX IF NOT EXISTS idx_issues_linked_capa
  ON issues(linked_capa_id)
  WHERE linked_capa_id IS NOT NULL;

-- Complaints workflow
CREATE INDEX IF NOT EXISTS idx_complaints_linked_capa
  ON customer_complaints(linked_capa_id)
  WHERE linked_capa_id IS NOT NULL;

-- Employee lookups by evaluator role (used in competency module)
CREATE INDEX IF NOT EXISTS idx_employees_evaluator_role
  ON employees(organization_id, evaluator_role)
  WHERE evaluator_role IS NOT NULL AND evaluator_role != 'none';

-- =============================================================================
-- DONE.
-- After running this migration, the following workarounds can be removed:
--   • ManagerDashboard.jsx: The explicit strip of hire_date, birthday,
--     evaluator_role, is_qa_team, display_badges from the employeeMutation
--     can be removed — these columns now exist in the employees table.
-- =============================================================================
