-- =============================================================================
-- ReadyNorm — Migration 010: Fix org_group_memberships RLS + backfill owner rows
--
-- PROBLEM:
--   The org_group_memberships SELECT policy requires the user to already have
--   a row in the table to see any rows. This creates a chicken-and-egg:
--
--     User has no membership row
--       → RLS: can't see any rows
--         → UI shows "0 managers / Only owners can manage members"
--           → auto-repair can't tell if a row already exists (sees empty array)
--             → may insert duplicate or silently fail on unique constraint
--
-- FIX:
--   1. Add a third OR condition to SELECT + UPDATE policies:
--      if the user's email matches organization_groups.owner_email for this
--      group's id, they may see/update ALL rows in that group — no existing
--      row required.
--   2. Backfill one missing org_owner row for every org group whose
--      owner_email has no active membership row yet.
-- =============================================================================

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
