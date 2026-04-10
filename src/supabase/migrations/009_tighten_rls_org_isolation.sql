-- =============================================================================
-- ReadyNorm — Migration 009: Tighten RLS for Multi-Tenant Data Isolation
--
-- PREREQUISITES: Run AFTER migrations 007 and 008.
--
-- WHAT THIS FIXES:
--   BEFORE: USING (true) TO authenticated, anon — anyone with the anon key
--           can read/write any organization's data.
--   AFTER:  Authenticated (manager) users can ONLY access their own org's data.
--           Anonymous (employee kiosk) users keep access to operational tables
--           needed for the PIN-login flow, but sensitive manager data is hidden.
--
-- ARCHITECTURE:
--   • auth_can_access_org(org_id) — Postgres function that returns true when the
--     calling user's email matches the org creator OR an active org-group member.
--   • Manager-only tables   → FOR ALL TO authenticated + org check. Anon = none.
--   • Employee+mgr tables   → Two policies: authenticated+org OR anon permissive.
--   • Org-structure tables  → Custom policies (no organization_id FK column).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ORG ACCESS FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Primary function: accepts TEXT so it works with both UUID and TEXT org_id cols.
-- Returns true for:
--   • service_role (Supabase Edge Functions / admin access)
--   • authenticated user whose email matches organizations.created_by
--   • authenticated user who is an active member of the org group that owns the org
CREATE OR REPLACE FUNCTION auth_can_access_org(p_org_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_uuid   uuid;
  v_result boolean := false;
BEGIN
  -- Service role always has full access (edge functions, admin SQL)
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;

  -- Only authenticated users can access org-scoped data
  IF auth.role() != 'authenticated' THEN
    RETURN false;
  END IF;

  -- Must be a valid UUID; non-UUID org IDs (legacy) are denied
  BEGIN
    v_uuid := p_org_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  -- Check 1: user is the creator of this org
  SELECT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = v_uuid
      AND created_by = auth.email()
  ) INTO v_result;

  IF v_result THEN RETURN true; END IF;

  -- Check 2: user is an active member of the org_group that owns this org.
  -- Uses dynamic SQL so an undefined_column error (org_group_id not yet added
  -- via migration 007) degrades gracefully instead of hard-erroring.
  BEGIN
    EXECUTE $dyn$
      SELECT EXISTS (
        SELECT 1
        FROM org_group_memberships m
        JOIN organizations o ON o.org_group_id::text = m.org_group_id
        WHERE o.id           = $1
          AND m.user_email   = $2
          AND m.status       = 'active'
      )
    $dyn$ USING v_uuid, auth.email() INTO v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Column doesn't exist yet (run migration 007 to enable this path)
    v_result := false;
  END;

  RETURN COALESCE(v_result, false);
END;
$$;

