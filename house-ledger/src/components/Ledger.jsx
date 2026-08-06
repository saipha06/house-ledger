import { useState, useMemo } from "react";
import { Plus, Check, X, Receipt, ArrowRight, Users, LogOut, Scale, HandCoins } from "lucide-react";
import { supabase } from "../supabaseClient";
import { computeBalances, simplifyDebts, fmt } from "../lib/balances";
import Celebration from "./Celebration";

export default function Ledger({ me, members, expenses, settlements, refresh }) {
  const [view, setView] = useState("balances");
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(null); // null | "expense" | "settle"

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
      setCelebration("expense");
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
    setCelebration("settle");
    setBusy(false);
  };

  const saveMembers = async (updated) => {
    setBusy(true);
    await Promise.all(updated.map((m) => supabase.from("members").update({ name: m.name }).eq("id", m.id)));
    await refresh();
    setBusy(false);
  };

  const TABS = [
    ["balances", "Balances", Scale],
    ["history", "History", Receipt],
    ["add", "Add", Plus],
    ["settle", "Settle", HandCoins],
    ["members", "House", Users],
  ];

  return (
    <div style={styles.app}>
      <Celebration type={celebration} onDone={() => setCelebration(null)} />
      <div style={styles.cover}>
        <div style={styles.coverTop}>
          <div>
            <div style={styles.eyebrow}>household accounts · {me.name}</div>
            <h1 style={styles.wordmark}>The House Ledger</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={styles.tally}>
              <Receipt size={14} style={{ opacity: 0.6 }} />
              <span>{expenses.length}</span>
            </div>
            <button className="tap-btn" style={styles.iconBtnLight} onClick={() => supabase.auth.signOut()} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <div style={styles.paperWrap}>
          <div style={styles.paper}>
            {view === "balances" && (
              <BalancesView balances={balances} members={members} simplified={simplified} memberName={memberName} />
            )}
            {view === "history" && (
              <HistoryView expenses={expenses} memberName={memberName} onDelete={deleteExpense} busy={busy} />
            )}
            {view === "add" && <AddExpenseView members={members} onAdd={addExpense} busy={busy} />}
            {view === "settle" && (
              <SettleView members={members} simplified={simplified} memberName={memberName} onSettle={addSettlement} busy={busy} />
            )}
            {view === "members" && <MembersView members={members} onSave={saveMembers} busy={busy} />}
          </div>
        </div>
      </div>

      <nav style={styles.tabBar}>
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            className="tap-btn"
            onClick={() => setView(key)}
            style={{ ...styles.tabBtn, ...(view === key ? styles.tabBtnActive : {}) }}
          >
            <Icon size={20} strokeWidth={view === key ? 2.4 : 1.8} />
            <span style={styles.tabLabel}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function BalancesView({ balances, members, simplified, memberName }) {
  return (
    <div>
      <SectionLabel n="01" title="Net position" />
      <div style={styles.ticketGrid}>
        {members.map((m) => {
          const amt = balances[m.id] || 0;
          const positive = amt > 0.005;
          const negative = amt < -0.005;
          return (
            <div key={m.id} style={styles.ticket}>
              <div style={styles.ticketNotch} />
              <div style={styles.ticketName}>{m.name}</div>
              <div style={{ ...styles.ticketAmount, color: positive ? "#5C7A5F" : negative ? "#9B4A36" : "#3A362B" }}>
                {fmt(Math.abs(amt) < 0.005 ? 0 : amt)}
              </div>
              <div style={styles.ticketSub}>{positive ? "is owed" : negative ? "owes the house" : "all settled"}</div>
            </div>
          );
        })}
      </div>

      <SectionLabel n="02" title="Simplest way to settle" />
      {simplified.length === 0 ? (
        <div style={styles.emptyNote}>Everyone's even. Nothing to settle.</div>
      ) : (
        <div style={styles.debtList}>
          {simplified.map((t, i) => (
            <div key={i} style={styles.debtRow}>
              <span style={styles.debtName}>{memberName(t.from)}</span>
              <ArrowRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
              <span style={styles.debtName}>{memberName(t.to)}</span>
              <span style={styles.debtAmount}>{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryView({ expenses, memberName, onDelete, busy }) {
  if (expenses.length === 0) {
    return (
      <div>
        <SectionLabel n="—" title="No entries yet" />
        <div style={styles.emptyNote}>Add your first expense and it'll show up here, receipt-style.</div>
      </div>
    );
  }
  return (
    <div>
      <SectionLabel n={String(expenses.length).padStart(2, "0")} title="All entries" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {expenses.map((exp) => (
          <div key={exp.id} style={styles.receiptRow}>
            <div style={styles.receiptPerf} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.receiptDesc}>{exp.description}</div>
              <div style={styles.receiptMeta}>
                paid by {memberName(exp.paid_by)} · split {exp.split_type} ·{" "}
                {new Date(exp.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            </div>
            <div style={styles.receiptAmount}>{fmt(Number(exp.amount))}</div>
            <button className="tap-btn" style={styles.iconBtn} disabled={busy} onClick={() => onDelete(exp.id)} title="Delete entry">
              <X size={14} />
            </button>
          </div>
        ))}
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
      <div style={styles.formGroup}>
        <label style={styles.label}>What was it for</label>
        <input style={styles.input} placeholder="e.g. Costco groceries" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Amount</label>
        <input style={styles.input} placeholder="0.00" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Paid by</label>
        <div style={styles.pillRow}>
          {members.map((m) => (
            <button key={m.id} className="tap-btn" onClick={() => setPaidBy(m.id)} style={{ ...styles.pill, ...(paidBy === m.id ? styles.pillActive : {}) }}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Split between</label>
        <div style={styles.pillRow}>
          {members.map((m) => (
            <button key={m.id} className="tap-btn" onClick={() => toggleParticipant(m.id)} style={{ ...styles.pill, ...(participantIds.includes(m.id) ? styles.pillActive : {}) }}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Split type</label>
        <div style={styles.pillRow}>
          <button className="tap-btn" onClick={() => setSplitType("equal")} style={{ ...styles.pill, ...(splitType === "equal" ? styles.pillActive : {}) }}>
            Equal
          </button>
          <button className="tap-btn" onClick={() => setSplitType("custom")} style={{ ...styles.pill, ...(splitType === "custom" ? styles.pillActive : {}) }}>
            Custom amounts
          </button>
        </div>
      </div>

      {splitType === "equal" && participantIds.length > 0 && numAmount > 0 && (
        <div style={styles.emptyNote}>
          {fmt(equalShare)} each across {participantIds.length} {participantIds.length === 1 ? "person" : "people"}.
        </div>
      )}

      {splitType === "custom" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {participantIds.map((id) => (
            <div key={id} style={styles.customRow}>
              <span style={{ flex: 1 }}>{members.find((m) => m.id === id)?.name}</span>
              <input
                style={{ ...styles.input, width: 90, textAlign: "right" }}
                placeholder="0.00"
                inputMode="decimal"
                value={customShares[id] || ""}
                onChange={(e) => setCustomShares((prev) => ({ ...prev, [id]: e.target.value.replace(/[^0-9.]/g, "") }))}
              />
            </div>
          ))}
          <div style={{ ...styles.receiptMeta, textAlign: "right" }}>
            {fmt(customTotal)} of {fmt(numAmount)} allocated
          </div>
        </div>
      )}

      <button className="tap-btn" style={{ ...styles.primaryBtn, opacity: canSubmit ? 1 : 0.4 }} disabled={!canSubmit} onClick={submit}>
        <Plus size={15} style={{ marginRight: 6, verticalAlign: -3 }} />
        Add to ledger
      </button>
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
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...styles.label, marginBottom: 8 }}>Suggested</div>
          {simplified.map((t, i) => (
            <button
              key={i}
              className="tap-btn"
              style={styles.suggestRow}
              onClick={() => {
                setFrom(t.from);
                setTo(t.to);
                setAmount(String(t.amount));
              }}
            >
              <span style={styles.debtName}>{memberName(t.from)}</span>
              <ArrowRight size={13} style={{ opacity: 0.5 }} />
              <span style={styles.debtName}>{memberName(t.to)}</span>
              <span style={styles.debtAmount}>{fmt(t.amount)}</span>
            </button>
          ))}
        </div>
      )}

      <div style={styles.formGroup}>
        <label style={styles.label}>From</label>
        <div style={styles.pillRow}>
          {members.map((m) => (
            <button key={m.id} className="tap-btn" onClick={() => setFrom(m.id)} style={{ ...styles.pill, ...(from === m.id ? styles.pillActive : {}) }}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>To</label>
        <div style={styles.pillRow}>
          {members.map((m) => (
            <button key={m.id} className="tap-btn" onClick={() => setTo(m.id)} style={{ ...styles.pill, ...(to === m.id ? styles.pillActive : {}) }}>
              {m.name}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Amount</label>
        <input style={styles.input} placeholder="0.00" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      </div>

      <button className="tap-btn" style={{ ...styles.primaryBtn, opacity: canSubmit ? 1 : 0.4 }} disabled={!canSubmit} onClick={() => onSettle({ from, to, amount: numAmount })}>
        <Check size={15} style={{ marginRight: 6, verticalAlign: -3 }} />
        Mark as paid
      </button>
    </div>
  );
}

function MembersView({ members, onSave, busy }) {
  const [local, setLocal] = useState(members);
  const update = (id, name) => setLocal((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));

  return (
    <div>
      <SectionLabel n="04" title="Household" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {local.map((m) => (
          <div key={m.id} style={styles.customRow}>
            <Users size={14} style={{ opacity: 0.5 }} />
            <input style={{ ...styles.input, flex: 1 }} value={m.name} onChange={(e) => update(m.id, e.target.value)} />
          </div>
        ))}
      </div>
      <button className="tap-btn" style={styles.primaryBtn} disabled={busy} onClick={() => onSave(local)}>
        <Check size={15} style={{ marginRight: 6, verticalAlign: -3 }} />
        Save names
      </button>
    </div>
  );
}

function SectionLabel({ n, title }) {
  return (
    <div style={styles.sectionLabel}>
      <span style={styles.sectionNum}>{n}</span>
      <span>{title}</span>
    </div>
  );
}

const styles = {
  app: {
    height: "100dvh",
    background: "#12201C",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  cover: {
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  },
  coverTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "calc(env(safe-area-inset-top, 0px) + 18px) 20px 14px",
    color: "#E9E4D6",
    flexShrink: 0,
  },
  eyebrow: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.55, marginBottom: 4 },
  wordmark: { fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" },
  tally: { display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, opacity: 0.7 },
  iconBtnLight: { background: "transparent", border: "1px solid rgba(233,228,214,0.25)", borderRadius: 8, color: "#E9E4D6", padding: 8, cursor: "pointer" },
  paperWrap: { flex: 1, padding: "0 12px 20px" },
  paper: { background: "#EDE8DA", borderRadius: 14, padding: "22px 18px", color: "#2C2A22", minHeight: 420, boxShadow: "0 12px 30px rgba(0,0,0,0.25)" },
  tabBar: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-around",
    background: "#0D1613",
    borderTop: "1px solid rgba(233,228,214,0.1)",
    padding: "8px 4px calc(env(safe-area-inset-bottom, 0px) + 8px)",
  },
  tabBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    background: "transparent",
    border: "none",
    color: "rgba(233,228,214,0.5)",
    padding: "6px 10px",
    cursor: "pointer",
    minWidth: 56,
  },
  tabBtnActive: { color: "#B08D57" },
  tabLabel: { fontSize: 10.5, fontWeight: 600, letterSpacing: "0.01em" },
  sectionLabel: { display: "flex", alignItems: "baseline", gap: 10, fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, marginBottom: 14, color: "#2C2A22" },
  sectionNum: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 400, color: "#B08D57", letterSpacing: "0.05em" },
  ticketGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 26 },
  ticket: { position: "relative", background: "#F7F4EA", border: "1px dashed rgba(44,42,34,0.25)", borderRadius: 8, padding: "14px 12px", overflow: "hidden" },
  ticketNotch: { position: "absolute", top: -7, right: 10, width: 14, height: 14, borderRadius: "50%", background: "#12201C" },
  ticketName: { fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.75 },
  ticketAmount: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600, marginBottom: 2 },
  ticketSub: { fontSize: 11, opacity: 0.55 },
  debtList: { display: "flex", flexDirection: "column", gap: 8 },
  debtRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#F7F4EA", borderRadius: 8, fontSize: 13 },
  debtName: { fontWeight: 500 },
  debtAmount: { marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#9B4A36" },
  suggestRow: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 12px", background: "#F7F4EA", border: "1px solid rgba(44,42,34,0.12)", borderRadius: 8, fontSize: 13, marginBottom: 6, cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "left" },
  emptyNote: { fontSize: 13, opacity: 0.55, fontStyle: "italic", padding: "8px 0 4px" },
  receiptRow: { display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 12px 4px", background: "#F7F4EA", borderRadius: 6, position: "relative" },
  receiptPerf: { width: 3, alignSelf: "stretch", background: "repeating-linear-gradient(to bottom, rgba(44,42,34,0.25) 0, rgba(44,42,34,0.25) 4px, transparent 4px, transparent 9px)", borderRadius: 2 },
  receiptDesc: { fontSize: 13.5, fontWeight: 500 },
  receiptMeta: { fontSize: 11.5, opacity: 0.55, marginTop: 2 },
  receiptAmount: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 14 },
  iconBtn: { background: "transparent", border: "none", color: "#9B4A36", opacity: 0.5, cursor: "pointer", padding: 8 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.55, marginBottom: 6 },
  input: { width: "100%", padding: "12px", fontSize: 16, fontFamily: "'Inter', sans-serif", border: "1px solid rgba(44,42,34,0.2)", borderRadius: 7, background: "#F7F4EA", color: "#2C2A22" },
  pillRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  pill: { padding: "9px 14px", fontSize: 13, fontWeight: 500, borderRadius: 20, border: "1px solid rgba(44,42,34,0.2)", background: "#F7F4EA", color: "#2C2A22", cursor: "pointer" },
  pillActive: { background: "#2C2A22", borderColor: "#2C2A22", color: "#EDE8DA" },
  customRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  primaryBtn: { width: "100%", padding: "14px", fontSize: 15, fontWeight: 600, borderRadius: 10, border: "none", background: "#2C2A22", color: "#EDE8DA", cursor: "pointer", marginTop: 4 },
};
