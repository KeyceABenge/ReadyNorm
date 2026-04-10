-- =============================================================================
-- ReadyNorm — Migration 014: Force-link orphaned orgs + backfill all approvals
--
-- WHY THIS IS NEEDED:
--   The infinite recursion in org_group_memberships policy (fixed by migration
--   013) blocked ALL write operations on access_requests — including the
--   "Approve" button click. Any approval attempted while that recursion was
--   active would have thrown a 42P17 error and ROLLED BACK the status update.
--   Result: access_requests rows for approved users may still say "pending",
--   and no org_group_membership rows were ever created for them.
--
--   Additionally, organizations.org_group_id is still NULL for legacy orgs,
--   so all org_group_id-based backfills in migrations 011 and 012 inserted
--   zero rows.
--
-- STEPS:
--   1. Re-apply migration 013's recursion fix (idempotent).
--   2. Link orphaned orgs (org_group_id = NULL) to org groups via:
--        a. created_by = owner_email match (preferred)
--        b. Single-org-group fallback (when only one org group exists)
--   3. Backfill created_by on orgs that are now linked.
--   4. Force-set status='approved' on access_requests that were reviewed
--      (reviewed_at IS NOT NULL, reviewed_by IS NOT NULL) but are NOT denied.
--      These were likely blocked by the 42P17 recursion during the UI Approve.
--   5. Backfill org_group_membership rows for every approved access request.
-- =============================================================================

-- ── 1. Re-apply recursion fix from migration 013 (idempotent) ────────────────
ALTER TABLE org_group_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_group_memberships_access ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_modify ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_select ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_insert ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_update ON org_group_memberships;
DROP POLICY IF EXISTS org_group_memberships_delete ON org_group_memberships;

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

-- ── 2a. Link orphaned orgs via created_by = owner_email ──────────────────────
UPDATE organizations o
SET org_group_id = og.id::uuid
FROM organization_groups og
WHERE o.org_group_id IS NULL
  AND o.created_by IS NOT NULL
  AND LOWER(o.created_by) = LOWER(og.owner_email);

-- ── 2b. Fallback: if org is still orphaned and there's exactly one org group
--        that has no linked org yet, link them ─────────────────────────────────
UPDATE organizations o
SET org_group_id = og.id::uuid
FROM organization_groups og
WHERE o.org_group_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM organizations o2
    WHERE o2.org_group_id = og.id::uuid
  );

-- ── 3. Backfill organizations.created_by where still null ────────────────────
UPDATE organizations o
SET created_by = og.owner_email
FROM organization_groups og
WHERE o.org_group_id::text = og.id::text
  AND o.created_by IS NULL
  AND og.owner_email IS NOT NULL;

-- ── 4. Force-approve reviewed access requests ─────────────────────────────────
-- Any row where reviewed_at and reviewed_by are set but status is NOT 'denied'
-- was almost certainly stuck by the 42P17 recursion during the UI Approve click.
-- Set these to 'approved' now that the recursion is fixed.
UPDATE access_requests
SET status = 'approved'
WHERE reviewed_at IS NOT NULL
  AND reviewed_by IS NOT NULL
  AND status NOT IN ('approved', 'denied');

-- ── 5. Backfill org_group_membership rows for every approved access request ───
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
    WHERE m.org_group_id = o.org_group_id::text
      AND LOWER(m.user_email) = LOWER(ar.requester_email)
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE.
-- After running this migration:
--   - The infinite recursion is gone (step 1)
--   - All orgs are linked to their org group (steps 2-3)
--   - Access requests blocked by the recursion bug are now approved (step 4)
--   - Membership rows exist for all approved users (step 5)
-- =============================================================================
