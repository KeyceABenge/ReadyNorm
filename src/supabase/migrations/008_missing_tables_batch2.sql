-- =============================================================================
-- ReadyNorm — Migration 008: 17 Missing Tables (Batch 2)
-- Run in Supabase SQL Editor.
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS throughout.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CAPA COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capa_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  capa_id         UUID REFERENCES capas(id) ON DELETE CASCADE,
  comment_type    TEXT DEFAULT 'comment', -- comment, system, status_change, action_update
  content         TEXT NOT NULL,
  author_email    TEXT,
  author_name     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DOCUMENT CONTROL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_change_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  request_number    TEXT,
  request_type      TEXT DEFAULT 'revision', -- new_document, revision, obsolete, emergency
  document_id       UUID,
  document_title    TEXT,
  description       TEXT,
  justification     TEXT,
  priority          TEXT DEFAULT 'medium',  -- low, medium, high, critical
  status            TEXT DEFAULT 'draft',   -- draft, submitted, under_review, approved, rejected, in_progress, completed, cancelled
  requested_by      TEXT,
  requested_by_name TEXT,
  assigned_to       TEXT,
  assigned_to_name  TEXT,
  review_due_date   DATE,
  implementation_date DATE,
  completed_at      TIMESTAMPTZ,
  impact_assessment JSONB DEFAULT '{}',
  activity_log      JSONB DEFAULT '[]',
  created_date      TIMESTAMPTZ DEFAULT now(),
  updated_date      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_control_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
  document_types              JSONB DEFAULT '["SOP","Policy","Work Instruction","Form","Record","Specification","Other"]',
  categories                  JSONB DEFAULT '["Sanitation","Quality","Safety","HR","Production","Regulatory","Other"]',
  default_review_frequency_months INTEGER DEFAULT 12,
  require_approval            BOOLEAN DEFAULT true,
  require_training_for_docs   BOOLEAN DEFAULT true,
  auto_obsolete_on_supersede  BOOLEAN DEFAULT true,
  notification_emails         JSONB DEFAULT '[]',
  cr_approvers                JSONB DEFAULT '[]',
  created_date                TIMESTAMPTZ DEFAULT now(),
  updated_date                TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  document_id     UUID,
  version_number  TEXT NOT NULL,
  change_summary  TEXT,
  file_url        TEXT,
  created_by      TEXT,
  created_by_name TEXT,
  status          TEXT DEFAULT 'draft', -- draft, active, superseded, obsolete
  effective_date  DATE,
  created_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_acknowledgments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  document_id     UUID,
  document_title  TEXT,
  employee_id     UUID,
  employee_name   TEXT,
  employee_email  TEXT,
  status          TEXT DEFAULT 'pending', -- pending, completed, overdue
  assigned_date   DATE DEFAULT CURRENT_DATE,
  completed_date  DATE,
  due_date        DATE,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SHIFT HANDOFF SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handoff_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  default_hours       INTEGER DEFAULT 12,
  email_recipients    JSONB DEFAULT '[]',
  include_pest        BOOLEAN DEFAULT true,
  include_emp         BOOLEAN DEFAULT true,
  include_training    BOOLEAN DEFAULT true,
  include_incidents   BOOLEAN DEFAULT true,
  auto_send           BOOLEAN DEFAULT false,
  send_time           TEXT DEFAULT '06:00',
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PEST CONTROL EXTRAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pest_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  location_code   TEXT,
  location_type   TEXT DEFAULT 'interior', -- interior, exterior, perimeter
  area            TEXT,
  area_id         UUID,
  description     TEXT,
  risk_level      TEXT DEFAULT 'medium',
  status          TEXT DEFAULT 'active',
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pest_vendors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  contact_name        TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  contract_number     TEXT,
  service_frequency   TEXT DEFAULT 'monthly',
  next_service_date   DATE,
  last_service_date   DATE,
  services_provided   JSONB DEFAULT '[]',
  license_number      TEXT,
  status              TEXT DEFAULT 'active',
  notes               TEXT,
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RECALL EVENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recall_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recall_number        TEXT,
  recall_type          TEXT DEFAULT 'mock', -- mock, voluntary, mandatory, market_withdrawal
  status               TEXT DEFAULT 'active', -- active, completed, cancelled
  product_name         TEXT NOT NULL,
  product_code         TEXT,
  lot_numbers          JSONB DEFAULT '[]',
  production_date_start DATE,
  production_date_end   DATE,
  best_by_date_start   DATE,
  best_by_date_end     DATE,
  quantity_produced    TEXT,
  quantity_recovered   TEXT,
  reason               TEXT,
  initiated_by         TEXT,
  initiated_at         TIMESTAMPTZ DEFAULT now(),
  completed_at         TIMESTAMPTZ,
  distribution_scope   TEXT DEFAULT 'local', -- local, regional, national, international
  regulatory_notified  BOOLEAN DEFAULT false,
  regulatory_agency    TEXT,
  customer_notified    BOOLEAN DEFAULT false,
  media_statement_issued BOOLEAN DEFAULT false,
  root_cause           TEXT,
  corrective_actions   TEXT,
  notes                TEXT,
  activity_log         JSONB DEFAULT '[]',
  created_date         TIMESTAMPTZ DEFAULT now(),
  updated_date         TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RISK MANAGEMENT EXTRAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS management_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  review_number       TEXT,
  title               TEXT,
  scheduled_date      DATE,
  completed_date      DATE,
  status              TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  facilitator_name    TEXT,
  attendees           JSONB DEFAULT '[]',
  agenda_items        JSONB DEFAULT '[]',
  inputs              JSONB DEFAULT '{}',
  outputs             JSONB DEFAULT '{}',
  action_items        JSONB DEFAULT '[]',
  summary             TEXT,
  notes               TEXT,
  created_date        TIMESTAMPTZ DEFAULT now(),
  updated_date        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  categories                JSONB DEFAULT '["Food Safety","Quality","Operational","Financial","Regulatory","Reputational","Other"]',
  likelihood_labels         JSONB DEFAULT '["Rare","Unlikely","Possible","Likely","Almost Certain"]',
  impact_labels             JSONB DEFAULT '["Negligible","Minor","Moderate","Major","Catastrophic"]',
  risk_matrix               JSONB DEFAULT '{}',
  review_frequency_months   INTEGER DEFAULT 12,
  notification_emails       JSONB DEFAULT '[]',
  created_date              TIMESTAMPTZ DEFAULT now(),
  updated_date              TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TRAINING & COMPETENCY EXTRAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_matrices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  role                  TEXT,
  department            TEXT,
  required_documents    JSONB DEFAULT '[]',
  required_tasks        JSONB DEFAULT '[]',
  required_competencies JSONB DEFAULT '[]',
  refresher_months      INTEGER DEFAULT 12,
  status                TEXT DEFAULT 'active',
  created_date          TIMESTAMPTZ DEFAULT now(),
  updated_date          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_competency_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 UUID REFERENCES organizations(id) ON DELETE CASCADE,
  competency_levels               JSONB DEFAULT '["Trainee","Basic","Proficient","Expert"]',
  default_refresher_months        INTEGER DEFAULT 12,
  allow_self_assessment           BOOLEAN DEFAULT false,
  require_supervisor_sign_off     BOOLEAN DEFAULT true,
  evaluation_methods              JSONB DEFAULT '["Written Test","Practical Demonstration","Observation","Verbal Quiz"]',
  notification_emails             JSONB DEFAULT '[]',
  created_date                    TIMESTAMPTZ DEFAULT now(),
  updated_date                    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SOC2 EVIDENCE PACKAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soc2_evidence_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  period_start    DATE,
  period_end      DATE,
  status          TEXT DEFAULT 'draft', -- draft, in_review, finalized
  evidence_ids    JSONB DEFAULT '[]',
  control_ids     JSONB DEFAULT '[]',
  created_by      TEXT,
  finalized_at    TIMESTAMPTZ,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. COMPLIANCE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  version         TEXT,
  description     TEXT,
  category        TEXT DEFAULT 'food_safety', -- food_safety, quality, environmental, safety, regulatory
  is_active       BOOLEAN DEFAULT true,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  framework_id    UUID REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  requirement_number TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  frequency       TEXT DEFAULT 'annual', -- daily, weekly, monthly, quarterly, semi_annual, annual, ongoing
  responsible_party TEXT,
  status          TEXT DEFAULT 'compliant', -- compliant, non_compliant, partial, not_applicable, pending_review
  last_reviewed   DATE,
  next_review     DATE,
  evidence_required BOOLEAN DEFAULT false,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now(),
  updated_date    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  requirement_id  UUID REFERENCES compliance_requirements(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  evidence_type   TEXT DEFAULT 'document', -- document, record, observation, test_result
  file_url        TEXT,
  collected_by    TEXT,
  collection_date DATE DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_date    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. WATER TESTING
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_tests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  test_number      TEXT,
  test_date        DATE DEFAULT CURRENT_DATE,
  test_type        TEXT DEFAULT 'potability', -- potability, process, cooling_tower, ice, other
  sample_location  TEXT,
  area_id          UUID,
  area_name        TEXT,
  collected_by     TEXT,
  collected_by_name TEXT,
  lab_name         TEXT,
  results          JSONB DEFAULT '{}', -- { ph, turbidity, chlorine, coliform, etc. }
  overall_result   TEXT DEFAULT 'pass', -- pass, fail, conditional
  action_required  BOOLEAN DEFAULT false,
  corrective_action TEXT,
  certificate_url  TEXT,
  notes            TEXT,
  created_date     TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'capa_comments',
    'document_change_requests','document_control_settings','document_versions','document_acknowledgments',
    'handoff_settings',
    'pest_locations','pest_vendors',
    'recall_events',
    'management_reviews','risk_settings',
    'training_matrices','training_competency_settings',
    'soc2_evidence_packages',
    'compliance_frameworks','compliance_requirements','compliance_evidence',
    'water_tests'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all_access', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)',
      tbl || '_all_access', tbl
    );
  END LOOP;
END $$;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_capa_comments_capa       ON capa_comments(capa_id);
CREATE INDEX IF NOT EXISTS idx_capa_comments_org        ON capa_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_change_requests_org  ON document_change_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_ctrl_settings_org    ON document_control_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_org         ON document_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_acks_org             ON document_acknowledgments(organization_id);
CREATE INDEX IF NOT EXISTS idx_handoff_settings_org     ON handoff_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pest_locations_org       ON pest_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_pest_vendors_org         ON pest_vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_recall_events_org        ON recall_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_reviews_org         ON management_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_settings_org        ON risk_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_matrices_org    ON training_matrices(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_comp_settings   ON training_competency_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_soc2_evidence_pkgs_org   ON soc2_evidence_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_org ON compliance_frameworks(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reqs_org      ON compliance_requirements(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_org  ON compliance_evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_water_tests_org          ON water_tests(organization_id);
