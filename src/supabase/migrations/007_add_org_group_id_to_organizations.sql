-- Add org_group_id column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS org_group_id UUID REFERENCES organization_groups(id) ON DELETE SET NULL;

-- Auto-link existing organizations to their org group
-- Matches via org_group_memberships where the member email matches the org's created_by field
UPDATE organizations o
SET org_group_id = m.org_group_id::uuid
FROM org_group_memberships m
WHERE m.user_email = o.created_by
  AND m.role = 'org_owner'
  AND m.status = 'active'
  AND o.org_group_id IS NULL;

-- Fallback: also try matching via site_settings or any admin user tied to the org
-- (catches orgs where created_by may differ from the org owner email)
UPDATE organizations o
SET org_group_id = m.org_group_id::uuid
FROM org_group_memberships m
WHERE m.status = 'active'
  AND m.role = 'org_owner'
  AND o.org_group_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM organizations o2
    WHERE o2.org_group_id = m.org_group_id::uuid
  );
