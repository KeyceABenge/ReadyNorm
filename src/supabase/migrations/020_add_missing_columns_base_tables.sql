-- =============================================================================
-- ReadyNorm — Migration 020: Missing columns on base-schema tables (batch 4)
--
-- WHY THIS IS NEEDED:
--   Migration 019 covered tables created by earlier migrations (002–018).
--   This migration covers the original "base" tables created when Supabase was
--   first set up (employees, tasks, capas, employee_sessions, ssops, etc.).
--   These tables exist in Supabase but their schemas are sparse — many columns
--   the frontend writes were never added to the base schema.
--
-- HOW TO RUN:
--   Paste into Supabase Dashboard → SQL Editor → Run.
--   All ADD COLUMN IF NOT EXISTS statements are safe to re-run.
--
-- TABLES MODIFIED:
--   1.  capas                    — 30 new columns (full CAPA workflow model)
--   2.  tasks                    — 14 new columns (task lifecycle + session link)
--   3.  employee_sessions        — 14 new columns (session engine fields)
--   4.  ssops                    — 14 new columns (SSOP authoring model)
--   5.  pest_findings            — 8 new columns (threshold/CAPA integration)
--   6.  pest_service_reports     — 16 new columns (AI processing + review)
--   7.  emp_samples              — 8 new columns (analysis fields)
--   8.  emp_sites                — 3 new columns (trend tracking)
--   9.  drain_cleaning_records   — 5 new columns (issue resolution workflow)
--   10. rain_diverters           — 10 new columns (WO + removal tracking)
--   11. diverter_inspections     — 6 new columns (detail inspection fields)
--   12. post_clean_inspections   — 6 new columns (results model)
--   13. pre_op_inspections       — 6 new columns (sign-off model)
--   14. area_sign_offs           — 6 new columns (re-inspection tracking)
--   15. chemical_inventory_records — 4 new columns (order + week tracking)
--   16. chemical_count_entries   — 4 new columns (order qty + review)
--   17. sanitation_downtimes     — 4 new columns (event numbering + CAPA flag)
--   18. competency_records       — 14 new columns (evaluation data model)
--   19. competency_evaluations   — 6 new columns (evaluation metadata)
--   20. controlled_documents     — 3 new columns (approvers, tags, training link)
--   21. training_documents       — 1 new column (controlled doc link)
--   22. training_quizzes         — 2 new columns (document reference)
--   23. evaluation_templates     — 4 new columns (AI + edit tracking)
--   24. shift_handoffs           — 2 new columns (email delivery tracking)
--   25. employee_peer_feedback   — 2 new columns (sender identity)
--   26. org_group_memberships    — 3 new columns (site access control)
--   27. asset_groups             — 3 new columns (area + line linkage)
--   28. assets                   — 2 new columns (area + line linkage)
--   29. facility_maps            — 2 new columns (default flag + image)
--   30. drain_facility_maps      — 1 new column (default flag)
--   31. announcements            — 4 new columns (author + expiry + active flag)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CAPAS
--    The CAPAWizard writes a comprehensive root-cause-analysis payload on
--    creation. CAPADetailModal adds effectiveness tracking, closure, and
--    re-open data over the life of the CAPA.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE capas
  -- Human-readable CAPA number (e.g. "CAPA-2026-1042")
  ADD COLUMN IF NOT EXISTS capa_id                    TEXT,

  -- Source system that triggered this CAPA
  ADD COLUMN IF NOT EXISTS source                     TEXT,
  ADD COLUMN IF NOT EXISTS source_record_id           UUID,
  ADD COLUMN IF NOT EXISTS source_record_type         TEXT,

  -- Location context
  ADD COLUMN IF NOT EXISTS department                 TEXT,
  ADD COLUMN IF NOT EXISTS area_id                    UUID,
  ADD COLUMN IF NOT EXISTS area_name                  TEXT,
  ADD COLUMN IF NOT EXISTS production_line_id         UUID,
  ADD COLUMN IF NOT EXISTS production_line_name       TEXT,
  ADD COLUMN IF NOT EXISTS zone                       TEXT,

  -- Observation context
  ADD COLUMN IF NOT EXISTS when_observed              TEXT,
  ADD COLUMN IF NOT EXISTS where_observed             TEXT,
  ADD COLUMN IF NOT EXISTS frequency                  TEXT,
  ADD COLUMN IF NOT EXISTS is_recurrence              BOOLEAN DEFAULT false,

  -- Root cause analysis fields
  ADD COLUMN IF NOT EXISTS containment_actions        TEXT,
  ADD COLUMN IF NOT EXISTS five_whys                  JSONB,
  ADD COLUMN IF NOT EXISTS fishbone_analysis          JSONB,
  ADD COLUMN IF NOT EXISTS root_cause_statement       TEXT,
  ADD COLUMN IF NOT EXISTS contributing_factors       JSONB,
  ADD COLUMN IF NOT EXISTS related_assets             JSONB,

  -- Effectiveness tracking
  ADD COLUMN IF NOT EXISTS verification_method        TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_criteria     TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_check_days   INTEGER,
  ADD COLUMN IF NOT EXISTS effectiveness_metrics      JSONB,
  ADD COLUMN IF NOT EXISTS effectiveness_notes        TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_status       TEXT,
  ADD COLUMN IF NOT EXISTS effectiveness_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effectiveness_verified_by  TEXT,
  ADD COLUMN IF NOT EXISTS next_effectiveness_check   DATE,

  -- Closure
  ADD COLUMN IF NOT EXISTS closeout_approver_email    TEXT,
  ADD COLUMN IF NOT EXISTS closeout_approver_name     TEXT,
  ADD COLUMN IF NOT EXISTS closed_by                  TEXT,

  -- Re-open tracking
  ADD COLUMN IF NOT EXISTS reopened_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_by                TEXT,
  ADD COLUMN IF NOT EXISTS reopen_reason              TEXT,

  -- AI assistance
  ADD COLUMN IF NOT EXISTS ai_suggestions             JSONB,

  -- Attachments
  ADD COLUMN IF NOT EXISTS attachments                JSONB;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TASKS