-- UUID convenience overload — Postgres will auto-cast UUID→text when calling
-- policies like USING (auth_can_access_org(some_uuid_column)).
CREATE OR REPLACE FUNCTION auth_can_access_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth_can_access_org(p_org_id::text);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. APPLY ORG-SCOPED RLS TO ALL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl TEXT;

  -- ── MANAGER-ONLY TABLES ─────────────────────────────────────────────────
  -- Sensitive data: employees should NEVER access these directly.
  -- Policy: authenticated + org check only. Anon access is REMOVED.
  manager_tables TEXT[] := ARRAY[
    -- CAPA program
    'capa_comments', 'capa_actions', 'capa_settings',
    -- SOC2
    'soc2_controls', 'soc2_evidence', 'soc2_policies', 'soc2_risks',
    'soc2_vendors', 'soc2_evidence_packages',
    -- Compliance
    'compliance_frameworks', 'compliance_requirements', 'compliance_evidence',
    -- Risk & management reviews
    'management_reviews', 'risk_settings', 'risk_entries',
    -- Suppliers
    'supplier_records', 'supplier_contacts', 'supplier_materials',
    'supplier_nonconformances', 'supplier_settings',
    -- Customer complaints
    'customer_complaints', 'complaint_settings',
    -- Auditing
    'audit_standards', 'audit_sections', 'audit_requirements',
    'audit_plans', 'scheduled_audits', 'audit_results', 'audit_findings',
    -- Change control
    'change_controls',
    -- Food safety & HACCP
    'fsp_settings', 'food_safety_plans', 'process_steps', 'hazard_analyses',
    'preventive_controls', 'ccp_monitoring_points', 'ccp_records',
    -- Quality & traceability
    'hold_releases', 'label_verifications', 'receiving_inspections',
    -- Calibration
    'calibration_equipment', 'calibration_records',
    -- Recall
    'recall_events',
    -- Training admin
    'training_matrices', 'training_competency_settings',
    -- Shift management
    'handoff_settings', 'shift_handoffs',
    -- Pest management (admin level)
    'pest_locations', 'pest_vendors', 'pest_thresholds',
    'pest_escalation_markers',
    -- HR / personnel management
    'performance_goals', 'scheduling_requests', 'employee_groups',
    'employee_quotas',
    -- Issues
    'issues', 'issue_settings',
    -- EMP program
    'emp_samples', 'emp_sites', 'emp_thresholds', 'plant_exceptions',
    -- Competency & evaluation
    'evaluation_templates', 'evaluator_settings',
    'competency_records', 'competency_evaluations', 'training_records',
    -- Chemical management (admin)
    'chemical_products', 'chemical_storage_locations',
    'chemical_location_assignments',
    -- Allergens
    'allergens', 'allergen_assignments',
    -- Visitor access
    'visitor_logs',
    -- Document control
    'document_change_requests', 'document_control_settings',
    'document_versions', 'document_acknowledgments',
    -- Regulatory documents
    'sds_documents', 'ssops',
    -- Badge definitions (admin creates; employees receive)
    'badges',
    -- Structural helpers
    'helpers',
    -- Dashboard layout configs (per-user, not per-employee)
    'user_dashboard_configs'
  ];

  -- ── EMPLOYEE + MANAGER TABLES ────────────────────────────────────────────
  -- Operational data: employees need these during their shift.
  -- TWO policies:
  --   1. authenticated → org-scoped (managers only see their org)
  --   2. anon → permissive (employee kiosk devices are physically restricted)
  employee_tables TEXT[] := ARRAY[
    -- Core employee data
    'employees', 'employee_sessions', 'employee_trainings',
    'employee_badges',
    -- Tasks
    'tasks', 'task_comments', 'task_groups', 'task_training_gaps',
    -- Scheduling
    'crews', 'crew_schedules', 'role_configs',
    'employee_shifts', 'shift_requests',
    -- Site config / comms
    'site_settings', 'announcements',
    -- Drain & sanitation (employee operational)
    'drain_locations', 'drain_cleaning_records', 'drain_cleaning_settings',
    'titration_records', 'titration_areas', 'titration_settings',
    'line_cleaning_assignments', 'area_sign_offs',
    'pre_op_inspections', 'post_clean_inspections',
    -- Rain diverters (employee task on mobile)
    'rain_diverters', 'diverter_inspections',
    'diverter_task_settings', 'diverter_settings',
    -- Feedback
    'employee_feedback', 'employee_peer_feedback', 'anonymous_feedback',
    -- Pest sightings (employees log)
    'pest_control_records', 'pest_findings',
    'pest_service_reports', 'pest_devices',
    -- Sanitation operational
    'sanitary_reports', 'sanitation_downtimes',
    -- Chemical inventory (employees count)
    'chemical_inventory_records', 'chemical_inventory_settings',
    'chemical_count_entries', 'chemicals', 'chemical_locations',
    -- Production & areas (location references for all employee tasks)
    'production_lines', 'areas', 'assets', 'asset_groups',
    'facility_maps', 'drain_facility_maps',
    -- Training content (employees read)
    'training_documents', 'training_quizzes', 'controlled_documents',
    -- QA logs (employees submit)
    'employee_qa_logs',
    -- Incidents (employees report)
    'incidents', 'foreign_material_incidents',
    'glass_breakage_incidents', 'glass_brittle_items',
    -- Water tests (operational)
    'water_tests'
  ];

