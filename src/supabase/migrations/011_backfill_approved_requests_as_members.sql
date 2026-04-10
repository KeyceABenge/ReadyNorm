-- =============================================================================
-- ReadyNorm — Migration 011: Backfill approved access requests as org members
--             + directly patch access_requests RLS
--
-- PROBLEM:
--   When an access request is approved via AccessRequestsPanel, only the
--   access_requests.status field is set to "approved". No org_group_memberships
--   row is created. Therefore, approved users only appear in CurrentAccountsPanel
--   via the access_requests query path.
--
--   The access_requests RLS policy uses auth_can_access_org(), which (before
--   migration 010) required a membership row. Even after migration 010 patched
--   auth_can_access_org, the policy may not cover all cases (e.g., case-
--   sensitive email comparison in created_by check, null org_group_id, etc.).
--
-- FIX:
--   1. Directly patch the access_requests SELECT policy to add an explicit
--      org-group-owner check that does NOT go through auth_can_access_org.
--      Uses case-insensitive email comparison and handles both UUID and TEXT
--      organization_id column types.
--   2. Backfill org_group_memberships rows for all existing approved access
--      requests that don't already have a membership row. This makes them
--      visible via the reliable org_group_memberships query path (which works
--      after migration 010) and gives them proper RLS access to org data.
-- =============================================================================

-- ── 1. Patch access_requests RLS — add direct org-owner check ────────────────
-- Drop and recreate with an additional OR clause that directly checks
-- organization_groups.owner_email without relying on auth_can_access_org().
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_requests_all_access ON access_requests;
DROP POLICY IF EXISTS access_requests_access     ON access_requests;

CREATE POLICY access_requests_access ON access_requests
  FOR ALL TO authenticated
  USING (
    -- Own requests always visible
    LOWER(requester_email) = LOWER(auth.email())
    -- Standard org-access check (covers created_by + membership)
    OR auth_can_access_org(organization_id)
    -- Direct org-group owner check — bypasses auth_can_access_org for reliability.
    -- Handles cases where created_by is null or stored with different casing,
    -- and where the owner has no membership row yet.
    OR EXISTS (
      SELECT 1
      FROM organizations o
      JOIN organization_groups og ON og.id = o.org_group_id
      WHERE o.id::text = access_requests.organization_id::text
        AND LOWER(og.owner_email) = LOWER(auth.email())
    )
    -- Also allow org_manager members of the group that owns this org
    OR EXISTS (
      SELECT 1
      FROM organizations o
      JOIN org_group_memberships m ON m.org_group_id = o.org_group_id::text
      WHERE o.id::text        = access_requests.organization_id::text
        AND LOWER(m.user_email) = LOWER(auth.email())
        AND m.status          = 'active'
        AND m.role            IN ('org_owner', 'org_manager', 'site_manager')
    )
  )
  WITH CHECK (
    LOWER(requester_email) = LOWER(auth.email())
    OR auth_can_access_org(organization_id)
    OR EXISTS (
      SELECT 1
      FROM organizations o
      JOIN organization_groups og ON og.id = o.org_group_id
      WHERE o.id::text = access_requests.organization_id::text
        AND LOWER(og.owner_email) = LOWER(auth.email())
    )
    OR EXISTS (
      SELECT 1
      FROM organizations o
      JOIN org_group_memberships m ON m.org_group_id = o.org_group_id::text
      WHERE o.id::text        = access_requests.organization_id::text
        AND LOWER(m.user_email) = LOWER(auth.email())
        AND m.status          = 'active'
        AND m.role            IN ('org_owner', 'org_manager', 'site_manager')
    )
  );

-- ── 2. Backfill org_group_memberships for approved access requests ───────────
-- For every approved access request where the requester does NOT yet have
-- an org_group_memberships row, create one. This makes them visible via
-- the reliable memberships query in CurrentAccountsPanel and gives them
-- proper RLS access to org-scoped data.
INSERT INTO org_group_memberships
  (org_group_id, user_email, user_name, role, site_access_type, status)
SELECT DISTINCT ON (o.org_group_id, ar.requester_email)
  o.org_group_id::text,
  ar.requester_email,
  COALESCE(ar.requester_name, split_part(ar.requester_email, '@', 1)),
  CASE
    WHEN ar.requested_role = 'manager' THEN 'org_manager'
    WHEN ar.requested_role IS NOT NULL THEN ar.requested_role
    ELSE 'org_manager'
  END,
  'all',
  'active'
FROM access_requests ar
JOIN organizations o ON o.id::text = ar.organization_id::text
WHERE ar.status = 'approved'
  AND ar.requester_email IS NOT NULL
  AND o.org_group_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_group_memberships m
    WHERE m.org_group_id      = o.org_group_id::text
      AND LOWER(m.user_email) = LOWER(ar.requester_email)
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE.
-- 1. access_requests is now readable by org group owners and managers directly,
--    without relying solely on auth_can_access_org().
-- 2. All previously approved access request users now have org_group_memberships
--    rows, making them visible in CurrentAccountsPanel and giving them proper
--    RLS access to org-scoped tables.
-- =============================================================================