--    EmployeeDashboard and ShiftSessionEngine write task cycle/lifecycle fields.
--    ManagerDashboard writes task config fields. BulkTaskImportModal writes
--    role requirements and training links.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tasks
  -- Task cycle tracking (for recurring task regeneration)
  ADD COLUMN IF NOT EXISTS cycle_start_date           DATE,
  ADD COLUMN IF NOT EXISTS parent_task_id             UUID,
  ADD COLUMN IF NOT EXISTS is_group                   BOOLEAN DEFAULT false,

  -- Completion data
  ADD COLUMN IF NOT EXISTS completed_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_notes           TEXT,
  ADD COLUMN IF NOT EXISTS end_time                   TIMESTAMPTZ,

  -- Employee assignment
  ADD COLUMN IF NOT EXISTS employee_email             TEXT,
  ADD COLUMN IF NOT EXISTS employee_id                UUID,

  -- Session task selection (task is configured with these during session setup)
  ADD COLUMN IF NOT EXISTS include_diverter_task      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_inventory_task     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS selected_drains            JSONB,
  ADD COLUMN IF NOT EXISTS selected_tasks             JSONB,
  ADD COLUMN IF NOT EXISTS selected_titrations        JSONB,
  ADD COLUMN IF NOT EXISTS task_selection_completed   BOOLEAN DEFAULT false,

  -- Signature capture
  ADD COLUMN IF NOT EXISTS signature_data             TEXT,

  -- Rejection workflow
  ADD COLUMN IF NOT EXISTS rejected_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by                TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason           TEXT,

  -- Training requirement link (shown in task detail for compliance)
  ADD COLUMN IF NOT EXISTS required_training_id       UUID,
  ADD COLUMN IF NOT EXISTS required_training_title    TEXT,

  -- Role access control (which roles can perform this task)
  ADD COLUMN IF NOT EXISTS eligible_roles             JSONB,
  ADD COLUMN IF NOT EXISTS role_requirement           TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. EMPLOYEE_SESSIONS
