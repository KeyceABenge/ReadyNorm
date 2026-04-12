/**
 * fetchExecutiveData — Supabase Edge Function
 *
 * Fetches multi-site executive dashboard data in a single backend call.
 * This avoids frontend rate limits by making all DB queries server-side
 * using the service_role key.
 *
 * Request body: { siteCode: string }
 * Response: {
 *   currentOrg, orgGroup, orgGroupSites,
 *   rawData: { tasks, capas, auditFindings, empSamples, empSites,
 *              pestFindings, pestEscalationMarkers, complaints, risks, areaSignOffs },
 *   _meta: { fetchedAt, failures }
 * }
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate caller
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const callerEmail = authUser.email!;

    // Parse request
    const { siteCode } = await req.json();
    if (!siteCode) {
      return jsonResponse({ error: 'siteCode is required' }, 400);
    }

    console.log('[fetchExecutiveData] callerEmail:', callerEmail, '| siteCode:', siteCode);

    // ── 1. Resolve the current organization from siteCode ──────────────────
    const { data: orgRows } = await supabase
      .from('organizations')
      .select('*')
      .eq('site_code', siteCode)
      .limit(1);

    const currentOrg = orgRows?.[0] || null;
    if (!currentOrg) {
      return jsonResponse({ error: `No organization found for siteCode "${siteCode}"` }, 404);
    }

    // ── 2. Authorization check ─────────────────────────────────────────────
    const isOrgCreator = !!currentOrg.created_by &&
      currentOrg.created_by.toLowerCase() === callerEmail.toLowerCase();

    let isOrgMember = false;
    let orgGroup: any = null;

    if (currentOrg.org_group_id) {
      // Get the org group
      const { data: groupRows } = await supabase
        .from('organization_groups')
        .select('*')
        .eq('id', currentOrg.org_group_id)
        .limit(1);
      orgGroup = groupRows?.[0] || null;

      // Check membership
      if (!isOrgCreator) {
        const { data: memberships } = await supabase
          .from('org_group_memberships')
          .select('role')
          .eq('org_group_id', currentOrg.org_group_id)
          .filter('user_email', 'ilike', callerEmail)
          .eq('status', 'active');
        isOrgMember = (memberships || []).some((m: any) =>
          ['org_owner', 'org_manager', 'site_manager'].includes(m.role)
        );
      }
    }

    // Fallback: check if caller owns any org group
    let isOrgGroupOwner = false;
    if (!isOrgCreator && !isOrgMember) {
      const { data: ownedGroups } = await supabase
        .from('organization_groups')
        .select('id')
        .filter('owner_email', 'ilike', callerEmail);
      isOrgGroupOwner = (ownedGroups || []).length > 0;

      // If they own a group but we don't have the orgGroup yet, fetch it
      if (isOrgGroupOwner && !orgGroup && ownedGroups?.[0]) {
        const { data: groupRows } = await supabase
          .from('organization_groups')
          .select('*')
          .eq('id', ownedGroups[0].id)
          .limit(1);
        orgGroup = groupRows?.[0] || null;
      }
    }

    if (!isOrgCreator && !isOrgMember && !isOrgGroupOwner) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // ── 3. Get all sites in the org group ──────────────────────────────────
    let orgGroupSites: any[] = [currentOrg];
    if (orgGroup) {
      const { data: sites } = await supabase
        .from('organizations')
        .select('*')
        .eq('org_group_id', orgGroup.id);
      if (sites && sites.length > 0) {
        orgGroupSites = sites;
      }
    }

    const orgIds = orgGroupSites.map(s => s.id);
    console.log('[fetchExecutiveData] Fetching data for', orgIds.length, 'sites');

    // ── 4. Fetch all entity data in parallel ───────────────────────────────
    const failures: Array<{ entity: string; error: string }> = [];

    async function fetchEntity(entityName: string, table: string, columns = '*', limit = 2000) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select(columns)
          .in('organization_id', orgIds)
          .limit(limit);
        if (error) throw error;
        // Tag each row with _org_id so frontend can filter per-site
        return (data || []).map((row: any) => ({ ...row, _org_id: row.organization_id }));
      } catch (e: any) {
        console.error(`[fetchExecutiveData] Failed to fetch ${entityName}:`, e.message);
        failures.push({ entity: entityName, error: e.message });
        return [];
      }
    }

    const [
      tasks,
      capas,
      auditFindings,
      empSamples,
      empSites,
      pestFindings,
      pestEscalationMarkers,
      complaints,
      risks,
      areaSignOffs,
    ] = await Promise.all([
      fetchEntity('tasks', 'tasks'),
      fetchEntity('capas', 'capas'),
      fetchEntity('auditFindings', 'audit_findings'),
      fetchEntity('empSamples', 'emp_samples'),
      fetchEntity('empSites', 'emp_sites'),
      fetchEntity('pestFindings', 'pest_findings'),
      fetchEntity('pestEscalationMarkers', 'pest_escalation_markers'),
      fetchEntity('complaints', 'customer_complaints'),
      fetchEntity('risks', 'risk_entries'),
      fetchEntity('areaSignOffs', 'area_sign_offs'),
    ]);

    console.log('[fetchExecutiveData] Done. Tasks:', tasks.length,
      '| CAPAs:', capas.length,
      '| AuditFindings:', auditFindings.length,
      '| Failures:', failures.length);

    return jsonResponse({
      currentOrg,
      orgGroup,
      orgGroupSites,
      rawData: {
        tasks,
        capas,
        auditFindings,
        empSamples,
        empSites,
        pestFindings,
        pestEscalationMarkers,
        complaints,
        risks,
        areaSignOffs,
      },
      _meta: {
        fetchedAt: new Date().toISOString(),
        siteCount: orgGroupSites.length,
        failures,
      },
    });
  } catch (e: any) {
    console.error('[fetchExecutiveData] Unhandled error:', e);
    return jsonResponse({ error: e.message || 'Internal server error' }, 500);
  }
});
