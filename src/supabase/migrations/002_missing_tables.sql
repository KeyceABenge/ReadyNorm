-- =============================================================================
-- ReadyNorm — Migration 002: All 52 Missing Tables
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/zamrusolomzustgenpin/sql)
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS throughout
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 1: EMPLOYEE MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT DEFAULT '#6366f1',
  employee_ids  JSONB DEFAULT '[]',
  shift_pattern TEXT,
  notes         TEXT,
  created_date  TIMESTAMPTZ DEFAULT now(),
  updated_date  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  badge_id        TEXT REFERENCES badges(id) ON DELETE SET NULL,
  badge_name      TEXT,
  awarded_date    DATE DEFAULT CURRENT_DATE,
  awarded_by      TEXT,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_quotas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name   TEXT,
  quota_type      TEXT DEFAULT 'tasks',
  target_value    NUMERIC,
  actual_value    NUMERIC DEFAULT 0,
  period_start    DATE,
  period_end      DATE,
  status          TEXT DEFAULT 'active',
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduling_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name   TEXT,
  request_type    TEXT DEFAULT 'time_off',  -- time_off, shift_swap, schedule_change
  start_date      DATE,
  end_date        DATE,
  reason          TEXT,
  status          TEXT DEFAULT 'pending',   -- pending, approved, denied
  reviewed_by     TEXT,
  review_notes    TEXT,
  created_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 2: CAPA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS capa_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  capa_id           TEXT REFERENCES capas(id) ON DELETE CASCADE,
  capa_number       TEXT,
  action_type       TEXT DEFAULT 'corrective',
  title             TEXT NOT NULL,
  description       TEXT,
  priority          TEXT DEFAULT 'medium',  -- low, medium, high, critical
  status            TEXT DEFAULT 'open',    -- open, in_progress, completed, verified, overdue
  owner_email       TEXT,
  owner_name        TEXT,
  owners            JSONB DEFAULT '[]',
  due_date          DATE,
  target_date       DATE,
  completed_date    TIMESTAMPTZ,
  evidence_required BOOLEAN DEFAULT false,
  evidence_urls     JSONB DEFAULT '[]',
  completion_notes  TEXT,
  reminders_sent    INTEGER DEFAULT 0,
  edit_history      JSONB DEFAULT '[]',
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capa_settings (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  categories                          JSONB DEFAULT '["Sanitation","Equipment","Process","Training","Documentation","Safety","Quality","Pest Control","Environmental","Other"]',
  departments                         JSONB DEFAULT '["Sanitation","Quality Assurance","Maintenance","Production","Warehouse","Management"]',
  reminder_days                       JSONB DEFAULT '[14,7,3,1]',
  overdue_reminder_frequency          TEXT DEFAULT 'daily',
  escalation_days                     INTEGER DEFAULT 7,
  escalation_emails                   JSONB DEFAULT '[]',
  require_containment_high_severity   BOOLEAN DEFAULT true,
  require_attachments_high_severity   BOOLEAN DEFAULT false,
  default_effectiveness_days          JSONB DEFAULT '[30]',
  auto_create_from_emp                BOOLEAN DEFAULT false,
  auto_create_from_pest               BOOLEAN DEFAULT false,
  auto_create_from_downtime           BOOLEAN DEFAULT false,
  created_date                        TIMESTAMPTZ DEFAULT now(),
  updated_date                        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 3: INCIDENTS & SAFETY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incidents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  incident_number     TEXT,
  title               TEXT NOT NULL,
  type                TEXT DEFAULT 'incident',  -- incident, near_miss
  category            TEXT,
  severity            TEXT DEFAULT 'medium',    -- low, medium, high, critical
  description         TEXT,
  location            TEXT,
  area_id             UUID,
  area_name           TEXT,
  assigned_to         TEXT,
  assigned_to_name    TEXT,
  reported_by         TEXT,
  reported_by_name    TEXT,
  status              TEXT DEFAULT 'open',      -- open, investigating, closed
  discovered_at       TIMESTAMPTZ DEFAULT now(),
  closed_at           TIMESTAMPTZ,
  investigation_notes TEXT,
  corrective_actions  TEXT,
  photo_urls          JSONB DEFAULT '[]',
  linked_task_ids     JSONB DEFAULT '[]',
  linked_asset_ids    JSONB DEFAULT '[]',
  linked_ssop_ids     JSONB DEFAULT '[]',
  linked_training_ids JSONB DEFAULT '[]',
  linked_employee_ids JSONB DEFAULT '[]',
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS foreign_material_incidents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  incident_number   TEXT,
  material_type     TEXT DEFAULT 'other',  -- metal, glass, plastic, wood, rubber, bone, other
  description       TEXT,
  product_name      TEXT,
  lot_number        TEXT,
  production_date   DATE,
  location_found    TEXT,
  discovery_method  TEXT,
  discovered_by     TEXT,
  discovered_at     TIMESTAMPTZ DEFAULT now(),
  source_identified BOOLEAN DEFAULT false,
  source_description TEXT,
  corrective_action TEXT,
  capa_required     BOOLEAN DEFAULT false,
  capa_id           UUID,
  status            TEXT DEFAULT 'open',  -- open, investigating, closed
  photo_urls        JSONB DEFAULT '[]',
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glass_breakage_incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  incident_number       TEXT,
  break_date            DATE DEFAULT CURRENT_DATE,
  break_time            TEXT,
  location              TEXT,
  area_id               UUID,
  glass_item_type       TEXT,  -- window, light, container, gauge, thermometer, other
  description           TEXT,
  discovered_by         TEXT,
  supervisor_notified   BOOLEAN DEFAULT false,
  product_affected      BOOLEAN DEFAULT false,
  product_description   TEXT,
  product_quarantined   BOOLEAN DEFAULT false,
  product_lot           TEXT,
  quantity_affected     TEXT,
  cleanup_completed     BOOLEAN DEFAULT false,
  cleanup_by            TEXT,
  cleanup_notes         TEXT,
  verification_done     BOOLEAN DEFAULT false,
  verification_by       TEXT,
  status                TEXT DEFAULT 'open',
  photo_urls            JSONB DEFAULT '[]',
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glass_brittle_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  item_type             TEXT DEFAULT 'glass',  -- glass, brittle_plastic, ceramic, other
  location              TEXT,
  area_id               UUID,
  risk_level            TEXT DEFAULT 'medium',
  inspection_frequency  TEXT DEFAULT 'monthly',
  last_inspection_date  DATE,
  next_inspection_date  DATE,
  condition             TEXT DEFAULT 'good',   -- good, cracked, damaged, replaced
  notes                 TEXT,
  photo_url             TEXT,
  is_active             BOOLEAN DEFAULT true,
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 4: ALLERGEN MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS allergen_assignments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  production_line_id   UUID,
  production_line_name TEXT,
  allergen_id          UUID,
  allergen_name        TEXT,
  allergen_code        TEXT,
  presence_type        TEXT DEFAULT 'present',  -- present, may_contain, cross_contact, dedicated_free
  notes                TEXT,
  status               TEXT DEFAULT 'active',
  created_date         TIMESTAMPTZ DEFAULT now(),
  updated_date         TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 5: AUDITS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_standards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  version         TEXT,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_sections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  standard_id      UUID REFERENCES audit_standards(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  section_number   TEXT,
  order_index      INTEGER DEFAULT 0,
  created_date     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_requirements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  standard_id          UUID REFERENCES audit_standards(id) ON DELETE CASCADE,
  section_id           UUID REFERENCES audit_sections(id) ON DELETE CASCADE,
  requirement_number   TEXT,
  description          TEXT NOT NULL,
  requirement_type     TEXT DEFAULT 'shall',  -- shall, should, may
  notes                TEXT,
  created_date         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  year            INTEGER DEFAULT EXTRACT(YEAR FROM now()),
  status          TEXT DEFAULT 'draft',  -- draft, active, completed
  schedule        JSONB DEFAULT '[]',
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  audit_plan_id   UUID REFERENCES audit_plans(id) ON DELETE SET NULL,
  standard_id     UUID REFERENCES audit_standards(id) ON DELETE SET NULL,
  audit_number    TEXT,
  audit_type      TEXT DEFAULT 'internal',  -- internal, external, supplier, regulatory
  title           TEXT NOT NULL,
  scheduled_date  DATE,
  auditor_name    TEXT,
  auditor_email   TEXT,
  scope           TEXT,
  status          TEXT DEFAULT 'scheduled',  -- scheduled, in_progress, completed, cancelled
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  audit_id         UUID REFERENCES scheduled_audits(id) ON DELETE CASCADE,
  requirement_id   UUID REFERENCES audit_requirements(id) ON DELETE SET NULL,
  result           TEXT DEFAULT 'compliant',  -- compliant, non_compliant, partial, not_applicable, not_assessed
  evidence         TEXT,
  notes            TEXT,
  created_date     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_findings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  audit_id              UUID REFERENCES scheduled_audits(id) ON DELETE CASCADE,
  finding_number        TEXT,
  finding_type          TEXT DEFAULT 'observation',  -- major, minor, observation, opportunity
  category              TEXT,
  description           TEXT NOT NULL,
  requirement_id        UUID,
  requirement_reference TEXT,
  assigned_to           TEXT,
  due_date              DATE,
  status                TEXT DEFAULT 'open',  -- open, in_progress, closed, verified
  corrective_action     TEXT,
  evidence_urls         JSONB DEFAULT '[]',
  closed_at             TIMESTAMPTZ,
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 6: CHANGE CONTROL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS change_controls (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  change_type          TEXT DEFAULT 'process',  -- equipment, process, formulation, facility, supplier, packaging, documentation
  priority             TEXT DEFAULT 'medium',
  description          TEXT,
  justification        TEXT,
  status               TEXT DEFAULT 'draft',    -- draft, under_review, approved, in_progress, implemented, completed, closed, rejected, cancelled
  requested_date       DATE DEFAULT CURRENT_DATE,
  implementation_date  DATE,
  notes                TEXT,
  requested_by         TEXT,
  approved_by          TEXT,
  approved_at          TIMESTAMPTZ,
  activity_log         JSONB DEFAULT '[]',
  created_date         TIMESTAMPTZ DEFAULT now(),
  updated_date         TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 7: CUSTOMER COMPLAINTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_complaints (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  complaint_number          TEXT,
  status                    TEXT DEFAULT 'new',  -- new, under_investigation, pending_response, closed, responded
  priority                  TEXT DEFAULT 'medium',
  customer_name             TEXT,
  customer_contact_name     TEXT,
  customer_email            TEXT,
  customer_phone            TEXT,
  customer_type             TEXT,
  complaint_type            TEXT,
  severity                  TEXT DEFAULT 'minor',  -- minor, major, critical
  customer_impact           TEXT,  -- no_injury, illness_claimed, illness_confirmed, injury, hospitalization
  illness_details           TEXT,
  product_name              TEXT,
  product_code              TEXT,
  lot_number                TEXT,
  production_date           DATE,
  best_by_date              DATE,
  purchase_location         TEXT,
  purchase_date             DATE,
  complaint_description     TEXT,
  sample_available          BOOLEAN DEFAULT false,
  received_via              TEXT DEFAULT 'phone',  -- phone, email, website, mail, in_person
  assigned_to_email         TEXT,
  assigned_to_name          TEXT,
  evidence_urls             JSONB DEFAULT '[]',
  regulatory_reportable     BOOLEAN DEFAULT false,
  recall_assessment_required BOOLEAN DEFAULT false,
  response_due_date         DATE,
  closure_due_date          DATE,
  closed_at                 TIMESTAMPTZ,
  root_cause                TEXT,
  corrective_actions        TEXT,
  response_notes            TEXT,
  audit_log                 JSONB DEFAULT '[]',
  created_date              TIMESTAMPTZ DEFAULT now(),
  updated_date              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaint_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 UUID REFERENCES organizations(id) ON DELETE CASCADE,
  categories                      JSONB DEFAULT '["Foreign Material","Quality Defect","Illness Claim","Labeling","Allergen","Packaging","Other"]',
  severity_levels                 JSONB DEFAULT '["minor","major","critical"]',
  response_due_days_by_severity   JSONB DEFAULT '{"minor":5,"major":3,"critical":1}',
  closure_due_days_by_severity    JSONB DEFAULT '{"minor":30,"major":21,"critical":14}',
  auto_escalate_critical          BOOLEAN DEFAULT true,
  auto_escalate_illness           BOOLEAN DEFAULT true,
  escalation_emails               JSONB DEFAULT '[]',
  notification_emails             JSONB DEFAULT '[]',
  created_date                    TIMESTAMPTZ DEFAULT now(),
  updated_date                    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 8: FOOD SAFETY PLAN (HACCP / HARPC)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fsp_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  facility_name       TEXT,
  facility_address    TEXT,
  fsp_type            TEXT DEFAULT 'haccp',  -- haccp, harpc, fsma
  product_categories  JSONB DEFAULT '[]',
  allergens_managed   JSONB DEFAULT '[]',
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_safety_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_number     TEXT,
  title           TEXT NOT NULL,
  version         TEXT DEFAULT '1.0',
  status          TEXT DEFAULT 'draft',  -- draft, active, archived
  plan_type       TEXT DEFAULT 'haccp',
  effective_date  DATE,
  review_date     DATE,
  scope           TEXT,
  created_by      TEXT,
  approved_by     TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS process_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  fsp_id          UUID REFERENCES food_safety_plans(id) ON DELETE CASCADE,
  step_number     INTEGER DEFAULT 1,
  step_name       TEXT NOT NULL,
  description     TEXT,
  step_type       TEXT DEFAULT 'processing',  -- receiving, storage, processing, packaging, shipping
  equipment       TEXT,
  parameters      JSONB DEFAULT '{}',
  order_index     INTEGER DEFAULT 0,
  created_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hazard_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  fsp_id            UUID REFERENCES food_safety_plans(id) ON DELETE CASCADE,
  process_step_id   UUID REFERENCES process_steps(id) ON DELETE CASCADE,
  step_name         TEXT,
  hazard_type       TEXT DEFAULT 'biological',  -- biological, chemical, physical, radiological, allergen
  hazard_description TEXT,
  likelihood        TEXT DEFAULT 'low',    -- low, medium, high
  severity          TEXT DEFAULT 'medium', -- low, medium, high
  risk_score        INTEGER DEFAULT 0,
  is_significant    BOOLEAN DEFAULT false,
  control_measure   TEXT,
  control_type      TEXT,  -- ccp, oprp, oprp_prerequisite, none
  decision_tree_q1  BOOLEAN,
  decision_tree_q2  BOOLEAN,
  decision_tree_q3  BOOLEAN,
  decision_tree_q4  BOOLEAN,
  notes             TEXT,
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preventive_controls (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  fsp_id                  UUID REFERENCES food_safety_plans(id) ON DELETE CASCADE,
  hazard_analysis_id      UUID REFERENCES hazard_analyses(id) ON DELETE SET NULL,
  control_name            TEXT NOT NULL,
  control_type            TEXT DEFAULT 'process',  -- process, allergen, sanitation, supply_chain
  ccp_number              TEXT,
  critical_limits         JSONB DEFAULT '{}',
  monitoring_procedure    TEXT,
  monitoring_frequency    TEXT,
  corrective_action       TEXT,
  verification_activities TEXT,
  records                 TEXT,
  is_ccp                  BOOLEAN DEFAULT false,
  status                  TEXT DEFAULT 'active',
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 9: CCP MONITORING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ccp_monitoring_points (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ccp_number          TEXT,
  ccp_name            TEXT NOT NULL,
  hazard              TEXT,
  critical_limit_min  NUMERIC,
  critical_limit_max  NUMERIC,
  unit                TEXT,
  monitoring_frequency TEXT DEFAULT 'every_batch',
  monitoring_method   TEXT,
  corrective_action   TEXT,
  verification_method TEXT,
  area_id             UUID,
  area_name           TEXT,
  is_active           BOOLEAN DEFAULT true,
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccp_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ccp_id                  UUID REFERENCES ccp_monitoring_points(id) ON DELETE CASCADE,
  ccp_name                TEXT,
  monitoring_date         DATE DEFAULT CURRENT_DATE,
  monitoring_time         TEXT,
  recorded_value          NUMERIC,
  unit                    TEXT,
  is_in_limit             BOOLEAN DEFAULT true,
  corrective_action_taken BOOLEAN DEFAULT false,
  corrective_action_notes TEXT,
  recorded_by             TEXT,
  recorded_by_name        TEXT,
  verified_by             TEXT,
  notes                   TEXT,
  created_date            TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 10: QUALITY / HOLDS / LABELS / RECEIVING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hold_releases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  hold_number     TEXT,
  product_name    TEXT NOT NULL,
  lot_number      TEXT,
  quantity        TEXT,
  unit            TEXT,
  reason          TEXT,
  initiated_by    TEXT,
  hold_date       DATE DEFAULT CURRENT_DATE,
  release_date    DATE,
  disposition     TEXT,  -- released, destroyed, reworked, donated
  released_by     TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'on_hold',  -- on_hold, released, disposed
  photo_urls      JSONB DEFAULT '[]',
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS label_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  verification_number TEXT,
  product_name        TEXT,
  product_code        TEXT,
  lot_number          TEXT,
  line_id             UUID,
  line_name           TEXT,
  verified_by         TEXT,
  verified_by_name    TEXT,
  verification_date   DATE DEFAULT CURRENT_DATE,
  status              TEXT DEFAULT 'pending',  -- pass, fail, pending
  checklist_items     JSONB DEFAULT '[]',
  notes               TEXT,
  photo_urls          JSONB DEFAULT '[]',
  created_date        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receiving_inspections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_number     TEXT,
  supplier_name         TEXT,
  supplier_id           UUID,
  po_number             TEXT,
  item_description      TEXT,
  lot_number            TEXT,
  quantity_received     NUMERIC,
  unit                  TEXT,
  temperature           NUMERIC,
  vehicle_temp          NUMERIC,
  condition_acceptable  BOOLEAN DEFAULT true,
  label_verified        BOOLEAN DEFAULT true,
  pest_free             BOOLEAN DEFAULT true,
  seal_intact           BOOLEAN DEFAULT true,
  status                TEXT DEFAULT 'pending',  -- accepted, rejected, conditional_accept, pending
  rejection_reason      TEXT,
  received_by           TEXT,
  received_by_name      TEXT,
  received_date         DATE DEFAULT CURRENT_DATE,
  notes                 TEXT,
  photo_urls            JSONB DEFAULT '[]',
  created_date          TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 11: ISSUES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
  categories                  JSONB DEFAULT '["Sanitation","Equipment","Process","Safety","Quality","Other"]',
  priority_levels             JSONB DEFAULT '["low","medium","high","critical"]',
  default_due_days_by_severity JSONB DEFAULT '{"low":7,"medium":3,"high":1,"critical":0}',
  auto_escalate_critical      BOOLEAN DEFAULT true,
  auto_escalate_major         BOOLEAN DEFAULT false,
  escalation_hours            JSONB DEFAULT '{"critical":2,"high":4}',
  notification_emails         JSONB DEFAULT '[]',
  created_date                TIMESTAMPTZ DEFAULT now(),
  updated_date                TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS issues (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  issue_number         TEXT,
  title                TEXT NOT NULL,
  description          TEXT,
  category             TEXT,
  severity             TEXT DEFAULT 'medium',  -- low, medium, high, major, critical
  status               TEXT DEFAULT 'open',    -- open, in_progress, resolved, capa_required, closed
  location_type        TEXT,
  area_id              UUID,
  area_name            TEXT,
  production_line_id   UUID,
  production_line_name TEXT,
  specific_location    TEXT,
  containment_actions  TEXT,
  assigned_to_email    TEXT,
  assigned_to_name     TEXT,
  reported_by          TEXT,
  reported_by_name     TEXT,
  due_date             DATE,
  resolved_at          TIMESTAMPTZ,
  resolution_notes     TEXT,
  evidence_urls        JSONB DEFAULT '[]',
  activity_log         JSONB DEFAULT '[]',
  created_date         TIMESTAMPTZ DEFAULT now(),
  updated_date         TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 12: SOC2
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS soc2_controls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  control_id      TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,  -- CC, A, PI, C, P
  control_type    TEXT DEFAULT 'preventive',  -- preventive, detective, corrective
  status          TEXT DEFAULT 'not_implemented',  -- implemented, partial, not_implemented
  owner           TEXT,
  evidence_ids    JSONB DEFAULT '[]',
  last_tested     DATE,
  test_result     TEXT,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soc2_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  control_id      UUID REFERENCES soc2_controls(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  evidence_type   TEXT DEFAULT 'document',  -- document, screenshot, log, policy
  file_url        TEXT,
  collected_by    TEXT,
  collection_date DATE DEFAULT CURRENT_DATE,
  review_status   TEXT DEFAULT 'pending',  -- pending, approved, rejected
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soc2_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  policy_number   TEXT,
  category        TEXT,
  content         TEXT,
  version         TEXT DEFAULT '1.0',
  status          TEXT DEFAULT 'draft',  -- draft, active, archived
  effective_date  DATE,
  review_date     DATE,
  approved_by     TEXT,
  file_url        TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soc2_risks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  likelihood      TEXT DEFAULT 'medium',  -- low, medium, high
  impact          TEXT DEFAULT 'medium',  -- low, medium, high, critical
  risk_score      INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'open',   -- open, mitigated, accepted, closed
  mitigation      TEXT,
  owner           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soc2_vendors (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_name             TEXT NOT NULL,
  service_description     TEXT,
  category                TEXT,
  risk_level              TEXT DEFAULT 'medium',
  soc2_report_available   BOOLEAN DEFAULT false,
  soc2_report_type        TEXT,  -- type1, type2
  soc2_report_url         TEXT,
  last_review_date        DATE,
  next_review_date        DATE,
  status                  TEXT DEFAULT 'active',  -- active, inactive, under_review
  notes                   TEXT,
  created_date            TIMESTAMPTZ DEFAULT now(),
  updated_date            TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 13: RISK MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS risk_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  likelihood      INTEGER DEFAULT 3,  -- 1-5
  impact          INTEGER DEFAULT 3,  -- 1-5
  risk_score      INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  status          TEXT DEFAULT 'open',  -- open, mitigated, accepted, closed
  mitigation_plan TEXT,
  owner           TEXT,
  review_date     DATE,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 14: SHIFT HANDOFFS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shift_handoffs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  handoff_date        DATE DEFAULT CURRENT_DATE,
  shift_name          TEXT,
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  hours_covered       NUMERIC,
  generated_at        TIMESTAMPTZ DEFAULT now(),
  generated_by        TEXT,
  status              TEXT DEFAULT 'draft',  -- draft, sent, acknowledged
  team_summary        JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  quality_signals     JSONB DEFAULT '{}',
  completed_items     JSONB DEFAULT '[]',
  incomplete_items    JSONB DEFAULT '[]',
  critical_carryovers JSONB DEFAULT '[]',
  top_priorities      JSONB DEFAULT '[]',
  ai_narrative        TEXT DEFAULT '',
  manager_notes       TEXT DEFAULT '',
  acknowledged_by     TEXT,
  acknowledged_at     TIMESTAMPTZ,
  created_date        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 15: CALIBRATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calibration_equipment (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  equipment_id             TEXT,  -- user-assigned tag/ID
  type                     TEXT DEFAULT 'thermometer',  -- thermometer, scale, ph_meter, pressure_gauge, flow_meter, other
  location                 TEXT,
  manufacturer             TEXT,
  serial_number            TEXT,
  calibration_frequency    TEXT DEFAULT 'monthly',  -- daily, weekly, monthly, quarterly, semi_annual, annual
  calibration_method       TEXT,
  tolerance                TEXT,
  last_calibrated_at       DATE,
  next_calibration_due     DATE,
  last_calibration_result  TEXT,
  status                   TEXT DEFAULT 'active',  -- active, inactive, retired, out_for_calibration
  notes                    TEXT,
  created_date             TIMESTAMPTZ DEFAULT now(),
  updated_date             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calibration_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id      UUID REFERENCES calibration_equipment(id) ON DELETE CASCADE,
  equipment_name    TEXT,
  calibration_date  DATE DEFAULT CURRENT_DATE,
  result            TEXT DEFAULT 'pass',  -- pass, fail, adjusted_pass, out_of_tolerance
  reading_before    NUMERIC,
  reference_value   NUMERIC,
  reading_after     NUMERIC,
  calibrated_by_name TEXT,
  calibrated_by_email TEXT,
  certificate_url   TEXT,
  notes             TEXT,
  created_date      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 16: SUPPLIERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  supplier_code             TEXT,
  supplier_type             TEXT DEFAULT 'ingredient',  -- ingredient, packaging, equipment, chemical, service, other
  risk_rating               TEXT DEFAULT 'medium',      -- low, medium, high, critical
  category                  TEXT,
  status                    TEXT DEFAULT 'pending',      -- pending, approved, conditional, unapproved, suspended
  contact_name              TEXT,
  contact_email             TEXT,
  contact_phone             TEXT,
  address                   TEXT,
  city                      TEXT,
  state                     TEXT,
  country                   TEXT,
  approval_date             DATE,
  next_review_date          DATE,
  review_frequency_months   INTEGER DEFAULT 12,
  audit_frequency_months    INTEGER DEFAULT 12,
  last_audit_date           DATE,
  certifications            JSONB DEFAULT '[]',
  total_nonconformances     INTEGER DEFAULT 0,
  notes                     TEXT,
  created_date              TIMESTAMPTZ DEFAULT now(),
  updated_date              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES supplier_records(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  title           TEXT,
  email           TEXT,
  phone           TEXT,
  is_primary      BOOLEAN DEFAULT false,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES supplier_records(id) ON DELETE CASCADE,
  supplier_name   TEXT,
  material_name   TEXT NOT NULL,
  material_code   TEXT,
  category        TEXT,
  risk_level      TEXT DEFAULT 'medium',
  description     TEXT,
  is_allergen     BOOLEAN DEFAULT false,
  status          TEXT DEFAULT 'pending',  -- pending, approved, rejected
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_nonconformances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES supplier_records(id) ON DELETE CASCADE,
  supplier_name   TEXT,
  nc_number       TEXT,
  nc_type         TEXT,  -- quality, delivery, documentation, safety, other
  severity        TEXT DEFAULT 'minor',
  lot_number      TEXT,
  description     TEXT,
  status          TEXT DEFAULT 'open',  -- open, investigating, resolved, closed
  resolution      TEXT,
  activity_log    JSONB DEFAULT '[]',
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 UUID REFERENCES organizations(id) ON DELETE CASCADE,
  default_review_frequency_months INTEGER DEFAULT 12,
  default_audit_frequency_months  INTEGER DEFAULT 12,
  categories                      JSONB DEFAULT '["Ingredient","Packaging","Chemical","Equipment","Service"]',
  risk_criteria                   JSONB DEFAULT '{}',
  auto_flag_overdue_audits        BOOLEAN DEFAULT true,
  notification_emails             JSONB DEFAULT '[]',
  created_date                    TIMESTAMPTZ DEFAULT now(),
  updated_date                    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 17: PEST CONTROL RECORDS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pest_control_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  record_number       TEXT,
  service_date        DATE DEFAULT CURRENT_DATE,
  provider_name       TEXT,
  technician_name     TEXT,
  license_number      TEXT,
  service_type        TEXT DEFAULT 'routine',  -- routine, emergency, follow_up, inspection
  areas_serviced      JSONB DEFAULT '[]',
  findings            TEXT,
  treatments_applied  TEXT,
  chemicals_used      JSONB DEFAULT '[]',
  recommendations     TEXT,
  next_service_date   DATE,
  report_url          TEXT,
  status              TEXT DEFAULT 'completed',
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 18: CHEMICAL PRODUCTS & LOCATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chemical_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  product_code    TEXT,
  manufacturer    TEXT,
  category        TEXT DEFAULT 'cleaning',  -- cleaning, sanitizing, lubricant, pest_control, other
  unit_of_measure TEXT DEFAULT 'gallons',
  par_level       NUMERIC,
  reorder_point   NUMERIC,
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chemical_locations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  location_type         TEXT DEFAULT 'storage_room',  -- storage_room, cabinet, cage, outdoor, other
  area                  TEXT,
  capacity              NUMERIC,
  capacity_unit         TEXT,
  temperature_controlled BOOLEAN DEFAULT false,
  is_active             BOOLEAN DEFAULT true,
  notes                 TEXT,
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chemical_storage_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  capacity        NUMERIC,
  unit            TEXT,
  temperature_range TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chemical_location_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  chemical_id     UUID,
  location_id     UUID,
  quantity        NUMERIC DEFAULT 0,
  unit            TEXT,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 19: VISITOR MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visitor_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  visitor_name           TEXT NOT NULL,
  company                TEXT,
  purpose                TEXT,
  host_name              TEXT,
  host_email             TEXT,
  badge_number           TEXT,
  area_access            JSONB DEFAULT '[]',
  check_in_time          TIMESTAMPTZ DEFAULT now(),
  check_out_time         TIMESTAMPTZ,
  gmp_training_completed BOOLEAN DEFAULT false,
  nda_signed             BOOLEAN DEFAULT false,
  notes                  TEXT,
  created_date           TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 20: HELPERS (generic helper/quick-reference records)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS helpers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  helper_type     TEXT DEFAULT 'general',
  description     TEXT,
  content         TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP 21: DIVERTER SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS diverter_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_frequency_hours  INTEGER DEFAULT 4,
  require_photo               BOOLEAN DEFAULT true,
  alert_threshold             INTEGER DEFAULT 1,
  notification_emails         JSONB DEFAULT '[]',
  created_date                TIMESTAMPTZ DEFAULT now(),
  updated_date                TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ROW LEVEL SECURITY — Enable RLS and add permissive policies on all new tables
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'employee_groups','employee_badges','employee_quotas','scheduling_requests',
    'capa_actions','capa_settings',
    'incidents','foreign_material_incidents','glass_breakage_incidents','glass_brittle_items',
    'allergen_assignments',
    'audit_standards','audit_sections','audit_requirements','audit_plans','scheduled_audits',
    'audit_results','audit_findings',
    'change_controls',
    'customer_complaints','complaint_settings',
    'fsp_settings','food_safety_plans','process_steps','hazard_analyses','preventive_controls',
    'ccp_monitoring_points','ccp_records',
    'hold_releases','label_verifications','receiving_inspections',
    'issue_settings','issues',
    'soc2_controls','soc2_evidence','soc2_policies','soc2_risks','soc2_vendors',
    'risk_entries',
    'shift_handoffs',
    'calibration_equipment','calibration_records',
    'supplier_records','supplier_contacts','supplier_materials','supplier_nonconformances','supplier_settings',
    'pest_control_records',
    'chemical_products','chemical_locations','chemical_storage_locations','chemical_location_assignments',
    'visitor_logs',
    'helpers',
    'diverter_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Drop existing permissive policy if it exists, then recreate
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all_access', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)',
      tbl || '_all_access', tbl
    );
  END LOOP;
END $$;

-- =============================================================================
-- INDEXES — Speed up common queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_employee_groups_org    ON employee_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_badges_org    ON employee_badges(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_badges_emp    ON employee_badges(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_quotas_org    ON employee_quotas(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_requests_org ON scheduling_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_capa_actions_org       ON capa_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_capa_actions_capa      ON capa_actions(capa_id);
CREATE INDEX IF NOT EXISTS idx_capa_settings_org      ON capa_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org          ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_fm_incidents_org       ON foreign_material_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_glass_incidents_org    ON glass_breakage_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_glass_items_org        ON glass_brittle_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_allergen_assign_org    ON allergen_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_standards_org    ON audit_standards(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_sections_org     ON audit_sections(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_requirements_org ON audit_requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_plans_org        ON audit_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_org   ON scheduled_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_org      ON audit_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_org     ON audit_findings(organization_id);
CREATE INDEX IF NOT EXISTS idx_change_controls_org    ON change_controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_complaints_org         ON customer_complaints(organization_id);
CREATE INDEX IF NOT EXISTS idx_complaint_settings_org ON complaint_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_fsp_settings_org       ON fsp_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_food_plans_org         ON food_safety_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_process_steps_org      ON process_steps(organization_id);
CREATE INDEX IF NOT EXISTS idx_hazard_analyses_org    ON hazard_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_preventive_controls_org ON preventive_controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccp_points_org         ON ccp_monitoring_points(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccp_records_org        ON ccp_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_hold_releases_org      ON hold_releases(organization_id);
CREATE INDEX IF NOT EXISTS idx_label_verif_org        ON label_verifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_receiving_org          ON receiving_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_issue_settings_org     ON issue_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_issues_org             ON issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_soc2_controls_org      ON soc2_controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_soc2_evidence_org      ON soc2_evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_soc2_policies_org      ON soc2_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_soc2_risks_org         ON soc2_risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_soc2_vendors_org       ON soc2_vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_entries_org       ON risk_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_handoffs_org     ON shift_handoffs(organization_id);
CREATE INDEX IF NOT EXISTS idx_calib_equip_org        ON calibration_equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_calib_records_org      ON calibration_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_records_org   ON supplier_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_org  ON supplier_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_materials_org ON supplier_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ncs_org       ON supplier_nonconformances(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_settings_org  ON supplier_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pest_ctrl_records_org  ON pest_control_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_chem_products_org      ON chemical_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_chem_locations_org     ON chemical_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_chem_storage_org       ON chemical_storage_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_chem_location_assign   ON chemical_location_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_org       ON visitor_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_helpers_org            ON helpers(organization_id);
CREATE INDEX IF NOT EXISTS idx_diverter_settings_org  ON diverter_settings(organization_id);