--    ShiftSessionEngine.jsx manages the full session lifecycle and writes all
--    these fields. The base schema likely only has id + organization_id.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE employee_sessions
  -- Employee identity
  ADD COLUMN IF NOT EXISTS employee_id                UUID,
  ADD COLUMN IF NOT EXISTS employee_email             TEXT,
  ADD COLUMN IF NOT EXISTS employee_name              TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to                TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_name           TEXT,

  -- Session timing
  ADD COLUMN IF NOT EXISTS session_date               DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS start_time                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time                   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_reason                 TEXT,

  -- Shift context
  ADD COLUMN IF NOT EXISTS shift_id                   TEXT,
  ADD COLUMN IF NOT EXISTS shift_name                 TEXT,
  ADD COLUMN IF NOT EXISTS shift_start                TEXT,
  ADD COLUMN IF NOT EXISTS shift_end                  TEXT,

  -- Session state
  ADD COLUMN IF NOT EXISTS status                     TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS enabled                    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS task_selection_completed   BOOLEAN DEFAULT false,

  -- Task payload
  ADD COLUMN IF NOT EXISTS selected_tasks             JSONB,
  ADD COLUMN IF NOT EXISTS selected_drains            JSONB,
  ADD COLUMN IF NOT EXISTS selected_titrations        JSONB,
  ADD COLUMN IF NOT EXISTS completed_tasks            JSONB,
  ADD COLUMN IF NOT EXISTS reopened_tasks             JSONB,

  -- Counts
  ADD COLUMN IF NOT EXISTS tasks_selected_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_completed_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_rate            NUMERIC,

  -- Completion metadata
  ADD COLUMN IF NOT EXISTS completed_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by               TEXT,
  ADD COLUMN IF NOT EXISTS completed_by_name          TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SSOPS (Standard Sanitation Operating Procedures)
--    SSOPManagement.jsx writes a rich SSOP document structure. The base schema
--    likely only has id, organization_id, title, status.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ssops
  -- Authoring metadata
  ADD COLUMN IF NOT EXISTS version                    TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS status                     TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS content                    TEXT,
  ADD COLUMN IF NOT EXISTS description                TEXT,

  -- Procedure steps (JSON array of step objects)
  ADD COLUMN IF NOT EXISTS steps                      JSONB,

  -- Procedure requirements
  ADD COLUMN IF NOT EXISTS ppe_required               JSONB,
  ADD COLUMN IF NOT EXISTS chemicals_used             JSONB,
  ADD COLUMN IF NOT EXISTS tools_required             JSONB,
  ADD COLUMN IF NOT EXISTS cleaning_method            TEXT,
  ADD COLUMN IF NOT EXISTS disassembly_level          TEXT,
  ADD COLUMN IF NOT EXISTS zone_type                  TEXT,

  -- Asset linkage
  ADD COLUMN IF NOT EXISTS asset_name                 TEXT,
  ADD COLUMN IF NOT EXISTS linked_ssop_ids            JSONB,

  -- Approval workflow
  ADD COLUMN IF NOT EXISTS submitted_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by               TEXT,
  ADD COLUMN IF NOT EXISTS approved_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by                TEXT,
  ADD COLUMN IF NOT EXISTS approval_notes             TEXT,

  -- Revision history: [{version, date, author, summary}]
  ADD COLUMN IF NOT EXISTS revision_history           JSONB,

  -- AI generation flag
  ADD COLUMN IF NOT EXISTS ai_generated               BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PEST_FINDINGS
--    PestReportUploader and PestFindingsView write CAPA linkage and threshold
--    data that were never in the base pest_findings schema.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE pest_findings
  -- CAPA linkage
  ADD COLUMN IF NOT EXISTS linked_capa_id             UUID,
  ADD COLUMN IF NOT EXISTS capa_id                    TEXT,

  -- Threshold tracking
  ADD COLUMN IF NOT EXISTS threshold_exceeded         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exceedance_severity        TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action_required BOOLEAN DEFAULT false,

  -- Activity metrics
  ADD COLUMN IF NOT EXISTS activity_level             TEXT,
  ADD COLUMN IF NOT EXISTS risk_number                INTEGER DEFAULT 0,

  -- Report linkage
  ADD COLUMN IF NOT EXISTS service_report_id          UUID;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PEST_SERVICE_REPORTS
