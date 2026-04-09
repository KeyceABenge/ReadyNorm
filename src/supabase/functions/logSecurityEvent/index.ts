import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('User')
      .select('*')
      .eq('email', authUser.email)
      .single();

    const user = {
      email: authUser.email,
      full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
      role: profile?.role || 'user',
    };

    const payload = await req.json();
    const {
      event_type,
      organization_id,
      details,
      target_user_email,
    } = payload;

    if (!event_type || !organization_id) {
      return Response.json({ error: 'Missing event_type or organization_id' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const { error: insertError } = await supabase.from('audit_logs').insert({
      organization_id,
      entity_type: 'SecurityEvent',
      entity_id: `sec_${Date.now()}`,
      entity_title: event_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      action: event_type,
      actor_email: user.email,
      actor_name: user.full_name,
      actor_role: user.role,
      timestamp: new Date().toISOString(),
      changes: null,
      notes: details || null,
      signature_data: null,
      retention_category: 'compliance',
      retention_years: 5,
      is_locked: true,
      metadata: {
        ip_address: ip,
        user_agent: userAgent,
        target_user: target_user_email || null,
        device_type: /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : 'desktop',
        browser: extractBrowser(userAgent),
      }
    });

    if (insertError) throw insertError;

    return Response.json({ status: 'logged', event_type });
  } catch (error) {
    console.error("Security event log error:", (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

function extractBrowser(ua: string) {
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  if (/Opera|OPR/i.test(ua)) return 'Opera';
  return 'Other';
}