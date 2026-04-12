-- =============================================================================
-- ReadyNorm — Migration 017: Add excluded_from_targets to role_configs
--
-- WHY THIS IS NEEDED:
--   Previously, "hiding" a role from the Targets settings panel was stored in
--   site_settings.excluded_roles_from_targets (an array of UUIDs) which was
--   only read by the settings UI — it had no effect on completion scoring or
--   analytics.
--
--   This migration adds a proper boolean column to role_configs so that:
--     1. Exclusion is stored per-role alongside the role record itself
--     2. Completion scoring, analytics, and dashboards can all check
--        role_configs.excluded_from_targets to skip excluded roles
--     3. The settings UI reads the same source of truth as the scoring logic
-- =============================================================================

ALTER TABLE public.role_configs
  ADD COLUMN IF NOT EXISTS excluded_from_targets BOOLEAN NOT NULL DEFAULT false;

-- Index for fast filtering in analytics queries
CREATE INDEX IF NOT EXISTS role_configs_excluded_idx
  ON public.role_configs (organization_id, excluded_from_targets);

-- =============================================================================
-- DONE. role_configs.excluded_from_targets = true means the role is fully
-- excluded from completion target tracking and should be skipped by all
-- scoring and analytics queries.
-- =============================================================================
