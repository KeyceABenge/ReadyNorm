-- =============================================================================
-- ReadyNorm — Migration 004: User Dashboard Configs
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/zamrusolomzustgenpin/sql
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS / CREATE POLICY IF NOT EXISTS
-- =============================================================================
-- Stores per-user dashboard layout preferences (widget order, sizes, visibility).
-- Keyed on user_id (Supabase auth.users.id as text) so each manager gets their
-- own layout that follows them across devices and browsers.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_dashboard_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  widget_order    JSONB DEFAULT '[]',
  widget_sizes    JSONB DEFAULT '{}',
  visible_widgets JSONB DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE user_dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts on re-run
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_dashboard_configs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_dashboard_configs', pol.policyname);
  END LOOP;
END $$;

-- Fully permissive policy (same pattern as all other ReadyNorm tables)
CREATE POLICY user_dashboard_configs_all_access
  ON user_dashboard_configs
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);
