import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
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
  const [groceries, setGroceries] = useState([]);
  const [games, setGames] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchAll = useCallback(async () => {
    const [membersRes, expensesRes, settlementsRes, groceriesRes, gamesRes] = await Promise.all([
      supabase.from("members").select("*").order("created_at"),
      supabase.from("expenses").select("*, expense_splits(*)").order("date", { ascending: false }),
      supabase.from("settlements").select("*").order("date", { ascending: false }),
      supabase.from("grocery_items").select("*").order("created_at"),
      supabase.from("games").select("*").order("created_at"),
    ]);
    setMembers(membersRes.data || []);
    setExpenses(expensesRes.data || []);
    setSettlements(settlementsRes.data || []);
    setGroceries(groceriesRes.data || []);
    setGames(gamesRes.data || []);
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
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [me, fetchAll]);

  if (session === undefined) return <LoadingScreen />;
  if (!session) return <Auth />;
  if (dataLoading) return <LoadingScreen />;
  if (!me) return <Onboarding session={session} onDone={(row) => setMe(row)} />;

  return (
    <Ledger me={me} members={members} expenses={expenses} settlements={settlements} groceries={groceries} games={games} refresh={fetchAll} />
  );
}

function LoadingScreen() {
  const pulse = { animate: { opacity: [0.5, 0.9, 0.5] }, transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut" } };
  return (
    <div className="h-dvh bg-ink flex items-center justify-center p-5">
      <div className="w-full max-w-[340px] bg-paper rounded-2xl p-6 shadow-2xl">
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
