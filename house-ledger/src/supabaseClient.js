import { createClient } from "@supabase/supabase-js";
import { createMockClient, resetMockDb, DEMO_EMAILS, DEMO_PASSWORD } from "./lib/mockSupabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// No Supabase project configured (or VITE_USE_MOCK=true) -> fall back to an
// in-memory, localStorage-backed mock so `npm run dev` works out of the box.
export const isMock = import.meta.env.VITE_USE_MOCK === "true" || !supabaseUrl || !supabaseAnonKey;

export const supabase = isMock ? createMockClient() : createClient(supabaseUrl, supabaseAnonKey);

if (isMock) {
  console.info(
    `[Casa] Mock mode — no real Supabase project needed.\nSign in with any of: ${DEMO_EMAILS.join(", ")} (password: ${DEMO_PASSWORD}), or "New here" to create your own.\nData persists in this browser's localStorage. Run window.__casaMockReset() to wipe and reseed.\nSet VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env to use a real backend instead.`
  );
  window.__casaMockReset = resetMockDb;
}