--    PestReportUploader writes AI-processed data and review workflow fields.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE pest_service_reports
  -- Report metadata
  ADD COLUMN IF NOT EXISTS report_number              TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_file_url          TEXT,
  ADD COLUMN IF NOT EXISTS file_type                  TEXT,

  -- Vendor reference
  ADD COLUMN IF NOT EXISTS vendor_id                  UUID,
  ADD COLUMN IF NOT EXISTS vendor_name                TEXT,

  -- Service summary
  ADD COLUMN IF NOT EXISTS total_devices_serviced     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_findings             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS threshold_exceedances      JSONB,
  ADD COLUMN IF NOT EXISTS missing_devices            JSONB,
  ADD COLUMN IF NOT EXISTS devices_missing_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corrective_actions_needed  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendations            TEXT,

  -- Review workflow
  ADD COLUMN IF NOT EXISTS review_status              TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by                TEXT,
  ADD COLUMN IF NOT EXISTS review_notes               TEXT,

  -- AI processing
  ADD COLUMN IF NOT EXISTS ai_processed               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_processing_status       TEXT,
  ADD COLUMN IF NOT EXISTS ai_extracted_summary       JSONB,

  -- CAPA linkages
  ADD COLUMN IF NOT EXISTS linked_capa_ids            JSONB;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. EMP_SAMPLES
--    EMPSamplesList and EMPAnalytics write analysis fields not in the base schema.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE emp_samples
  -- Sample metadata
  ADD COLUMN IF NOT EXISTS sample_id                  TEXT,
  ADD COLUMN IF NOT EXISTS site_code                  TEXT,
  ADD COLUMN IF NOT EXISTS collection_method          TEXT,

  -- Risk classification
  ADD COLUMN IF NOT EXISTS zone_classification        TEXT,
  ADD COLUMN IF NOT EXISTS pre_op_post_sanitation     TEXT,
  ADD COLUMN IF NOT EXISTS severity                   TEXT,

  -- Test results (JSON blob: {organism, result, method, lab, cfu_count})
  ADD COLUMN IF NOT EXISTS test_results               JSONB,

  -- Overall result and follow-up
  ADD COLUMN IF NOT EXISTS overall_result             TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requires_reswab            BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. EMP_SITES
--    EMPDashboard tracks trend data per site; these aggregate columns are
--    updated whenever a new positive result is recorded.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE emp_sites
  ADD COLUMN IF NOT EXISTS total_positives_ytd        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_negatives      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_positive_date         DATE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. DRAIN_CLEANING_RECORDS
--    DrainManagement.jsx has an issue resolution workflow written after a
--    problem is found during cleaning.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drain_cleaning_records
  -- Issue resolution fields
  ADD COLUMN IF NOT EXISTS issue_status               TEXT,
  ADD COLUMN IF NOT EXISTS resolution_notes           TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by                TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by_name           TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RAIN_DIVERTERS
--     RainDiverters.jsx tracks work order status and the removal eligibility
--     workflow for diverters that have been consistently dry.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE rain_diverters
  -- Work order tracking
  ADD COLUMN IF NOT EXISTS wo_number                  TEXT,
  ADD COLUMN IF NOT EXISTS wo_tag_attached            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wo_completed               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wo_completed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wo_completed_by            TEXT,

  -- Dry streak tracking (eligibility for removal)
  ADD COLUMN IF NOT EXISTS consecutive_dry_days       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dry_streak_start_date      DATE,
  ADD COLUMN IF NOT EXISTS eligible_for_removal       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS removal_criteria_reason    TEXT,

  -- Removal tracking
  ADD COLUMN IF NOT EXISTS removal_reason             TEXT,
  ADD COLUMN IF NOT EXISTS removed_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by                 TEXT,

  -- Last inspection result summary
  ADD COLUMN IF NOT EXISTS last_finding               TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. DIVERTER_INSPECTIONS
