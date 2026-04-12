-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 023 — Add missing columns to controlled_documents
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Root cause: The controlled_documents table was created with only basic columns
-- (id, organization_id, title, document_number, document_type, description,
-- file_url, status, category, effective_date, next_review_date, created_at,
-- updated_at).  The Document Control UI and the Training Documents page write
-- many additional columns that don't exist yet, causing database.js to strip
-- them one-by-one on each retry (9 "Stripping unknown column" warnings).
--
-- This migration adds every column the code references that is not yet on the
-- table.  It also includes the 3 columns from migration 020 (approvers, tags,
-- training_document_id) since 020 has not been applied yet.
--
-- Safe to re-run: all statements use ADD COLUMN IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- Authorship & ownership
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  ADD COLUMN IF NOT EXISTS author_email         TEXT,
  ADD COLUMN IF NOT EXISTS author_name          TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- Document metadata
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  ADD COLUMN IF NOT EXISTS department            TEXT,
  ADD COLUMN IF NOT EXISTS confidentiality_level TEXT    DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS current_version       TEXT    DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS version               TEXT    DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS file_name             TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- Review & training settings
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  ADD COLUMN IF NOT EXISTS review_frequency_months  INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS requires_training        BOOLEAN DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- Classification & search
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  ADD COLUMN IF NOT EXISTS keywords               JSONB,
  ADD COLUMN IF NOT EXISTS regulatory_references  JSONB,
  ADD COLUMN IF NOT EXISTS tags                   JSONB;


-- ─────────────────────────────────────────────────────────────────────────────
-- Approval workflow
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  ADD COLUMN IF NOT EXISTS approvers              JSONB;


-- ─────────────────────────────────────────────────────────────────────────────
-- Training document link (two-way relationship)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  ADD COLUMN IF NOT EXISTS training_document_id   UUID;


-- ─────────────────────────────────────────────────────────────────────────────
-- Change tracking (used by CR completion and version history)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE controlled_documents
  ADD COLUMN IF NOT EXISTS change_summary         TEXT,
  ADD COLUMN IF NOT EXISTS change_rationale        TEXT;


-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT_STANDARDS — additional columns written by StandardUploadModal
-- (migration 019 adds total_sections/total_requirements/parsing_status but
--  these 3 are still missing from the table definition)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE audit_standards
  ADD COLUMN IF NOT EXISTS type                    TEXT,
  ADD COLUMN IF NOT EXISTS color_index             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_document_url     TEXT,
  ADD COLUMN IF NOT EXISTS status                  TEXT    DEFAULT 'active';


-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT_PLANS — columns written by AuditPlanManager
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE audit_plans
  ADD COLUMN IF NOT EXISTS name                    TEXT,
  ADD COLUMN IF NOT EXISTS standards_included      JSONB,
  ADD COLUMN IF NOT EXISTS total_scheduled_audits  INTEGER DEFAULT 0;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SCHEDULED_AUDITS — columns written by AuditPlanManager
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE scheduled_audits
  ADD COLUMN IF NOT EXISTS plan_id                 UUID,
  ADD COLUMN IF NOT EXISTS standard_name           TEXT,
  ADD COLUMN IF NOT EXISTS section_id              UUID,
  ADD COLUMN IF NOT EXISTS section_number          TEXT,
  ADD COLUMN IF NOT EXISTS section_title           TEXT,
  ADD COLUMN IF NOT EXISTS due_date                DATE,
  ADD COLUMN IF NOT EXISTS frequency               TEXT,
  ADD COLUMN IF NOT EXISTS quarter                 INTEGER;


-- ═══════════════════════════════════════════════════════════════════════════════
-- GLASS_BRITTLE_ITEMS — columns written by GlassBrittleProgram
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE glass_brittle_items
  ADD COLUMN IF NOT EXISTS item_name              TEXT,
  ADD COLUMN IF NOT EXISTS audit_frequency        TEXT    DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS status                 TEXT    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS next_audit_due         DATE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- GLASS_BREAKAGE_INCIDENTS — columns written by GlassBrittleProgram
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE glass_breakage_incidents
  ADD COLUMN IF NOT EXISTS incident_date          DATE,
  ADD COLUMN IF NOT EXISTS item_name              TEXT,
  ADD COLUMN IF NOT EXISTS cleanup_verified       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS all_pieces_accounted   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS corrective_action      TEXT;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PEST_FINDINGS — risk prediction columns written by PestRiskAnalysis
-- (PestRiskPredictionRepo maps to pest_findings)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE pest_findings
  ADD COLUMN IF NOT EXISTS prediction_date        DATE,
  ADD COLUMN IF NOT EXISTS risk_area_type          TEXT,
  ADD COLUMN IF NOT EXISTS risk_score              INTEGER,
  ADD COLUMN IF NOT EXISTS risk_level              TEXT,
  ADD COLUMN IF NOT EXISTS contributing_factors    JSONB,
  ADD COLUMN IF NOT EXISTS sanitation_correlation  JSONB,
  ADD COLUMN IF NOT EXISTS recommended_actions     JSONB,
  ADD COLUMN IF NOT EXISTS ai_analysis             TEXT,
  ADD COLUMN IF NOT EXISTS trend_direction          TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score        NUMERIC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- EMP_SAMPLES — risk prediction columns written by EMPRiskAnalysis
-- (EMPRiskPredictionRepo maps to emp_samples)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE emp_samples
  ADD COLUMN IF NOT EXISTS prediction_date        DATE,
  ADD COLUMN IF NOT EXISTS scope_type              TEXT,
  ADD COLUMN IF NOT EXISTS risk_score              INTEGER,
  ADD COLUMN IF NOT EXISTS risk_level              TEXT,
  ADD COLUMN IF NOT EXISTS primary_concern         TEXT,
  ADD COLUMN IF NOT EXISTS contributing_factors    JSONB,
  ADD COLUMN IF NOT EXISTS sanitation_correlation  JSONB,
  ADD COLUMN IF NOT EXISTS recommended_actions     JSONB,
  ADD COLUMN IF NOT EXISTS trend_direction          TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis             TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score        NUMERIC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done.  Run this in Supabase SQL Editor, then retry creating/editing a
-- controlled document — the "Stripping unknown column" warnings should stop
-- and all fields will be persisted correctly.
-- ═══════════════════════════════════════════════════════════════════════════════
