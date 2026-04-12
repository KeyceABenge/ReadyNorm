-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 022 — Create missing Chemical Inventory tables & patch existing ones
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Root cause : The UI code for the Chemical Inventory feature references six
--   tables, but only two (chemical_storage_locations, chemical_location_assignments)
--   were ever created in migration 002.  The other four were never defined,
--   causing the auto-heal loop in database.js to silently return empty arrays,
--   which renders the entire feature as "Inventory Not Configured".
--
-- This migration:
--   Part A — CREATE TABLE for 4 missing tables
--     1. chemicals
--     2. chemical_inventory_settings
--     3. chemical_inventory_records
--     4. chemical_count_entries
--
--   Part B — ALTER TABLE to add missing columns to 2 existing tables
--     5. chemical_storage_locations   (add sort_order, status)
--     6. chemical_location_assignments (add par_level, reorder_to_level,
--        chemical_name, location_name, status)
--
--   Part C — RLS policies (org-isolation, same pattern as migration 009)
--   Part D — Indexes for common access patterns
--
-- Safe to re-run: every statement uses IF NOT EXISTS / IF NOT EXISTS guards.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- PART A — CREATE missing tables
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. CHEMICALS
--    Master list of chemical products tracked per organization.
--    Referenced by: ChemicalsList.jsx, InventoryCountForm.jsx, LocationAssignments.jsx
CREATE TABLE IF NOT EXISTS chemicals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  sku              TEXT,
  unit             TEXT        DEFAULT 'gallons',   -- gallons, liters, oz, lbs, kg, each, case, pail, drum
  category         TEXT,
  supplier         TEXT,
  sds_url          TEXT,
  notes            TEXT,
  status           TEXT        DEFAULT 'active',    -- active, discontinued
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);


-- 2. CHEMICAL_INVENTORY_SETTINGS
--    Per-org configuration for the inventory counting feature.
--    Referenced by: InventorySettings.jsx, InventoryRecordsDashboard.jsx, ChemicalInventory.jsx
CREATE TABLE IF NOT EXISTS chemical_inventory_settings (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  frequency                TEXT        DEFAULT 'weekly',     -- daily, weekly, bi-weekly, monthly
  day_of_week              TEXT        DEFAULT 'monday',     -- sunday–saturday
  task_title               TEXT        DEFAULT 'Chemical Inventory Count',
  is_enabled               BOOLEAN     DEFAULT true,
  notify_on_low_stock      BOOLEAN     DEFAULT true,
  required_training_id     UUID,
  required_training_title  TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);


-- 3. CHEMICAL_INVENTORY_RECORDS
--    One row per inventory-counting period (usually one per week).
--    Referenced by: InventoryRecordsDashboard.jsx, InventoryCountForm.jsx,
--                   InventoryReviewModal.jsx, InventoryHistoryList.jsx
CREATE TABLE IF NOT EXISTS chemical_inventory_records (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week_start_date     DATE,
  week_end_date       DATE,
  status              TEXT        DEFAULT 'pending',  -- pending, in_progress, completed, reviewed, closed
  completed_by        TEXT,
  completed_by_name   TEXT,
  completed_at        TIMESTAMPTZ,
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,
  order_placed        BOOLEAN     DEFAULT false,
  order_placed_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);


-- 4. CHEMICAL_COUNT_ENTRIES
--    Individual count entries per chemical-location pair for each inventory record.
--    Referenced by: InventoryCountForm.jsx, InventoryReviewModal.jsx,
--                   InventoryRecordsDashboard.jsx, InventoryHistoryList.jsx
CREATE TABLE IF NOT EXISTS chemical_count_entries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inventory_record_id   UUID        REFERENCES chemical_inventory_records(id) ON DELETE CASCADE,
  chemical_id           UUID        REFERENCES chemicals(id) ON DELETE SET NULL,
  chemical_name         TEXT,
  location_id           UUID        REFERENCES chemical_storage_locations(id) ON DELETE SET NULL,
  location_name         TEXT,
  assignment_id         UUID,
  on_hand_quantity      NUMERIC,
  par_level             NUMERIC,
  reorder_to_level      NUMERIC,
  unit                  TEXT,
  suggested_order_qty   NUMERIC,
  actual_order_qty      NUMERIC,
  notes                 TEXT,
  counted_by            TEXT,
  counted_at            TIMESTAMPTZ,
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           TEXT,
  review_notes          TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- PART B — ALTER existing tables to add missing columns
-- ─────────────────────────────────────────────────────────────────────────────

-- 5. CHEMICAL_STORAGE_LOCATIONS — add sort_order + status
--    Code filters locations.filter(l => l.status === "active") and sorts by sort_order.
ALTER TABLE chemical_storage_locations
  ADD COLUMN IF NOT EXISTS sort_order  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status      TEXT    DEFAULT 'active';


-- 6. CHEMICAL_LOCATION_ASSIGNMENTS — add par_level, reorder_to_level, chemical_name, location_name, status
--    LocationAssignments.jsx stores denormalized names + par levels on each assignment.
ALTER TABLE chemical_location_assignments
  ADD COLUMN IF NOT EXISTS par_level          NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_to_level   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chemical_name      TEXT,
  ADD COLUMN IF NOT EXISTS location_name      TEXT,
  ADD COLUMN IF NOT EXISTS status             TEXT    DEFAULT 'active';


-- ─────────────────────────────────────────────────────────────────────────────
-- PART C — Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on new tables
ALTER TABLE chemicals                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_count_entries       ENABLE ROW LEVEL SECURITY;

-- Org-isolation policies (same pattern as migration 009)
-- NOTE: CREATE POLICY has no IF NOT EXISTS, so we DROP first then CREATE.
DO $$
DECLARE
  tbl TEXT;
  ops TEXT[] := ARRAY['select','insert','update','delete'];
  op  TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'chemicals',
      'chemical_inventory_settings',
      'chemical_inventory_records',
      'chemical_count_entries'
    ])
  LOOP
    FOREACH op IN ARRAY ops
    LOOP
      pol := 'org_iso_' || op || '_' || tbl;

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl);

      IF op = 'insert' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (
             organization_id IN (
               SELECT om.organization_id FROM org_members om WHERE om.user_id = auth.uid()
             )
           )', pol, tbl
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY %I ON %I FOR %s USING (
             organization_id IN (
               SELECT om.organization_id FROM org_members om WHERE om.user_id = auth.uid()
             )
           )', pol, tbl, upper(op)
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART D — Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chemicals_org
  ON chemicals(organization_id);

CREATE INDEX IF NOT EXISTS idx_chem_inv_settings_org
  ON chemical_inventory_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_chem_inv_records_org
  ON chemical_inventory_records(organization_id);

CREATE INDEX IF NOT EXISTS idx_chem_inv_records_week
  ON chemical_inventory_records(organization_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_chem_count_entries_org
  ON chemical_count_entries(organization_id);

CREATE INDEX IF NOT EXISTS idx_chem_count_entries_record
  ON chemical_count_entries(inventory_record_id);

CREATE INDEX IF NOT EXISTS idx_chem_count_entries_chemical
  ON chemical_count_entries(chemical_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done.  Run this in Supabase SQL Editor, then refresh the Chemical Inventory
-- page — the "Inventory Not Configured" message should be replaced by the
-- Settings tab where you can enable inventory tracking and add chemicals.
-- ═══════════════════════════════════════════════════════════════════════════════
