import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, X, ArrowRight, Scale, Receipt, HandCoins } from "lucide-react";
import { supabase } from "../supabaseClient";
import { computeBalances, simplifyDebts, fmt } from "../lib/balances";
import SectionLabel from "./SectionLabel";
import AnimatedAmount from "./AnimatedAmount";
import Avatar from "./Avatar";

const SUBTABS = [
  ["balances", "Balances", Scale],
  ["history", "History", Receipt],
  ["add", "Add", Plus],
  ["settle", "Settle", HandCoins],
];

const pillClass = (active) =>
  `px-3.5 py-2 text-[13px] font-medium rounded-full border cursor-pointer ${
    active ? "btn-gradient border-transparent" : "bg-paper-2 border-charcoal/20 text-charcoal"
  }`;
const inputClass = "w-full px-3 py-3 text-[15px] border border-charcoal/20 rounded-lg bg-paper-2 text-charcoal";

export default function Money({ members, expenses, settlements, refresh, onCelebrate }) {
  const [view, setView] = useState("balances");
  const [busy, setBusy] = useState(false);

  const balances = useMemo(() => computeBalances(members, expenses, settlements), [members, expenses, settlements]);
  const simplified = useMemo(() => simplifyDebts(balances), [balances]);
  const memberName = (id) => members.find((m) => m.id === id)?.name || "?";

  const addExpense = async ({ description, amount, paidBy, splitType, participants }) => {
    setBusy(true);
    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({ description, amount, paid_by: paidBy, split_type: splitType })
      .select()
      .single();
    if (!error && expense) {
      await supabase.from("expense_splits").insert(
        participants.map((p) => ({ expense_id: expense.id, member_id: p.userId, share_amount: p.share }))
      );
      await refresh();
      setView("history");
      onCelebrate("expense");
    }
    setBusy(false);
  };

  const deleteExpense = async (id) => {
    setBusy(true);
    await supabase.from("expenses").delete().eq("id", id);
    await refresh();
    setBusy(false);
  };

  const addSettlement = async ({ from, to, amount }) => {
    setBusy(true);
    await supabase.from("settlements").insert({ from_member: from, to_member: to, amount });
    await refresh();
    setView("balances");
    onCelebrate("settle");
    setBusy(false);
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-0.5">
        {SUBTABS.map(([key, label, Icon]) => {
          const active = view === key;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.94 }}
              onClick={() => setView(key)}
              className={`relative px-3.5 py-1.5 text-[12.5px] font-semibold rounded-full border whitespace-nowrap flex items-center ${
                active ? "text-white border-transparent" : "text-charcoal border-charcoal/20"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="money-subnav-indicator"
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute inset-0 btn-gradient rounded-full"
                />
              )}
              <span className="relative flex items-center">
                <Icon size={12} className="mr-1.5" />
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="relative">
        <AnimatePresence mode="popLayout">
          <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {view === "balances" && (
              <BalancesView balances={balances} members={members} simplified={simplified} memberName={memberName} />
            )}
            {view === "history" && <HistoryView expenses={expenses} memberName={memberName} onDelete={deleteExpense} busy={busy} />}
            {view === "add" && <AddExpenseView members={members} onAdd={addExpense} busy={busy} />}
            {view === "settle" && (
              <SettleView members={members} simplified={simplified} memberName={memberName} onSettle={addSettlement} busy={busy} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function BalancesView({ balances, members, simplified, memberName }) {
  return (
    <div>
      <SectionLabel n="01" title="Net position" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-2 gap-2.5 mb-6"
      >
        {members.map((m) => {
          const amt = balances[m.id] || 0;
          const positive = amt > 0.005;
          const negative = amt < -0.005;
          const color = positive ? "text-sage" : negative ? "text-rust" : "text-charcoal/80";
          const glow = positive ? "glow-sage" : negative ? "glow-rust" : "";
          const ring = positive
            ? "border-lime-400/25 shadow-[0_0_24px_-8px_rgba(155,197,61,0.35)]"
            : negative
              ? "border-orange-500/25 shadow-[0_0_24px_-8px_rgba(226,87,46,0.35)]"
              : "border-white/10";
          return (
            <motion.div
              key={m.id}
              variants={{ hidden: { opacity: 0, y: 10, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }}
              className={`relative bg-paper-2 border rounded-lg p-3.5 ${ring}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Avatar name={m.name} size={20} />
                <div className="text-xs font-semibold opacity-75">{m.name}</div>
              </div>
              <AnimatedAmount value={Math.abs(amt) < 0.005 ? 0 : amt} className={`font-mono text-xl font-semibold mb-0.5 block ${color} ${glow}`} />
              <div className="text-[11px] opacity-55">{positive ? "is owed" : negative ? "owes the house" : "all settled"}</div>
            </motion.div>
          );
        })}
      </motion.div>

      <SectionLabel n="02" title="Simplest way to settle" />
      {simplified.length === 0 ? (
        <div className="text-[13px] opacity-55 italic py-2">Everyone's even. Nothing to settle.</div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {simplified.map((t, i) => (
              <motion.div
                key={`${t.from}-${t.to}`}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2 px-3 py-2.5 bg-paper-2 rounded-lg text-[13px]"
              >
                <span className="font-medium flex items-center gap-1.5">
                  <Avatar name={memberName(t.from)} size={20} />
                  {memberName(t.from)}
                </span>
                <ArrowRight size={14} className="opacity-50 shrink-0" />
                <span className="font-medium flex items-center gap-1.5">
                  <Avatar name={memberName(t.to)} size={20} />
                  {memberName(t.to)}
                </span>
                <span className="ml-auto font-mono font-semibold text-rust">{fmt(t.amount)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function HistoryView({ expenses, memberName, onDelete, busy }) {
  if (expenses.length === 0) {
    return (
      <div>
        <SectionLabel n="—" title="Nothing logged yet" />
        <div className="text-[13px] opacity-55 italic py-2">
          The first expense you add becomes the first line in the ledger. Tap Add below to start.
        </div>
      </div>
    );
  }
  return (
    <div>
      <SectionLabel n={String(expenses.length).padStart(2, "0")} title="All entries" />
      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {expenses.map((exp) => (
            <motion.div
              key={exp.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="flex items-center gap-2.5 pl-1 pr-3 py-3 bg-paper-2 rounded-md relative"
            >
              <Avatar name={memberName(exp.paid_by)} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium">{exp.description}</div>
                <div className="text-[11.5px] opacity-55 mt-0.5">
                  paid by {memberName(exp.paid_by)} · split {exp.split_type} ·{" "}
                  {new Date(exp.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>
              <div className="font-mono font-semibold text-sm">{fmt(Number(exp.amount))}</div>
              <motion.button
                whileTap={{ scale: 0.85 }}
                disabled={busy}
                onClick={() => onDelete(exp.id)}
                title="Delete entry"
                className="bg-transparent border-none text-rust/60 cursor-pointer p-2"
              >
                <X size={14} />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AddExpenseView({ members, onAdd, busy }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?.id);
  const [splitType, setSplitType] = useState("equal");
  const [customShares, setCustomShares] = useState({});
  const [participantIds, setParticipantIds] = useState(members.map((m) => m.id));

  const numAmount = parseFloat(amount) || 0;
  const toggleParticipant = (id) =>
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const equalShare = participantIds.length ? numAmount / participantIds.length : 0;
  const customTotal = participantIds.reduce((sum, id) => sum + (parseFloat(customShares[id]) || 0), 0);
  const canSubmit =
    description.trim() &&
    numAmount > 0 &&
    paidBy &&
    participantIds.length > 0 &&
    (splitType === "equal" || Math.abs(customTotal - numAmount) < 0.01) &&
    !busy;

  const submit = () => {
    if (!canSubmit) return;
    const participants =
      splitType === "equal"
        ? participantIds.map((id) => ({ userId: id, share: Math.round(equalShare * 100) / 100 }))
        : participantIds.map((id) => ({ userId: id, share: parseFloat(customShares[id]) || 0 }));
    onAdd({ description: description.trim(), amount: numAmount, paidBy, splitType, participants });
    setDescription("");
    setAmount("");
    setCustomShares({});
  };

  return (
    <div>
      <SectionLabel n="+" title="New entry" />
      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">What was it for</label>
        <input className={inputClass} placeholder="e.g. Costco groceries" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">Amount</label>
        <input className={inputClass} placeholder="0.00" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      </div>
      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">Paid by</label>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <motion.button key={m.id} whileTap={{ scale: 0.94 }} onClick={() => setPaidBy(m.id)} className={pillClass(paidBy === m.id)}>
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={m.name} size={16} />
                {m.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">Split between</label>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <motion.button key={m.id} whileTap={{ scale: 0.94 }} onClick={() => toggleParticipant(m.id)} className={pillClass(participantIds.includes(m.id))}>
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={m.name} size={16} />
                {m.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">Split type</label>
        <div className="flex flex-wrap gap-1.5">
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setSplitType("equal")} className={pillClass(splitType === "equal")}>
            Equal
          </motion.button>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setSplitType("custom")} className={pillClass(splitType === "custom")}>
            Custom amounts
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {splitType === "equal" && participantIds.length > 0 && numAmount > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[13px] opacity-55 italic overflow-hidden">
            {fmt(equalShare)} each across {participantIds.length} {participantIds.length === 1 ? "person" : "people"}.
          </motion.div>
        )}
      </AnimatePresence>

      {splitType === "custom" && (
        <div className="flex flex-col gap-2 mb-4">
          {participantIds.map((id) => (
            <div key={id} className="flex items-center gap-2 text-[13px]">
              <span className="flex-1">{members.find((m) => m.id === id)?.name}</span>
              <input
                className={`${inputClass} w-[90px] text-right`}
                placeholder="0.00"
                inputMode="decimal"
                value={customShares[id] || ""}
                onChange={(e) => setCustomShares((prev) => ({ ...prev, [id]: e.target.value.replace(/[^0-9.]/g, "") }))}
              />
            </div>
          ))}
          <div className="text-[11.5px] opacity-55 text-right">
            {fmt(customTotal)} of {fmt(numAmount)} allocated
          </div>
        </div>
      )}

      <motion.button
        whileTap={canSubmit ? { scale: 0.97 } : {}}
        disabled={!canSubmit}
        onClick={submit}
        className="w-full py-3.5 text-[15px] font-semibold rounded-xl border-none btn-gradient cursor-pointer mt-1 flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <Plus size={15} />
        Add to ledger
      </motion.button>
    </div>
  );
}

function SettleView({ members, simplified, memberName, onSettle, busy }) {
  const [from, setFrom] = useState(members[0]?.id);
  const [to, setTo] = useState(members[1]?.id);
  const [amount, setAmount] = useState("");
  const numAmount = parseFloat(amount) || 0;
  const canSubmit = from && to && from !== to && numAmount > 0 && !busy;

  return (
    <div>
      <SectionLabel n="03" title="Record a payment" />
      {simplified.length > 0 && (
        <div className="mb-[18px]">
          <div className="text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-2">Suggested</div>
          {simplified.map((t, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setFrom(t.from);
                setTo(t.to);
                setAmount(String(t.amount));
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 bg-paper-2 border border-charcoal/10 rounded-lg text-[13px] mb-1.5 text-left"
            >
              <span className="font-medium flex items-center gap-1.5">
                <Avatar name={memberName(t.from)} size={20} />
                {memberName(t.from)}
              </span>
              <ArrowRight size={13} className="opacity-50" />
              <span className="font-medium flex items-center gap-1.5">
                <Avatar name={memberName(t.to)} size={20} />
                {memberName(t.to)}
              </span>
              <span className="ml-auto font-mono font-semibold text-rust">{fmt(t.amount)}</span>
            </motion.button>
          ))}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">From</label>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <motion.button key={m.id} whileTap={{ scale: 0.94 }} onClick={() => setFrom(m.id)} className={pillClass(from === m.id)}>
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={m.name} size={16} />
                {m.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">To</label>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <motion.button key={m.id} whileTap={{ scale: 0.94 }} onClick={() => setTo(m.id)} className={pillClass(to === m.id)}>
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={m.name} size={16} />
                {m.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11.5px] font-semibold uppercase tracking-wide opacity-55 mb-1.5">Amount</label>
        <input className={inputClass} placeholder="0.00" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      </div>

      <motion.button
        whileTap={canSubmit ? { scale: 0.97 } : {}}
        disabled={!canSubmit}
        onClick={() => onSettle({ from, to, amount: numAmount })}
        className="w-full py-3.5 text-[15px] font-semibold rounded-xl border-none btn-gradient cursor-pointer mt-1 flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <Check size={15} />
        Mark as paid
      </motion.button>
    </div>
  );
}
