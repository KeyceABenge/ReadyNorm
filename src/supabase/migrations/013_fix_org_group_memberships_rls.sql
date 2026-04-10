-- =============================================================================
-- ReadyNorm — Migration 013: Fix org_group_memberships infinite recursion (42P17)
--
-- ROOT CAUSE:
--   Migration 010's SELECT policy for org_group_memberships has a self-referential
--   subquery:
--
--     OR EXISTS (
--       SELECT 1 FROM org_group_memberships m2   ← queries itself!
--       WHERE m2.org_group_id = org_group_memberships.org_group_id
--         AND m2.user_email   = auth.email()
--         AND m2.status       = 'active'
--     )
--
--   PostgreSQL can handle direct self-references in a policy when the table is
--   queried at the top level. BUT when org_group_memberships is accessed as a
--   SUBQUERY inside another table's RLS policy (e.g., access_requests from
--   migration 012), Postgres cannot exempt the nested self-reference from the
--   same policy check → 42P17 infinite recursion.
--
--   Symptom: ANY query on access_requests returns
--     "infinite recursion detected in policy for relation org_group_memberships"
--
-- FIX:
--   Replace the self-referential policy with a simpler version that uses
--   organization_groups instead (which has USING(true) — always readable,
--   never recursive). The org group owner can still see all membership rows.
-- =============================================================================

ALTER TABLE org_group_memberships ENABLE ROW LEVEL SECURITY;

-- Drop all old policies created by migrations 010 and any prior versions
DROP POLICY IF EXISTS org_group_memberships_access  ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_modify  ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_select  ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_insert  ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_update  ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_delete  ON org_group_memberships;

-- Single FOR ALL policy. No self-reference: uses organization_groups (USING(true)).
--
-- Grants access when:
--   1. The row belongs to the authenticated user (their own membership)
--   2. The authenticated user is the owner of the org group this row belongs to
--      (checked via organization_groups, which has no RLS restrictions)
CREATE POLICY org_group_memberships_access ON org_group_memberships
  FOR ALL TO authenticated
  USING (
    LOWER(user_email) = LOWER(auth.email())
    OR LOWER(auth.email()) IN (
      SELECT LOWER(owner_email)
      FROM organization_groups
      WHERE id::text = org_group_memberships.org_group_id
    )
  )
  WITH CHECK (
    LOWER(user_email) = LOWER(auth.email())
    OR LOWER(auth.email()) IN (
      SELECT LOWER(owner_email)
      FROM organization_groups
      WHERE id::text = org_group_memberships.org_group_id
    )
  );

-- =============================================================================
-- DONE.
-- org_group owners can see and manage all membership rows for their groups.
-- Members can see and manage their own rows.
-- No self-reference → no 42P17 infinite recursion when accessed from subqueries.
-- =============================================================================
