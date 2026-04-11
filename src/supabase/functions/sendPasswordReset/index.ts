import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://readynorm.app/ManagerLogin?mode=reset'
      }
    });

    if (error) {
      console.error("Generate link error:", error);
      return Response.json({ success: true, message: "If an account exists, a reset email was sent." });
    }

    const tokenHash = (data as any)?.properties?.hashed_token;

    if (!tokenHash) {
      console.error("No token hash in response:", JSON.stringify(data));
      return Response.json({ success: true, message: "If an account exists, a reset email was sent." });
    }

    const resetUrl = `https://readynorm.app/ManagerLogin?mode=reset&token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    console.log("Generated reset URL for", email);

    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'no-reply@readynorm.app', name: 'ReadyNorm' },
        subject: 'Reset Your Password - ReadyNorm',
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e293b; margin-bottom: 16px;">Reset Your Password</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to set a new password:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}"
                   style="background-color: #0f172a; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 16px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">
                ${resetUrl}
              </p>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-top: 24px;">
                If you didn't request this, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px;">ReadyNorm</p>
            </div>
          `
        }],
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false }
        }
      })
    });

    if (!sgResponse.ok) {
      const sgError = await sgResponse.text();
      console.error("SendGrid error:", sgResponse.status, sgError);
      return Response.json({ error: "Failed to send email" }, { status: 500 });
    }

    console.log("Reset email sent successfully to", email);
    return Response.json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    console.error("Password reset error:", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});