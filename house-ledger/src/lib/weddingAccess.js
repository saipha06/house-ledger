// UI-side mirror of the RLS policy on the wedding_* tables (see
// supabase/schema.sql) — this only controls whether the tab/UI is shown.
// The real enforcement is in Postgres: everyone else's queries against those
// tables already return zero rows regardless of what the frontend does.
const WEDDING_ALLOWLIST = ["phani@gmail.com", "anila1211@gmail.com"];

export function canAccessWedding(me, isMock) {
  // No real secrets at stake in the local/mock sandbox, so any seeded or
  // signed-up demo account can see and iterate on the feature.
  if (isMock) return true;
  return !!me?.email && WEDDING_ALLOWLIST.includes(me.email.toLowerCase());
}