--     DiverterInspectionForm writes cleaning/sanitizing confirmation fields.
--     Migration 006 only added `signature_data`.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE diverter_inspections
  -- Inspection detail
  ADD COLUMN IF NOT EXISTS diverter_code              TEXT,
  ADD COLUMN IF NOT EXISTS finding                    TEXT,
  ADD COLUMN IF NOT EXISTS inspector_type             TEXT DEFAULT 'employee',

  -- Cleaning actions performed
  ADD COLUMN IF NOT EXISTS cleaned                    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sanitized                  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bucket_emptied             BOOLEAN DEFAULT false,

  -- Work order reference
  ADD COLUMN IF NOT EXISTS wo_number                  TEXT,
  ADD COLUMN IF NOT EXISTS wo_tag_attached            BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. POST_CLEAN_INSPECTIONS
--     PostCleanInspection.jsx writes a full asset results model.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE post_clean_inspections
  -- Asset inspection results
  ADD COLUMN IF NOT EXISTS results                    JSONB,
  ADD COLUMN IF NOT EXISTS passed_assets              JSONB,
  ADD COLUMN IF NOT EXISTS failed_assets              JSONB,
  ADD COLUMN IF NOT EXISTS total_assets               INTEGER DEFAULT 0,

  -- Line cleaning link
  ADD COLUMN IF NOT EXISTS line_cleaning_assignment_id UUID,

  -- Inspector identity (if not on the top-level record)
  ADD COLUMN IF NOT EXISTS inspector_email            TEXT,
  ADD COLUMN IF NOT EXISTS inspector_name             TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. PRE_OP_INSPECTIONS
--     PreOpInspection.jsx writes sign-off and per-asset results.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE pre_op_inspections
  -- Per-asset results: [{asset_id, asset_name, passed, notes, photo_url}]
  ADD COLUMN IF NOT EXISTS asset_results              JSONB,

  -- Multi-inspector support
  ADD COLUMN IF NOT EXISTS inspectors                 JSONB,

  -- Sign-off data
  ADD COLUMN IF NOT EXISTS signed_off_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_off_by              TEXT,
  ADD COLUMN IF NOT EXISTS passed_at                  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_data             TEXT,

  -- Summary notes
  ADD COLUMN IF NOT EXISTS overall_notes              TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. AREA_SIGN_OFFS
--     AreaSignOff component writes inspection detail and re-inspection tracking.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE area_sign_offs
  -- Inspector identity
  ADD COLUMN IF NOT EXISTS inspected_by               TEXT,
  ADD COLUMN IF NOT EXISTS inspected_at               TIMESTAMPTZ,

  -- Inspection notes
  ADD COLUMN IF NOT EXISTS inspection_notes           TEXT,
  ADD COLUMN IF NOT EXISTS inspection_photo_url       TEXT,

  -- Re-inspection tracking
  ADD COLUMN IF NOT EXISTS needs_reinspection         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reinspection_count         INTEGER DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- 15. CHEMICAL_INVENTORY_RECORDS
--     ChemicalInventory.jsx writes weekly order management fields.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE chemical_inventory_records
  -- Weekly period
  ADD COLUMN IF NOT EXISTS week_start_date            DATE,
  ADD COLUMN IF NOT EXISTS week_end_date              DATE,

  -- Order management
  ADD COLUMN IF NOT EXISTS order_placed               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_placed_at            TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 16. CHEMICAL_COUNT_ENTRIES
--     ChemicalInventory.jsx writes order quantity and review data per entry.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE chemical_count_entries
  -- Order quantity
  ADD COLUMN IF NOT EXISTS actual_order_qty           NUMERIC,

  -- Review workflow
  ADD COLUMN IF NOT EXISTS reviewed_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by                TEXT,
  ADD COLUMN IF NOT EXISTS review_notes               TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 17. SANITATION_DOWNTIMES
--     SanitationDowntime.jsx writes event numbering, impact type, and CAPA flag.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE sanitation_downtimes
  -- Human-readable event number
  ADD COLUMN IF NOT EXISTS event_number               TEXT,

  -- Downtime type classification
  ADD COLUMN IF NOT EXISTS impact_type                TEXT,
  ADD COLUMN IF NOT EXISTS reason_detail              TEXT,

  -- CAPA escalation flag
  ADD COLUMN IF NOT EXISTS requires_capa              BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 18. COMPETENCY_RECORDS
