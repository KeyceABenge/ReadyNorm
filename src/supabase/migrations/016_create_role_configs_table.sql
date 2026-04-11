-- =============================================================================
-- ReadyNorm — Migration 016: Create role_configs table
--
-- WHY THIS IS NEEDED:
--   The role_configs table was referenced in RLS migration 009 but was never
--   actually created. RoleConfigRepo.create() was hitting PGRST205 and
--   returning a fake in-memory mock — roles appeared in the UI while the
--   cache was warm but disappeared on reload/navigation because
--   RoleConfigRepo.filter() also got PGRST205 and returned [].
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.role_configs (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_name                 TEXT        NOT NULL,
  department                TEXT,
  description               TEXT,
  color                     TEXT        DEFAULT '#3b82f6',
  reports_to                TEXT,
  same_level_as             TEXT,
  sort_order                INTEGER     DEFAULT 0,
  is_active                 BOOLEAN     DEFAULT true,
  -- Capabilities
  can_do_line_cleaning       BOOLEAN     DEFAULT true,
  can_do_titrations          BOOLEAN     DEFAULT false,
  can_do_drain_cleaning      BOOLEAN     DEFAULT true,
  can_do_diverter_inspection BOOLEAN     DEFAULT false,
  can_do_inventory           BOOLEAN     DEFAULT false,
  can_do_preop_inspection    BOOLEAN     DEFAULT false,
  can_do_postclean_inspection BOOLEAN    DEFAULT false,
  -- JSONB fields
  task_quotas                JSONB,
  responsibilities           JSONB,
  required_training_ids      JSONB,
  -- Timestamps
  created_date              TIMESTAMPTZ DEFAULT now(),
  updated_date              TIMESTAMPTZ DEFAULT now()
);

-- Index for fast org-scoped lookups
CREATE INDEX IF NOT EXISTS role_configs_org_idx ON public.role_configs (organization_id);
CREATE INDEX IF NOT EXISTS role_configs_sort_idx ON public.role_configs (organization_id, sort_order);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.role_configs ENABLE ROW LEVEL SECURITY;

-- Authenticated managers: see/modify only their own org's roles
DROP POLICY IF EXISTS role_configs_manager_access ON public.role_configs;
CREATE POLICY role_configs_manager_access ON public.role_configs
  FOR ALL TO authenticated
  USING  (auth_can_access_org(organization_id))
  WITH CHECK (auth_can_access_org(organization_id));

-- Anon (employee kiosks — physically on-site, permissive)
DROP POLICY IF EXISTS role_configs_employee_access ON public.role_configs;
CREATE POLICY role_configs_employee_access ON public.role_configs
  FOR ALL TO anon
  USING  (true)
  WITH CHECK (true);

-- =============================================================================
-- DONE. role_configs table created with full RLS. Roles are now persisted and
-- will appear in CompletionTargetsPanel across all sessions.
-- =============================================================================
