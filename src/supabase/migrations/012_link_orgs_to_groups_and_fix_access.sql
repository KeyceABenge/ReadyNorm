-- =============================================================================
-- ReadyNorm — Migration 012: Re-link orgs to groups + fix access_requests RLS
--
-- ROOT CAUSE:
--   Migration 007 tried to backfill organizations.org_group_id from
--   org_group_memberships, but NO membership rows existed at that time.
--   Migration 010 later created the membership rows — but didn't re-run
--   the org_group_id backfill. Result: organizations.org_group_id = NULL.
--   Every org_group_id-based RLS check (migrations 010, 011) then fails,
--   and the migration 011 backfill INSERT skips all rows.
--
-- FIX:
--   1. Re-run the org_group_id backfill now that membership rows exist.
--   2. Set organizations.created_by = owner_email where created_by is null,
--      so auth_can_access_org() Check 1 works as a simple fallback.
--   3. Add a created_by-based check to access_requests RLS that does NOT
--      require org_group_id to be set.
--   4. Re-run the migration 011 backfill (now org_group_id is set).
-- =============================================================================

-- ── 1. Re-run org_group_id backfill (now memberships exist from mig-010) ─────
-- Match organizations to org groups via owner membership rows.
UPDATE organizations o
SET org_group_id = m.org_group_id::uuid
FROM org_group_memberships m
WHERE m.user_email = o.created_by
  AND m.role = 'org_owner'
  AND m.status = 'active'
  AND o.org_group_id IS NULL
  AND m.org_group_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Fallback: match by org_owner who has no other org linked yet.
UPDATE organizations o
SET org_group_id = m.org_group_id::uuid
FROM org_group_memberships m
WHERE m.role = 'org_owner'
  AND m.status = 'active'
  AND o.org_group_id IS NULL
  AND m.org_group_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND NOT EXISTS (
    SELECT 1 FROM organizations o2
    WHERE o2.org_group_id = m.org_group_id::uuid
      AND o2.id <> o.id
  );

-- ── 2. Backfill organizations.created_by from org group owner_email ───────────
-- Where created_by is null (orgs created via OrgSitesList before this fix),
-- set it from the org group owner. This makes auth_can_access_org() Check 1
-- work without needing org_group_id.
UPDATE organizations o
SET created_by = og.owner_email
FROM organization_groups og
WHERE o.org_group_id::text = og.id::text
  AND o.created_by IS NULL
  AND og.owner_email IS NOT NULL;

-- ── 3. Patch access_requests RLS — add created_by-based check ────────────────
-- This check works even when org_group_id is still null (before step 1 fixes it).
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_requests_all_access ON access_requests;
DROP POLICY IF EXISTS access_requests_access     ON access_requests;

CREATE POLICY access_requests_access ON access_requests
  FOR ALL TO authenticated
  USING (
    -- Own request
    LOWER(requester_email) = LOWER(auth.email())
    -- Standard check (covers created_by match + membership row)
    OR auth_can_access_org(organization_id)
    -- Direct created_by check (no org_group_id needed)
    OR LOWER(auth.email()) IN (
      SELECT LOWER(created_by) FROM organizations
      WHERE id::text = access_requests.organization_id::text
        AND created_by IS NOT NULL
    )
    -- Org group owner check via org_group_id (works after step 1)
    OR EXISTS (
      SELECT 1 FROM organization_groups og
      WHERE LOWER(og.owner_email) = LOWER(auth.email())
        AND og.id::text IN (
          SELECT org_group_id::text FROM organizations
          WHERE id::text = access_requests.organization_id::text
            AND org_group_id IS NOT NULL
        )
    )
    -- Active manager member check
    OR EXISTS (
      SELECT 1 FROM org_group_memberships m
      WHERE LOWER(m.user_email) = LOWER(auth.email())
        AND m.status = 'active'
        AND m.role IN ('org_owner', 'org_manager', 'site_manager')
        AND m.org_group_id::text IN (
          SELECT org_group_id::text FROM organizations
          WHERE id::text = access_requests.organization_id::text
            AND org_group_id IS NOT NULL
        )
    )
  )
  WITH CHECK (
    LOWER(requester_email) = LOWER(auth.email())
    OR auth_can_access_org(organization_id)
    OR LOWER(auth.email()) IN (
      SELECT LOWER(created_by) FROM organizations
      WHERE id::text = access_requests.organization_id::text
        AND created_by IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM organization_groups og
      WHERE LOWER(og.owner_email) = LOWER(auth.email())
        AND og.id::text IN (
          SELECT org_group_id::text FROM organizations
          WHERE id::text = access_requests.organization_id::text
            AND org_group_id IS NOT NULL
        )
    )
    OR EXISTS (
      SELECT 1 FROM org_group_memberships m
      WHERE LOWER(m.user_email) = LOWER(auth.email())
        AND m.status = 'active'
        AND m.role IN ('org_owner', 'org_manager', 'site_manager')
        AND m.org_group_id::text IN (
          SELECT org_group_id::text FROM organizations
          WHERE id::text = access_requests.organization_id::text
            AND org_group_id IS NOT NULL
        )
    )
  );

-- ── 4. Re-run approved-requests backfill (now org_group_id is set) ───────────
INSERT INTO org_group_memberships
  (org_group_id, user_email, user_name, role, site_access_type, status)
SELECT
  o.org_group_id::text,
  ar.requester_email,
  COALESCE(ar.requester_name, split_part(ar.requester_email, '@', 1)),
  CASE
    WHEN ar.requested_role = 'manager' THEN 'org_manager'
    WHEN ar.requested_role IS NOT NULL  THEN ar.requested_role
    ELSE 'org_manager'
  END,
  'all',
  'active'
FROM access_requests ar,
     organizations o
WHERE o.id::text = ar.organization_id::text
  AND ar.status = 'approved'
  AND ar.requester_email IS NOT NULL
  AND o.org_group_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_group_memberships m
    WHERE m.org_group_id::text = o.org_group_id::text
      AND LOWER(m.user_email)  = LOWER(ar.requester_email)
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE.
-- =============================================================================
