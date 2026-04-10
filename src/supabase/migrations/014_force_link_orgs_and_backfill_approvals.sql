-- =============================================================================
-- ReadyNorm — Migration 014: Fix recursion + backfill blocked approvals
--
-- WHY THIS IS NEEDED:
--   The infinite recursion in org_group_memberships policy (fixed by migration
--   013) blocked ALL write operations on access_requests — including the
--   "Approve" button click. Any approval attempted while that recursion was
--   active would have thrown a 42P17 error and ROLLED BACK the status update.
--   Result: access_requests rows for approved users may still say "pending",
--   and no org_group_membership rows were ever created for them.
--
--   IMPORTANT TYPE NOTE:
--   organization_groups.id is a TEXT Base44/hex ObjectId (24-char hex string).
--   organizations.org_group_id is a UUID column.
--   These types are INCOMPATIBLE — you cannot cast a Base44 ID to UUID.
--   Therefore we NEVER try to SET org_group_id = og.id::uuid.
--   Instead, we find the org_group via the owner's existing membership row
--   (org_group_memberships.org_group_id is TEXT and matches org_group.id).
--
-- STEPS:
--   1. Re-apply migration 013's recursion fix (idempotent).
--   2. Backfill organizations.created_by where null, using org group owner
--      found via the owner's membership row (TEXT-safe, no UUID cast).
--   3. Force-set status='approved' on access_requests that were reviewed
--      (reviewed_at IS NOT NULL, reviewed_by IS NOT NULL) but are NOT denied.
--   4. Backfill org_group_membership rows for every approved access request,
--      finding org_group_id via the owner's existing membership row.
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

-- ── 2. Backfill organizations.created_by where null ──────────────────────────
-- Find the owner via their 'org_owner' membership row (TEXT-safe).
-- We do NOT touch org_group_id (UUID vs TEXT incompatibility — see note above).
UPDATE organizations o
SET created_by = og.owner_email
FROM organization_groups og
JOIN org_group_memberships m ON m.org_group_id = og.id::text
  AND m.role = 'org_owner'
  AND m.status = 'active'
WHERE o.created_by IS NULL
  AND og.owner_email IS NOT NULL
  -- Link via the membership's allowed_site_ids if this org is listed there
  AND (
    m.site_access_type = 'all'
    OR (m.site_access_type = 'selected' AND o.id::text = ANY(m.allowed_site_ids::text[]))
  );

-- ── 3. Force-approve reviewed access requests ─────────────────────────────────
-- Any row where reviewed_at and reviewed_by are set but status is NOT 'denied'
-- was blocked by the 42P17 recursion during the UI Approve click.
UPDATE access_requests
SET status = 'approved'
WHERE reviewed_at IS NOT NULL
  AND reviewed_by IS NOT NULL
  AND status NOT IN ('approved', 'denied');

-- ── 4. Backfill org_group_membership rows for every approved access request ───
-- Find the org_group via the org owner's existing membership row (TEXT-safe).
-- This avoids the UUID/TEXT cast error entirely.
INSERT INTO org_group_memberships
  (org_group_id, user_email, user_name, role, site_access_type, status)
SELECT DISTINCT ON (m_owner.org_group_id, ar.requester_email)
  m_owner.org_group_id,
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
JOIN organizations o
  ON o.id::text = ar.organization_id::text
JOIN org_group_memberships m_owner
  ON LOWER(m_owner.user_email) = LOWER(o.created_by)
  AND m_owner.role = 'org_owner'
  AND m_owner.status = 'active'
WHERE ar.status = 'approved'
  AND ar.requester_email IS NOT NULL
  AND o.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM org_group_memberships existing
    WHERE existing.org_group_id = m_owner.org_group_id
      AND LOWER(existing.user_email) = LOWER(ar.requester_email)
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE.
-- After running this migration:
--   - The infinite recursion is gone (step 1)
--   - organizations.created_by is backfilled where possible (step 2)
--   - Access requests blocked by the recursion bug are now approved (step 3)
--   - Membership rows exist for all approved users (step 4)
-- =============================================================================

