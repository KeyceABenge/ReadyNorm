-- =============================================================================
-- ReadyNorm — Migration 011: Backfill approved access requests as org members
--             + directly patch access_requests RLS
--
-- Type-safe version: all cross-table comparisons cast BOTH sides to ::text
-- to avoid "operator does not exist: text = uuid" regardless of whether
-- org_group_memberships.org_group_id is TEXT or UUID in the actual database.
-- =============================================================================

-- ── 1. Patch access_requests RLS — add direct org-owner + manager check ──────
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_requests_all_access ON access_requests;
DROP POLICY IF EXISTS access_requests_access     ON access_requests;

CREATE POLICY access_requests_access ON access_requests
  FOR ALL TO authenticated
  USING (
    -- Own requests are always visible
    LOWER(requester_email) = LOWER(auth.email())
    -- Standard org-access check (created_by + membership)
    OR auth_can_access_org(organization_id)
    -- Direct org-group owner check (no membership row required)
    OR EXISTS (
      SELECT 1
      FROM organizations o
      JOIN organization_groups og ON og.id = o.org_group_id
      WHERE o.id::text = access_requests.organization_id::text
        AND LOWER(og.owner_email) = LOWER(auth.email())
    )
    -- Active org-manager members of the group that owns this org
    OR EXISTS (
      SELECT 1
      FROM organizations o
      JOIN org_group_memberships m ON m.org_group_id::text = o.org_group_id::text
      WHERE o.id::text           = access_requests.organization_id::text
        AND LOWER(m.user_email)  = LOWER(auth.email())
        AND m.status             = 'active'
        AND m.role              IN ('org_owner', 'org_manager', 'site_manager')
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
      JOIN org_group_memberships m ON m.org_group_id::text = o.org_group_id::text
      WHERE o.id::text           = access_requests.organization_id::text
        AND LOWER(m.user_email)  = LOWER(auth.email())
        AND m.status             = 'active'
        AND m.role              IN ('org_owner', 'org_manager', 'site_manager')
    )
  );

-- ── 2. Backfill org_group_memberships for approved access requests ───────────
-- Creates membership rows for all previously-approved requests so users show
-- up in CurrentAccountsPanel via the reliable memberships query path.
-- NOT EXISTS guard prevents duplicates; ON CONFLICT is a safety net.
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
FROM access_requests ar
JOIN organizations o ON o.id::text = ar.organization_id::text
WHERE ar.status = 'approved'
  AND ar.requester_email IS NOT NULL
  AND o.org_group_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_group_memberships m
    WHERE m.org_group_id::text     = o.org_group_id::text
      AND LOWER(m.user_email) = LOWER(ar.requester_email)
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE.
-- =============================================================================

