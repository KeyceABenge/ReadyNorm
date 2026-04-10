-- =============================================================================
-- Fix RLS policies + missing UUID defaults for rain diverter tables.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- Fix missing UUID defaults on id columns
ALTER TABLE rain_diverters         ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE diverter_inspections   ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE diverter_task_settings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE facility_maps          ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE drain_facility_maps    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Fix RLS: enable + add permissive policy
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'rain_diverters',
    'diverter_inspections',
    'diverter_task_settings',
    'facility_maps',
    'drain_facility_maps'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Enable RLS (safe to run even if already enabled)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Drop existing policy if present, then recreate as fully permissive
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all_access', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)',
      tbl || '_all_access', tbl
    );
  END LOOP;
END $$;
