import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = "noreply@readynorm.com";

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'to, subject, and body are required' }, { status: 400 });
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: FROM_EMAIL,
          name: from_name || "ReadyNorm"
        },
        subject,
        content: [
          {
            type: "text/html",
            value: body
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid error:", response.status, errorText);
      return Response.json({ error: `SendGrid error: ${response.status}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("sendEmail error:", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});