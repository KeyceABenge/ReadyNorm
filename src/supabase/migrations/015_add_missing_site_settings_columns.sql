-- =============================================================================
-- ReadyNorm — Migration 015: Add missing JSONB columns to site_settings
--
-- WHY THIS IS NEEDED:
--   The frontend writes color_coding_categories, facility_colors,
--   fiscal_year_settings, and frequency_settings to site_settings, but these
--   columns were never added to the table. Every save was returning 400 and
--   the database.js adapter was stripping the unknown fields.
-- =============================================================================

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS color_coding_categories JSONB,
  ADD COLUMN IF NOT EXISTS facility_colors         JSONB,
  ADD COLUMN IF NOT EXISTS fiscal_year_settings    JSONB,
  ADD COLUMN IF NOT EXISTS frequency_settings      JSONB;

-- =============================================================================
-- DONE. All four columns are now present and nullable (no defaults required —
-- the frontend already handles null with || {} / || [] fallbacks).
-- =============================================================================
