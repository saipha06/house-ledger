import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";
import Ledger from "./components/Ledger";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [me, setMe] = useState(null); // row in `members` matching this auth user
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchAll = useCallback(async () => {
    const [membersRes, expensesRes, settlementsRes] = await Promise.all([
      supabase.from("members").select("*").order("created_at"),
      supabase.from("expenses").select("*, expense_splits(*)").order("date", { ascending: false }),
      supabase.from("settlements").select("*").order("date", { ascending: false }),
    ]);
    setMembers(membersRes.data || []);
    setExpenses(expensesRes.data || []);
    setSettlements(settlementsRes.data || []);
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
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [me, fetchAll]);

  if (session === undefined) return <LoadingScreen text="opening the ledger…" />;
  if (!session) return <Auth />;
  if (dataLoading) return <LoadingScreen text="loading your household…" />;
  if (!me) return <Onboarding session={session} onDone={(row) => setMe(row)} />;

  return (
    <Ledger me={me} members={members} expenses={expenses} settlements={settlements} refresh={fetchAll} />
  );
}

function LoadingScreen({ text }) {
  return (
    <div
      style={{
        height: "100dvh",
        background: "#12201C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace",
        color: "#E9E4D6",
        opacity: 0.6,
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}