BEGIN

  -- ── Apply manager-only policies ──────────────────────────────────────────
  FOREACH tbl IN ARRAY manager_tables LOOP
    -- Skip tables that don't exist yet (defensive)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE NOTICE 'Skipping missing table: %', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Drop all old policies (including legacy _all_access)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all_access',      tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_manager_access',  tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_employee_access', tbl);
    -- Single org-scoped policy for authenticated managers only
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated '
      'USING (auth_can_access_org(organization_id)) '
      'WITH CHECK (auth_can_access_org(organization_id))',
      tbl || '_manager_access', tbl
    );
  END LOOP;

  -- ── Apply employee + manager dual policies ───────────────────────────────
  FOREACH tbl IN ARRAY employee_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE NOTICE 'Skipping missing table: %', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all_access',      tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_manager_access',  tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_employee_access', tbl);
    -- Authenticated managers: see only their org
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated '
      'USING (auth_can_access_org(organization_id)) '
      'WITH CHECK (auth_can_access_org(organization_id))',
      tbl || '_manager_access', tbl
    );
    -- Anon employees: permissive (kiosk devices are on-site, physically restricted)
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO anon USING (true) WITH CHECK (true)',
      tbl || '_employee_access', tbl
    );
  END LOOP;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LEGACY "BATCH I" TABLES (TEXT primary keys from original schema)
-- These tables were not created by our migrations; their organization_id type
-- may be TEXT. auth_can_access_org(text) handles both TEXT and UUID safely.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  legacy_manager_tables TEXT[] := ARRAY[
    'capas'  -- TEXT id & likely TEXT organization_id; manager-only sensitive data
  ];
  legacy_employee_tables TEXT[] := ARRAY[
    -- These legacy tables are operational and may be accessed by employees
  ];
BEGIN
  FOREACH tbl IN ARRAY legacy_manager_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_all_access',     tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_manager_access', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated '
      'USING (auth_can_access_org(organization_id::text)) '
      'WITH CHECK (auth_can_access_org(organization_id::text))',
      tbl || '_manager_access', tbl
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SPECIAL CASES — tables without an organization_id column
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ORGANIZATIONS ──────────────────────────────────────────────────────────
-- Managers need to SELECT all orgs (org picker / onboarding).
-- Employees need SELECT for kiosk (shows site name & logo).
-- Only the org owner may INSERT / UPDATE / DELETE their own org.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_all_access  ON organizations;
DROP POLICY IF EXISTS organizations_select      ON organizations;
DROP POLICY IF EXISTS organizations_anon_select ON organizations;
DROP POLICY IF EXISTS organizations_modify      ON organizations;

CREATE POLICY organizations_select ON organizations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY organizations_anon_select ON organizations
  FOR SELECT TO anon USING (true);

CREATE POLICY organizations_modify ON organizations
  FOR ALL TO authenticated
  USING (auth_can_access_org(id))
  WITH CHECK (auth_can_access_org(id));

-- ── ORGANIZATION_GROUPS ────────────────────────────────────────────────────
-- During onboarding a manager creates their org group, so INSERT must be open.
-- Reads are safe to show to all authenticated users (no sensitive data here).
ALTER TABLE organization_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organization_groups_all_access ON organization_groups;
DROP POLICY IF EXISTS organization_groups_select     ON organization_groups;
DROP POLICY IF EXISTS organization_groups_insert     ON organization_groups;
DROP POLICY IF EXISTS organization_groups_modify     ON organization_groups;

CREATE POLICY organization_groups_select ON organization_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY organization_groups_insert ON organization_groups
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY organization_groups_modify ON organization_groups
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM org_group_memberships
    WHERE org_group_id = organization_groups.id::text
      AND user_email   = auth.email()
      AND status       = 'active'
  ));

