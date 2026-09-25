// Creates a real, live expense in the caller's Splitwise account —
// splitting it equally among whichever Splitwise group members or
// individual friends the client says to include. The caller is always
// recorded as the one who paid, matching "I'm relaying my own Casa
// expense into my own Splitwise." There's no draft/undo on Splitwise's
// side once this succeeds — all the review/editing (which people to
// include) happens client-side, before this is ever called.
//
// Deployed JWT-verified: reuses the caller's own Supabase access token to
// resolve their splitwise_connections row under RLS, same pattern as
// splitwise-groups-and-friends.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { description, amount, date, groupId, participantIds } = await req.json();
    if (!description || !amount || !Array.isArray(participantIds) || participantIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing description, amount, or participantIds" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

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
    const { data: connection } = member
      ? await supabase.from("splitwise_connections").select("access_token, splitwise_user_id").eq("member_id", member.id).maybeSingle()
      : { data: null };
    if (!connection) {
      return new Response(JSON.stringify({ error: "Splitwise not connected" }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // The payer always owes a share too — include them even if the client's
    // participant list somehow omitted them.
    const allIds = [...new Set([connection.splitwise_user_id, ...participantIds])];
    const total = Number(amount);
    const n = allIds.length;
    const shareEach = Math.round((total / n) * 100) / 100;
    const lastShare = Math.round((total - shareEach * (n - 1)) * 100) / 100; // absorbs rounding remainder

    const body = new URLSearchParams({
      cost: total.toFixed(2),
      description: String(description),
      group_id: String(groupId ?? 0),
    });
    if (date) body.set("date", String(date));

    allIds.forEach((id, i) => {
      const owed = i === n - 1 ? lastShare : shareEach;
      body.set(`users__${i}__user_id`, String(id));
      body.set(`users__${i}__paid_share`, id === connection.splitwise_user_id ? total.toFixed(2) : "0.00");
      body.set(`users__${i}__owed_share`, owed.toFixed(2));
    });

    const swRes = await fetch("https://secure.splitwise.com/api/v3.0/create_expense", {
      method: "POST",
      headers: { Authorization: `Bearer ${connection.access_token}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const swData = await swRes.json();
    const errors = swData?.errors;
    const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0);
    if (!swRes.ok || hasErrors) {
      return new Response(JSON.stringify({ error: "Splitwise rejected the expense", detail: errors || swData }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, expense: swData?.expenses?.[0] ?? null }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
});
