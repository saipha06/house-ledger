// Returns the calling Casa member's Splitwise groups and individual
// friends, so the client can offer both as options for "who was this split
// between" — not just groups, since Splitwise also supports splitting with
// specific friends directly, no group involved.
//
// Deployed JWT-verified (the default): the incoming Authorization header is
// the caller's own Supabase access token, which we reuse to build a
// request-scoped client — RLS then naturally limits the
// splitwise_connections lookup to their own row, no service-role key needed.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const { data: member } = await supabase.from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "No member row for this user" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const { data: connection } = await supabase
      .from("splitwise_connections")
      .select("access_token")
      .eq("member_id", member.id)
      .maybeSingle();
    if (!connection) {
      return new Response(JSON.stringify({ error: "Splitwise not connected" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const swHeaders = { Authorization: `Bearer ${connection.access_token}` };
    const [groupsRes, friendsRes] = await Promise.all([
      fetch("https://secure.splitwise.com/api/v3.0/get_groups", { headers: swHeaders }),
      fetch("https://secure.splitwise.com/api/v3.0/get_friends", { headers: swHeaders }),
    ]);

    if (!groupsRes.ok || !friendsRes.ok) {
      return new Response(JSON.stringify({ error: "Splitwise request failed" }), { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const groupsData = await groupsRes.json();
    const friendsData = await friendsRes.json();

    const groups = (groupsData.groups || [])
      .filter((g: any) => g.id !== 0) // Splitwise's synthetic "Non-group expenses" bucket
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        members: (g.members || []).map((m: any) => ({ id: m.id, name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() })),
      }));

    const friends = (friendsData.friends || []).map((f: any) => ({ id: f.id, name: `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim() }));

    return new Response(JSON.stringify({ groups, friends }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
});