--     CompetencyEvaluationModal and CompetencyManagement write a rich record
--     that includes the SSOP being evaluated, the training context, and
--     AI-generated checklists.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE competency_records
  -- SSOP being evaluated
  ADD COLUMN IF NOT EXISTS ssop_id                    UUID,
  ADD COLUMN IF NOT EXISTS ssop_title                 TEXT,
  ADD COLUMN IF NOT EXISTS ssop_version               TEXT,

  -- Task being evaluated
  ADD COLUMN IF NOT EXISTS task_id                    UUID,
  ADD COLUMN IF NOT EXISTS task_title                 TEXT,

  -- Training context
  ADD COLUMN IF NOT EXISTS training_id                UUID,
  ADD COLUMN IF NOT EXISTS training_title             TEXT,
  ADD COLUMN IF NOT EXISTS training_completed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recertification_months     INTEGER,

  -- Evaluation detail
  ADD COLUMN IF NOT EXISTS strengths                  TEXT,
  ADD COLUMN IF NOT EXISTS areas_for_improvement      TEXT,
  ADD COLUMN IF NOT EXISTS checklist_items            JSONB,
  ADD COLUMN IF NOT EXISTS cleaning_method            TEXT,
  ADD COLUMN IF NOT EXISTS reference_id               TEXT,

  -- Edit tracking
  ADD COLUMN IF NOT EXISTS last_edited_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by             TEXT,

  -- Trigger source (what triggered the evaluation)
  ADD COLUMN IF NOT EXISTS trigger_source             TEXT,

  -- AI generation flag
  ADD COLUMN IF NOT EXISTS ai_generated               BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 19. COMPETENCY_EVALUATIONS
--     CompetencyEvaluationModal writes evaluator info and linked record data.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE competency_evaluations
  -- Evaluator identity
  ADD COLUMN IF NOT EXISTS evaluator_id               UUID,

  -- Score and pass/fail
  ADD COLUMN IF NOT EXISTS score                      NUMERIC,

  -- Linked competency record
  ADD COLUMN IF NOT EXISTS reference_id               TEXT,

  -- Edit tracking
  ADD COLUMN IF NOT EXISTS last_edited_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by             TEXT,

  -- Trigger source
  ADD COLUMN IF NOT EXISTS trigger_source             TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 20. CONTROLLED_DOCUMENTS
--     DocumentControl.jsx writes approver lists, tags, and a link to the
--     paired training document for compliance tracking.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  -- Approval workflow: [{email, name, approved_at}]
  ADD COLUMN IF NOT EXISTS approvers                  JSONB,

  -- Classification tags: [string, …]
  ADD COLUMN IF NOT EXISTS tags                       JSONB,

  -- Link to paired training document
  ADD COLUMN IF NOT EXISTS training_document_id       UUID;


-- ─────────────────────────────────────────────────────────────────────────────
-- 21. TRAINING_DOCUMENTS
--     TrainingDocuments.jsx links training docs back to their source controlled
--     document for two-way navigation.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE training_documents
  ADD COLUMN IF NOT EXISTS linked_controlled_document_id UUID;


-- ─────────────────────────────────────────────────────────────────────────────
-- 22. TRAINING_QUIZZES
--     TrainingQuiz writes the document it belongs to.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE training_quizzes
  -- The training document this quiz assesses
  ADD COLUMN IF NOT EXISTS document_id                UUID,
  ADD COLUMN IF NOT EXISTS document_title             TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 23. EVALUATION_TEMPLATES
--     EvaluationTemplate.jsx saves AI-generated checklists and edit history.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE evaluation_templates
  -- Edit tracking
  ADD COLUMN IF NOT EXISTS last_edited_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by             TEXT,

  -- SSOP version snapshot
  ADD COLUMN IF NOT EXISTS ssop_version               TEXT,

  -- AI generation flag
  ADD COLUMN IF NOT EXISTS ai_generated               BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 24. SHIFT_HANDOFFS
--     HandoffGenerator.jsx updates the handoff record when it is emailed out.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE shift_handoffs
  ADD COLUMN IF NOT EXISTS emailed_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS emailed_to                 JSONB;


