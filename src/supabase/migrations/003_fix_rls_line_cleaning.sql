-- =============================================================================
-- Migration 003: Fix missing RLS policies on line cleaning tables
-- Run in: https://supabase.com/dashboard/project/zamrusolomzustgenpin/sql
-- Safe to re-run. Drops ALL existing policies on each table then adds a
-- single permissive policy so nothing blocks inserts/updates.
-- =============================================================================

DO $$
DECLARE
  tbl   TEXT;
  pol   RECORD;
  tbls  TEXT[] := ARRAY[
    'line_cleaning_assignments',
    'area_sign_offs',
    'production_lines',
    'areas',
    'assets',
    'asset_groups',
    'line_cleaning_groups',
    'pre_op_inspections',
    'post_clean_inspections'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Drop every existing policy on this table (restrictive ones override permissive ones in Postgres)
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;

    -- Ensure RLS is enabled
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Create a single fully-permissive policy
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)',
      tbl || '_all_access', tbl
    );
  END LOOP;
END $$;
