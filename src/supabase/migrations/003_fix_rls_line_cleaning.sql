-- =============================================================================
-- Migration 003: Fix missing RLS policies on line cleaning tables
-- Run in: https://supabase.com/dashboard/project/zamrusolomzustgenpin/sql
-- Safe to re-run: uses DROP POLICY IF EXISTS before CREATE POLICY
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
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
    -- Ensure RLS is enabled
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Drop existing policy if present, then recreate permissive one
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all_access', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)',
      tbl || '_all_access', tbl
    );
  END LOOP;
END $$;
