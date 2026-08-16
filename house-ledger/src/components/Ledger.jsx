import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ShoppingBasket, Dices, Users, LogOut, Receipt } from "lucide-react";
import { supabase } from "../supabaseClient";
import Celebration from "./Celebration";
import Money from "./Money";
import Groceries from "./Groceries";
import Games from "./Games";
import House from "./House";

const TABS = [
  ["money", "Money", Wallet],
  ["groceries", "Groceries", ShoppingBasket],
  ["games", "Games", Dices],
  ["house", "House", Users],
];

export default function Ledger({ me, members, expenses, settlements, groceries, games, refresh }) {
  const [section, setSection] = useState("money");
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(null); // null | "expense" | "settle" | "spin"

  const saveMembers = async (updated) => {
    setBusy(true);
    await Promise.all(updated.map((m) => supabase.from("members").update({ name: m.name }).eq("id", m.id)));
    await refresh();
    setBusy(false);
  };

  return (
    <div className="h-dvh bg-ink flex flex-col font-sans">
      <Celebration type={celebration} onDone={() => setCelebration(null)} />

      <div className="w-full max-w-[480px] mx-auto flex flex-col flex-1 min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch]">
        <div className="flex justify-between items-end safe-top px-5 pb-3.5 text-cream shrink-0">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-55 mb-1">
              household accounts · {me.name}
            </div>
            <h1 className="font-display text-[26px] font-semibold m-0 tracking-tight">Casa</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs opacity-70">
              <Receipt size={14} className="opacity-60" />
              <span>{expenses.length}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => supabase.auth.signOut()}
              title="Sign out"
              className="bg-transparent border border-cream/25 rounded-lg text-cream p-2 cursor-pointer"
            >
              <LogOut size={15} />
            </motion.button>
          </div>
        </div>

        <div className="flex-1 px-3 pb-5">
          <div className="bg-paper rounded-2xl p-[22px_18px] text-charcoal min-h-[420px] shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {section === "money" && (
                  <Money members={members} expenses={expenses} settlements={settlements} refresh={refresh} onCelebrate={setCelebration} />
                )}
                {section === "groceries" && <Groceries items={groceries} members={members} me={me} refresh={refresh} />}
                {section === "games" && <Games games={games} refresh={refresh} onCelebrate={setCelebration} />}
                {section === "house" && <House members={members} onSave={saveMembers} busy={busy} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <nav className="shrink-0 flex justify-around bg-ink-deep border-t border-cream/10 pt-2 px-1 safe-bottom">
        {TABS.map(([key, label, Icon]) => {
          const active = section === key;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSection(key)}
              className={`relative flex flex-col items-center gap-0.5 bg-transparent border-none py-1.5 px-2.5 cursor-pointer min-w-[56px] ${
                active ? "text-brass" : "text-cream/50"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute -top-0.5 w-[18px] h-[2.5px] rounded bg-brass"
                />
              )}
              <motion.div animate={active ? { scale: [0.7, 1] } : {}} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              </motion.div>
              <span className="text-[10.5px] font-semibold tracking-wide">{label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
