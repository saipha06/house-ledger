// Splitwise redirects the user's browser here (a plain GET, not something
// our own app controls) after they approve the connection — so this
// function can't carry a Supabase auth header at all, and must be deployed
// WITHOUT JWT verification:
//   supabase functions deploy splitwise-oauth-callback --no-verify-jwt
//
// Identifies which Casa member is connecting via `state` (the member's own
// id, set by the client when it built the authorize URL) — a reasonable
// trust level for a 4-person household app, not a public-facing service.
// Writes to splitwise_connections with the service-role key, since there's
// no user JWT context to rely on RLS with here.
//
// Requires as function secrets:
//   supabase secrets set SPLITWISE_CLIENT_ID=... SPLITWISE_CLIENT_SECRET=...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already provided
// automatically to every Edge Function by the platform.)

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://house-ledger-ruby.vercel.app/";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const memberId = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const redirectWith = (params: Record<string, string>) => {
    const dest = new URL(APP_URL);
    for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v);
    return Response.redirect(dest.toString(), 302);
  };

  if (oauthError) return redirectWith({ splitwise_error: oauthError });
  if (!code || !memberId) return redirectWith({ splitwise_error: "missing_code_or_state" });

  try {
    const clientId = Deno.env.get("SPLITWISE_CLIENT_ID");
    const clientSecret = Deno.env.get("SPLITWISE_CLIENT_SECRET");
    if (!clientId || !clientSecret) return redirectWith({ splitwise_error: "server_not_configured" });

    const redirectUri = `${url.origin}${url.pathname}`;

    const tokenRes = await fetch("https://www.splitwise.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return redirectWith({ splitwise_error: "token_exchange_failed" });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return redirectWith({ splitwise_error: "no_access_token" });

    const meRes = await fetch("https://secure.splitwise.com/api/v3.0/get_current_user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json();
    const swUser = meData?.user;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: dbError } = await supabase.from("splitwise_connections").upsert(
      {
        member_id: memberId,
        access_token: accessToken,
        splitwise_user_id: swUser?.id ?? null,
        splitwise_user_name: swUser ? `${swUser.first_name ?? ""} ${swUser.last_name ?? ""}`.trim() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" }
    );
    if (dbError) return redirectWith({ splitwise_error: "db_write_failed" });

    return redirectWith({ splitwise_connected: "1" });
  } catch (err) {
    return redirectWith({ splitwise_error: String(err) });
  }
});
