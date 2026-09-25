import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { supabase, isMock } from "./supabaseClient";
import { DEMO_EMAILS, DEMO_PASSWORD } from "./lib/mockSupabase";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";
import Ledger from "./components/Ledger";
import BackgroundArt from "./components/BackgroundArt";

function MockBadge() {
  if (!isMock) return null;
  return (
    <div
      title={`Sign in as ${DEMO_EMAILS[0]} / ${DEMO_PASSWORD} (or any seeded account) — data lives in this browser only.`}
      className="fixed top-2 right-2 z-[1000] font-mono text-[10px] uppercase tracking-wide bg-brass text-paper px-2 py-1 rounded-full pointer-events-none opacity-90"
    >
      Mock data
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [me, setMe] = useState(null); // row in `members` matching this auth user
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [games, setGames] = useState([]);
  const [weddingTasks, setWeddingTasks] = useState([]);
  const [weddingSubtasks, setWeddingSubtasks] = useState([]);
  const [weddingVendorOptions, setWeddingVendorOptions] = useState([]);
  const [weddingMiscItems, setWeddingMiscItems] = useState([]);
  const [weddingSettings, setWeddingSettings] = useState(null);
  const [weddingEvents, setWeddingEvents] = useState([]);
  const [weddingGuests, setWeddingGuests] = useState([]);
  const [splitwiseConnection, setSplitwiseConnection] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Guards against two overlapping fetchAll() calls resolving out of order
  // (e.g. React StrictMode double-invoking the session effect in dev, or a
  // realtime-triggered refetch racing a component's own post-mutation
  // refresh()) — only the results of the most recently *started* call are
  // ever applied, so a slow, stale call can't stomp fresher state.
  const fetchSeq = useRef(0);

  const fetchAll = useCallback(async () => {
    const seq = ++fetchSeq.current;
    // wedding_* queries are safe to fire for every housemate: RLS on those
    // tables (see supabase/schema.sql) returns zero rows for anyone whose
    // auth email isn't Phani or Anila's, regardless of what this client asks for.
    const [
      membersRes,
      expensesRes,
      settlementsRes,
      groceriesRes,
      gamesRes,
      weddingTasksRes,
      weddingSubtasksRes,
      weddingVendorOptionsRes,
      weddingMiscItemsRes,
      weddingSettingsRes,
      weddingEventsRes,
      weddingGuestsRes,
      splitwiseConnectionRes,
    ] = await Promise.all([
      supabase.from("members").select("*").order("created_at"),
      supabase.from("expenses").select("*, expense_splits(*)").order("date", { ascending: false }),
      supabase.from("settlements").select("*").order("date", { ascending: false }),
      supabase.from("grocery_items").select("*").order("created_at"),
      supabase.from("games").select("*").order("created_at"),
      supabase.from("wedding_tasks").select("*").order("created_at"),
      supabase.from("wedding_subtasks").select("*").order("created_at"),
      supabase.from("wedding_vendor_options").select("*").order("created_at"),
      supabase.from("wedding_misc_items").select("*").order("created_at"),
      supabase.from("wedding_settings").select("*").maybeSingle(),
      supabase.from("wedding_events").select("*").order("created_at"),
      supabase.from("wedding_guests").select("*").order("created_at"),
      // RLS on this table already restricts it to the caller's own row, so
      // this is never anyone else's connection regardless of what's asked for.
      supabase.from("splitwise_connections").select("*").maybeSingle(),
    ]);
    if (seq !== fetchSeq.current) return; // superseded by a newer fetchAll — drop these stale results
    setMembers(membersRes.data || []);
    setExpenses(expensesRes.data || []);
    setSettlements(settlementsRes.data || []);
    setGroceries(groceriesRes.data || []);
    setGames(gamesRes.data || []);
    setWeddingTasks(weddingTasksRes.data || []);
    setWeddingSubtasks(weddingSubtasksRes.data || []);
    setWeddingVendorOptions(weddingVendorOptionsRes.data || []);
    setWeddingMiscItems(weddingMiscItemsRes.data || []);
    setWeddingSettings(weddingSettingsRes.data || null);
    setWeddingEvents(weddingEventsRes.data || []);
    setWeddingGuests(weddingGuestsRes.data || []);
    setSplitwiseConnection(splitwiseConnectionRes.data || null);
  }, []);

  // Once we have a session, resolve "me" (the members row) and load data
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      const { data: meRow } = await supabase
        .from("members")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setMe(meRow || null);
      if (meRow) await fetchAll();
      setDataLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, fetchAll]);

  // Realtime: refetch whenever anyone changes the shared tables
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel("ledger-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_splits" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "settlements" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_items" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_tasks" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_subtasks" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_vendor_options" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_misc_items" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_settings" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_events" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_guests" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "splitwise_connections" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [me, fetchAll]);

  if (session === undefined)
    return (
      <>
        <MockBadge />
        <LoadingScreen />
      </>
    );
  if (!session)
    return (
      <>
        <MockBadge />
        <Auth />
      </>
    );
  if (dataLoading)
    return (
      <>
        <MockBadge />
        <LoadingScreen />
      </>
    );
  if (!me)
    return (
      <>
        <MockBadge />
        <Onboarding session={session} onDone={(row) => setMe(row)} />
      </>
    );

  return (
    <>
      <MockBadge />
      <Ledger
        me={me}
        members={members}
        expenses={expenses}
        settlements={settlements}
        groceries={groceries}
        games={games}
        weddingTasks={weddingTasks}
        weddingSubtasks={weddingSubtasks}
        weddingVendorOptions={weddingVendorOptions}
        weddingMiscItems={weddingMiscItems}
        weddingSettings={weddingSettings}
        weddingEvents={weddingEvents}
        weddingGuests={weddingGuests}
        splitwiseConnection={splitwiseConnection}
        refresh={fetchAll}
      />
    </>
  );
}

function LoadingScreen() {
  const pulse = { animate: { opacity: [0.5, 0.9, 0.5] }, transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut" } };
  return (
    <div className="relative h-dvh bg-ink flex items-center justify-center p-5 overflow-hidden">
      <BackgroundArt />
      <div className="relative z-10 w-full max-w-[340px] -rotate-[1.5deg] bg-paper rounded-2xl p-6 shadow-2xl">
        <motion.div {...pulse} className="bg-charcoal/15 rounded h-2.5 w-2/5" />
        <motion.div {...pulse} className="bg-charcoal/15 rounded h-5 w-[70%] mt-2" />
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <motion.div {...pulse} className="h-[74px] rounded-lg bg-charcoal/10 border border-dashed border-charcoal/20" />
          <motion.div {...pulse} className="h-[74px] rounded-lg bg-charcoal/10 border border-dashed border-charcoal/20" />
        </div>
      </div>
    </div>
  );
}
