-- =============================================================================
-- ReadyNorm — Migration 010: Fix org_group_memberships RLS + backfill owner rows
--
-- PROBLEM 1 (chicken-and-egg):
--   The org_group_memberships SELECT policy requires the user to already have
--   a row in the table to see any rows:
--
--     User has no membership row
--       → RLS: can't see any rows
--         → UI shows "0 managers / Only owners can manage members"
--
-- PROBLEM 2 (auth_can_access_org missing org-group owner path):
--   auth_can_access_org() checks:
--     (a) organizations.created_by = auth.email()  ← only works if created_by was set
--     (b) org_group_memberships row                ← requires a row to exist
--   Sites created via OrgSitesList don't set created_by. Owners created before
--   membership tracking have no row. Both checks fail → owner can't read
--   access_requests, employees, etc. via RLS.
--
-- FIX:
--   0. Patch auth_can_access_org to add a third check:
--      org group owner_email = auth.email() (no membership row required).
--   1. Add a third OR condition to SELECT + UPDATE policies on
--      org_group_memberships: if the user's email matches
--      organization_groups.owner_email, grant access — no row required.
--   2. Backfill one missing org_owner row for every org group whose
--      owner_email has no active membership row yet.
-- =============================================================================

-- ── 0. Patch auth_can_access_org — add org-group owner path ─────────────────
-- This fixes RLS on access_requests, employees, tasks, and ALL org-scoped
-- tables for owners whose org was created without setting created_by.
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
  IF auth.role() = 'service_role' THEN RETURN true; END IF;
  IF auth.role() != 'authenticated' THEN RETURN false; END IF;

  BEGIN
    v_uuid := p_org_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  -- Check 1: user created this org (email stored in created_by)
  SELECT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = v_uuid AND created_by = auth.email()
  ) INTO v_result;
  IF v_result THEN RETURN true; END IF;

  -- Check 2: user is an active member of the org_group that owns this org
  BEGIN
    EXECUTE $dyn$
      SELECT EXISTS (
        SELECT 1
        FROM org_group_memberships m
        JOIN organizations o ON o.org_group_id::text = m.org_group_id
        WHERE o.id         = $1
          AND m.user_email = $2
          AND m.status     = 'active'
      )
    $dyn$ USING v_uuid, auth.email() INTO v_result;
  EXCEPTION WHEN OTHERS THEN
    v_result := false;
  END;
  IF v_result THEN RETURN true; END IF;

  -- Check 3 (NEW): user is the owner of the org_group that owns this org.
  -- Works even when created_by is null/UUID and no membership row exists yet.
  SELECT EXISTS (
    SELECT 1
    FROM organizations o
    JOIN organization_groups og ON og.id = o.org_group_id
    WHERE o.id = v_uuid
      AND LOWER(og.owner_email) = LOWER(auth.email())
  ) INTO v_result;

  RETURN COALESCE(v_result, false);
END;
$$;

-- Recreate the UUID overload to call the patched text version
CREATE OR REPLACE FUNCTION auth_can_access_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth_can_access_org(p_org_id::text);
$$;

-- ── 1. Fix SELECT policy (chicken-and-egg) ───────────────────────────────────
ALTER TABLE org_group_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_group_memberships_access ON org_group_memberships;

CREATE POLICY org_group_memberships_access ON org_group_memberships
  FOR SELECT TO authenticated
  USING (
    -- Can always see your own rows
    user_email = auth.email()
    -- OR: already an active member of the same group
    OR EXISTS (
      SELECT 1 FROM org_group_memberships m2
      WHERE m2.org_group_id = org_group_memberships.org_group_id
        AND m2.user_email   = auth.email()
        AND m2.status       = 'active'
    )
    -- OR: you are the owner of this org group (no membership row required)
    OR EXISTS (
      SELECT 1 FROM organization_groups og
      WHERE og.id::text    = org_group_memberships.org_group_id
        AND og.owner_email = auth.email()
    )
  );

-- ── 2. Fix UPDATE policy (same chicken-and-egg) ──────────────────────────────
DROP POLICY IF EXISTS org_group_memberships_modify ON org_group_memberships;

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
    OR EXISTS (
      SELECT 1 FROM organization_groups og
      WHERE og.id::text    = org_group_memberships.org_group_id
        AND og.owner_email = auth.email()
    )
  );

-- ── 3. Backfill missing owner rows ───────────────────────────────────────────
-- For every org group whose owner_email has no active membership row, create one.
-- ON CONFLICT DO NOTHING guards against re-running this migration.
INSERT INTO org_group_memberships
  (org_group_id, user_email, user_name, role, site_access_type, status)
SELECT
  og.id::text,
  og.owner_email,
  COALESCE(og.owner_name, split_part(og.owner_email, '@', 1)),
  'org_owner',
  'all',
  'active'
FROM organization_groups og
WHERE og.owner_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_group_memberships m
    WHERE m.org_group_id      = og.id::text
      AND LOWER(m.user_email) = LOWER(og.owner_email)
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE.
-- org_group owners can now see + manage membership rows even before their own
-- row exists. All owners also now have a membership row so RLS, listOrgUsers,
-- and the OrgMembersList UI all display correctly.
-- =============================================================================