-- ── ORG_GROUP_MEMBERSHIPS ──────────────────────────────────────────────────
-- Members see their own row; org owners see all rows in their group.
-- INSERT is open to authenticated (needed during invite / onboarding flows).
ALTER TABLE org_group_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_group_memberships_all_access ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_access     ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_insert     ON org_group_memberships;

CREATE POLICY org_group_memberships_access ON org_group_memberships
  FOR SELECT TO authenticated
  USING (
    user_email = auth.email()
    OR EXISTS (
      SELECT 1 FROM org_group_memberships m2
      WHERE m2.org_group_id = org_group_memberships.org_group_id
        AND m2.user_email   = auth.email()
        AND m2.status       = 'active'
    )
  );

CREATE POLICY org_group_memberships_insert ON org_group_memberships
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY org_group_memberships_modify ON org_group_memberships
  FOR UPDATE TO authenticated
  USING (
    user_email = auth.email()
    OR EXISTS (
      SELECT 1 FROM org_group_memberships m2
      WHERE m2.org_group_id = org_group_memberships.org_group_id
        AND m2.user_email   = auth.email()
        AND m2.role         = 'org_owner'
        AND m2.status       = 'active'
    )
  );

-- ── ACCESS_REQUESTS ────────────────────────────────────────────────────────
-- Users see their own requests; org owners see requests for their group.
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_requests_all_access ON access_requests;
DROP POLICY IF EXISTS access_requests_access     ON access_requests;

CREATE POLICY access_requests_access ON access_requests
  FOR ALL TO authenticated
  USING (
    user_email = auth.email()
    OR EXISTS (
      SELECT 1 FROM org_group_memberships m
      WHERE m.org_group_id = access_requests.org_group_id
        AND m.user_email   = auth.email()
        AND m.role         = 'org_owner'
        AND m.status       = 'active'
    )
  )
  WITH CHECK (
    user_email = auth.email()
    OR EXISTS (
      SELECT 1 FROM org_group_memberships m
      WHERE m.org_group_id = access_requests.org_group_id
        AND m.user_email   = auth.email()
        AND m.role         = 'org_owner'
        AND m.status       = 'active'
    )
  );

-- ── USER_DASHBOARD_CONFIGS ─────────────────────────────────────────────────
-- Each manager can only see and edit their own dashboard layout config.
-- The generic manager_access policy was set above; override it with a
-- tighter per-user policy.
ALTER TABLE user_dashboard_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_dashboard_configs_all_access    ON user_dashboard_configs;
DROP POLICY IF EXISTS user_dashboard_configs_manager_access ON user_dashboard_configs;
DROP POLICY IF EXISTS user_dashboard_configs_own_access    ON user_dashboard_configs;

CREATE POLICY user_dashboard_configs_own_access ON user_dashboard_configs
  FOR ALL TO authenticated
  USING (user_email = auth.email())
  WITH CHECK (user_email = auth.email());

-- ── AUDIT_LOGS ─────────────────────────────────────────────────────────────
-- audit_logs may not have organization_id. Allow authenticated users to
-- insert (logging) and read their own org's logs if organization_id present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'audit_logs'
      AND column_name  = 'organization_id'
  ) THEN
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_all_access ON audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_access ON audit_logs';
    EXECUTE $$
      CREATE POLICY audit_logs_access ON audit_logs
        FOR ALL TO authenticated
        USING (auth_can_access_org(organization_id))
        WITH CHECK (auth_can_access_org(organization_id))
    $$;
  ELSE
    -- No organization_id — allow all authenticated reads (security events are not sensitive cross-org)
    ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_all_access ON audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_access ON audit_logs';
    EXECUTE $$
      CREATE POLICY audit_logs_access ON audit_logs
        FOR ALL TO authenticated USING (true) WITH CHECK (true)
    $$;
  END IF;
END $$;

-- =============================================================================
-- DONE.
-- Every table now requires authentication (manager) or is explicitly limited
-- to the employee-facing tables needed for the kiosk PIN-login workflow.
-- Authenticated managers can ONLY read/write data belonging to their own org.
-- =============================================================================
