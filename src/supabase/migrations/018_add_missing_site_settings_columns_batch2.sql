-- =============================================================================
-- ReadyNorm — Migration 018: Add missing JSONB columns to site_settings (batch 2)
--
-- WHY THIS IS NEEDED:
--   The frontend writes completion_target_settings and excluded_roles_from_targets
--   to site_settings, but these columns were never added to the table. Every save
--   of completion targets or role exclusions was silently stripped by the database
--   adapter's auto-heal loop (column 42703 → strip → retry), meaning those settings
--   were never actually persisted to the database.
--
-- COLUMNS ADDED:
--   completion_target_settings   — JSONB blob holding per-shift, per-role, and
--                                  site-level completion % targets used by
--                                  CompletionTargetsPanel and the dashboard KPI cards.
--
--   excluded_roles_from_targets  — JSONB array of role names/ids that have been
--                                  manually excluded from completion tracking.
--                                  NOTE: individual role-level exclusion is now also
--                                  stored on role_configs.excluded_from_targets
--                                  (migration 017), but this site_settings column is
--                                  kept for the legacy per-site override list.
-- =============================================================================

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS completion_target_settings  JSONB,
  ADD COLUMN IF NOT EXISTS excluded_roles_from_targets JSONB;

-- =============================================================================
-- DONE. Both columns are nullable JSONB — no defaults needed since the frontend
-- already handles null with || {} / || [] fallbacks in every consumer.
-- =============================================================================
