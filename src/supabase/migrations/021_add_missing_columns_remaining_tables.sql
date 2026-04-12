-- =============================================================================
-- ReadyNorm — Migration 021: Add Missing Columns for Remaining Tables
--
-- PREREQUISITES: Run AFTER migration 020.
--
-- This migration adds columns required by the frontend that are missing from
-- the CREATE TABLE definitions in migrations 002/008, and from base-schema
-- tables that have no column additions in any prior migration.
--
-- Tables covered (14):
--   incidents .................. 16 cols  (workflow tracking)
--   customer_complaints ........  4 cols  (received_* + activity_log)
--   compliance_frameworks ......  6 cols  (certification + audit)
--   compliance_requirements ....  6 cols  (section, criticality, evidence, etc.)
--   ccp_monitoring_points ......  8 cols  (type/category/status + name aliases)
--   ccp_records ................  9 cols  (name-aliases + deviation tracking)
--   risk_entries ............... 14 cols  (full risk register fields)
--   supplier_records ...........  2 cols  (required_documents + activity_log)
--   visitor_logs ...............  9 cols  (modern sign-in fields)
--   label_verifications ........  8 cols  (checklist booleans + result fields)
--   receiving_inspections ......  9 cols  (modern inspection fields)
--   handoff_settings ...........  3 cols  (auto_generate + include_sections)
--   line_cleaning_assignments . 17 cols  (full base-schema definition)
--   training_records ........... 11 cols (full base-schema definition)
--
-- Total: ~122 new columns
--
-- SAFETY: Every statement uses ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. INCIDENTS — workflow tracking columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS containment_actions  TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS correction_actions   TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS verification_notes   TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS root_cause           TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS closed_by            TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS recommended_actions  JSONB DEFAULT '[]';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS open_completed_at              TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS open_completed_by              TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS containment_completed_at       TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS containment_completed_by       TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS correction_completed_at        TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS correction_completed_by        TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS corrective_action_completed_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS corrective_action_completed_by TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS verification_completed_at      TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS verification_completed_by      TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CUSTOMER COMPLAINTS — received_* fields + activity_log
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE customer_complaints ADD COLUMN IF NOT EXISTS received_date     TIMESTAMPTZ;
ALTER TABLE customer_complaints ADD COLUMN IF NOT EXISTS received_by_email TEXT;
ALTER TABLE customer_complaints ADD COLUMN IF NOT EXISTS received_by_name  TEXT;
ALTER TABLE customer_complaints ADD COLUMN IF NOT EXISTS activity_log      JSONB DEFAULT '[]';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMPLIANCE FRAMEWORKS — certification & audit scheduling
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS status             TEXT DEFAULT 'not_assessed';
ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS audit_frequency    TEXT DEFAULT 'annual';
ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS next_audit_date    DATE;
ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS certificate_number TEXT;
ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS certifying_body    TEXT;
ALTER TABLE compliance_frameworks ADD COLUMN IF NOT EXISTS certificate_expiry DATE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COMPLIANCE REQUIREMENTS — section, criticality, evidence, etc.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS section              TEXT;
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS criticality          TEXT DEFAULT 'major';
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS evidence_frequency   TEXT DEFAULT 'monthly';
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS corrective_action    TEXT;
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS due_date             DATE;
ALTER TABLE compliance_requirements ADD COLUMN IF NOT EXISTS linked_task_ids      JSONB DEFAULT '[]';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CCP MONITORING POINTS — type/category/status + frontend field aliases
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS type                        TEXT DEFAULT 'ccp';
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS category                    TEXT DEFAULT 'temperature';
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS status                      TEXT DEFAULT 'active';
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS name                        TEXT;
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS hazard_description          TEXT;
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS corrective_action_procedure TEXT;
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS process_step                TEXT;
ALTER TABLE ccp_monitoring_points ADD COLUMN IF NOT EXISTS target_value                NUMERIC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CCP RECORDS — frontend field name aliases + deviation tracking
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS monitoring_point_id   UUID;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS monitoring_point_name TEXT;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS record_date           DATE;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS record_time           TEXT;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS value                 NUMERIC;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS is_within_limits      BOOLEAN;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS is_deviation          BOOLEAN DEFAULT false;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS deviation_type        TEXT;
ALTER TABLE ccp_records ADD COLUMN IF NOT EXISTS lot_number            TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RISK ENTRIES — full risk register fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS risk_number       TEXT;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS source            TEXT;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS severity          INTEGER DEFAULT 3;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS risk_level        TEXT DEFAULT 'medium';
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS owner_email       TEXT;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS owner_name        TEXT;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS review_frequency  TEXT DEFAULT 'quarterly';
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS next_review_date  DATE;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS identified_date   DATE;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS identified_by     TEXT;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS controls_in_place JSONB DEFAULT '[]';
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS trend             TEXT DEFAULT 'stable';
ALTER TABLE risk_entries ADD COLUMN IF NOT EXISTS activity_log      JSONB DEFAULT '[]';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SUPPLIER RECORDS — required_documents + activity_log
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE supplier_records ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]';
ALTER TABLE supplier_records ADD COLUMN IF NOT EXISTS activity_log      JSONB DEFAULT '[]';

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. VISITOR LOGS — modern sign-in/out fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS visitor_type                     TEXT DEFAULT 'visitor';
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS gmp_training_acknowledged        BOOLEAN DEFAULT false;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS allergen_disclosure_acknowledged BOOLEAN DEFAULT false;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS photo_id_verified                BOOLEAN DEFAULT false;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS ppe_provided                     BOOLEAN DEFAULT false;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS escort_required                  BOOLEAN DEFAULT true;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS sign_in_time                     TIMESTAMPTZ;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS sign_out_time                    TIMESTAMPTZ;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS status                           TEXT DEFAULT 'signed_in';

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. LABEL VERIFICATIONS — checklist booleans + result fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS verification_type          TEXT DEFAULT 'pre_run';
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS allergen_statement_correct BOOLEAN DEFAULT true;
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS nutrition_facts_correct    BOOLEAN DEFAULT true;
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS net_weight_correct         BOOLEAN DEFAULT true;
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS upc_code_correct           BOOLEAN DEFAULT true;
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS best_by_date_correct       BOOLEAN DEFAULT true;
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS overall_result             TEXT DEFAULT 'pass';
ALTER TABLE label_verifications ADD COLUMN IF NOT EXISTS corrective_action          TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. RECEIVING INSPECTIONS — modern inspection fields
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS material_name          TEXT;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS temperature_check      NUMERIC;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS carrier_name           TEXT;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS seal_number            TEXT;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS temperature_acceptable BOOLEAN DEFAULT true;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS packaging_intact       BOOLEAN DEFAULT true;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS coa_received           BOOLEAN DEFAULT false;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS pest_evidence          BOOLEAN DEFAULT false;
ALTER TABLE receiving_inspections ADD COLUMN IF NOT EXISTS foreign_material_found BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. HANDOFF SETTINGS — auto_generate + include_sections
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE handoff_settings ADD COLUMN IF NOT EXISTS auto_generate       BOOLEAN DEFAULT false;
ALTER TABLE handoff_settings ADD COLUMN IF NOT EXISTS auto_generate_times JSONB DEFAULT '[]';
ALTER TABLE handoff_settings ADD COLUMN IF NOT EXISTS auto_email          BOOLEAN DEFAULT false;
ALTER TABLE handoff_settings ADD COLUMN IF NOT EXISTS include_sections    JSONB DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. LINE CLEANING ASSIGNMENTS — base-schema columns
--     This table exists in Supabase but has no CREATE TABLE in any migration.
--     ADD COLUMN IF NOT EXISTS is safe for columns that already exist.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS production_line_id       UUID;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS production_line_name     TEXT;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS line_down_time           TIMESTAMPTZ;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS expected_line_down_time  TIMESTAMPTZ;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS estimated_end_time       TIMESTAMPTZ;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS duration_minutes         INTEGER;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS areas_snapshot           JSONB DEFAULT '[]';
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS assets_snapshot          JSONB DEFAULT '[]';
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS employee_counts          JSONB DEFAULT '{}';
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS total_crew_size          INTEGER;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS notes                    TEXT;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS status                   TEXT DEFAULT 'pending';
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS sequence_number          INTEGER;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS scheduled_date           DATE;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS shift_name               TEXT;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS created_by_manager_id    UUID;
ALTER TABLE line_cleaning_assignments ADD COLUMN IF NOT EXISTS created_by_manager_name  TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. TRAINING RECORDS — base-schema columns
--     This table exists in Supabase but has no column additions in any migration.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS employee_id           UUID;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS employee_name         TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS employee_email        TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS training_document_id  UUID;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS document_title        TEXT;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS status                TEXT DEFAULT 'assigned';
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS assigned_date         DATE;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS due_date              DATE;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS quiz_required         BOOLEAN DEFAULT false;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS practical_required    BOOLEAN DEFAULT false;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS trigger_source        TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. INDEXES for commonly filtered / sorted columns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ccp_records_record_date ON ccp_records(record_date);
CREATE INDEX IF NOT EXISTS idx_ccp_records_monitoring_point ON ccp_records(monitoring_point_id);
CREATE INDEX IF NOT EXISTS idx_risk_entries_risk_level ON risk_entries(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_entries_org_status ON risk_entries(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_training_records_employee ON training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_records_org ON training_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_records_status ON training_records(status);
CREATE INDEX IF NOT EXISTS idx_line_cleaning_org_date ON line_cleaning_assignments(organization_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_status ON visitor_logs(status);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_sign_in ON visitor_logs(sign_in_time);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_status ON compliance_frameworks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_req_framework ON compliance_requirements(framework_id);

COMMIT;