-- ─────────────────────────────────────────────────────────────────────────────
-- 25. EMPLOYEE_PEER_FEEDBACK
--     PeerFeedback.jsx records who sent the feedback (separate from auth user).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE employee_peer_feedback
  ADD COLUMN IF NOT EXISTS from_email                 TEXT,
  ADD COLUMN IF NOT EXISTS from_name                  TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 26. ORG_GROUP_MEMBERSHIPS
--     MySites panel and site switcher write fine-grained site access data.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE org_group_memberships
  -- Specific sites this member can access (when site_access_type = 'specific')
  ADD COLUMN IF NOT EXISTS allowed_site_ids           JSONB,

  -- The specific org this membership grants access to (for per-site members)
  ADD COLUMN IF NOT EXISTS organization_id            UUID,
  ADD COLUMN IF NOT EXISTS organization_name          TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 27. ASSET_GROUPS
--     AssetManagement.jsx writes area and production line context for groups.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE asset_groups
  ADD COLUMN IF NOT EXISTS area_id                    UUID,
  ADD COLUMN IF NOT EXISTS production_line_id         UUID,

  -- Array of asset IDs in this group
  ADD COLUMN IF NOT EXISTS asset_ids                  JSONB;


-- ─────────────────────────────────────────────────────────────────────────────
-- 28. ASSETS
--     AssetManagement.jsx writes area and production line context for assets.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS area_id                    UUID,
  ADD COLUMN IF NOT EXISTS production_line_id         UUID;


-- ─────────────────────────────────────────────────────────────────────────────
-- 29. FACILITY_MAPS
--     FacilityMap.jsx marks one map as default and stores the image URL.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE facility_maps
  ADD COLUMN IF NOT EXISTS image_url                  TEXT,
  ADD COLUMN IF NOT EXISTS is_default                 BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 30. DRAIN_FACILITY_MAPS
--     DrainManagement.jsx marks one drain map as default.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drain_facility_maps
  ADD COLUMN IF NOT EXISTS is_default                 BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 31. ANNOUNCEMENTS
--     AnnouncementFormModal writes author identity, expiry, and active flag.
--     These are basic fields that should have been in the base schema.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS created_by                 TEXT,
  ADD COLUMN IF NOT EXISTS created_by_name            TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active                  BOOLEAN DEFAULT true;


-- =============================================================================
-- INDEXES — Speed up common lookups on new columns
-- =============================================================================

-- CAPA lookups by source system and number
CREATE INDEX IF NOT EXISTS idx_capas_capa_id
  ON capas(organization_id, capa_id);

CREATE INDEX IF NOT EXISTS idx_capas_source
  ON capas(organization_id, source);

CREATE INDEX IF NOT EXISTS idx_capas_effectiveness_status
  ON capas(organization_id, effectiveness_status)
  WHERE effectiveness_status IS NOT NULL;

-- Task cycle tracking
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task
  ON tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_employee
  ON tasks(organization_id, employee_id)
  WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_cycle
  ON tasks(organization_id, cycle_start_date)
  WHERE cycle_start_date IS NOT NULL;

-- Employee session lookups
CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee
  ON employee_sessions(organization_id, employee_id)
  WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_sessions_date
  ON employee_sessions(organization_id, session_date);

-- SSOP lookups
CREATE INDEX IF NOT EXISTS idx_ssops_status
  ON ssops(organization_id, status);

-- Pest service report review queue
CREATE INDEX IF NOT EXISTS idx_pest_reports_review_status
  ON pest_service_reports(organization_id, review_status);

-- EMP sample analysis
CREATE INDEX IF NOT EXISTS idx_emp_samples_site_date
  ON emp_samples(site_id, collection_date);

-- Competency record lookups
CREATE INDEX IF NOT EXISTS idx_competency_records_ssop
  ON competency_records(organization_id, ssop_id)
  WHERE ssop_id IS NOT NULL;

-- Announcements (active, non-expired)
CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON announcements(organization_id, is_active, expiry_date);

-- =============================================================================
-- DONE.
-- Run migrations 017 → 018 → 019 → 020 in order.
-- All are idempotent (IF NOT EXISTS throughout).
-- =============================================================================
