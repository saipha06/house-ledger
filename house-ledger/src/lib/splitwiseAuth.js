// The redirect_uri must exactly match what's registered with the Splitwise
// app (secure.splitwise.com/apps) — it's the deployed splitwise-oauth-callback
// function, not a secret, so it's fine to hardcode here.
export const SPLITWISE_REDIRECT_URI = "https://fwjmwawhlkqxyqebfntv.supabase.co/functions/v1/splitwise-oauth-callback";

// `state` carries which Casa member is connecting through the round trip to
// Splitwise and back — see splitwise-oauth-callback for how it's used.
export function buildSplitwiseAuthorizeUrl(memberId) {
  const clientId = import.meta.env.VITE_SPLITWISE_CLIENT_ID;
  const params = new URLSearchParams({
    client_id: clientId || "",
    response_type: "code",
    redirect_uri: SPLITWISE_REDIRECT_URI,
    state: memberId,
  });
  return `https://www.splitwise.com/oauth/authorize?${params.toString()}`;
}
