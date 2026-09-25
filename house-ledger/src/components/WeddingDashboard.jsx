import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { supabase } from "../supabaseClient";
import { fmt } from "../lib/balances";
import { taskSubtotal, totalApproved, totalMisc } from "../lib/weddingBudget";
import SectionLabel from "./SectionLabel";
import Donut from "./Donut";

const inputClass = "px-1 py-3 text-[15px] bg-transparent border-0 border-b-[1.5px] border-dashed border-charcoal/35 text-charcoal placeholder:text-charcoal/40";
const PALETTE = ["#C1452E", "#35507A", "#5C7A45", "#B8862C", "#7A3F5C", "#2F7A72"];
const RSVP_COLORS = { confirmed: "#5C7A45", pending: "#B8862C", declined: "#C1452E" };

function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export default function WeddingDashboard({ tasks, subtasks, vendorOptions, miscItems, guests, settings, refresh }) {
  const approved = totalApproved(tasks, subtasks, vendorOptions);
  const misc = totalMisc(miscItems);
  const spent = approved + misc;
  const target = settings?.budget_target || 0;

  const budgetSegments = useMemo(() => {
    const segs = tasks.map((t, i) => ({ label: t.title, value: taskSubtotal(subtasks, vendorOptions, t.id), color: PALETTE[i % PALETTE.length] }));
    if (misc > 0) segs.push({ label: "Misc", value: misc, color: "#8a8070" });
    return segs.filter((s) => s.value > 0);
  }, [tasks, subtasks, vendorOptions, misc]);

  const guestSegments = useMemo(() => {
    const counts = { confirmed: 0, pending: 0, declined: 0 };
    guests.forEach((g) => {
      const partySize = (Number(g.adults) || 0) + (Number(g.kids) || 0);
      counts[g.rsvp] = (counts[g.rsvp] || 0) + partySize;
    });
    return [
      { label: "Confirmed", value: counts.confirmed, color: RSVP_COLORS.confirmed },
      { label: "Pending", value: counts.pending, color: RSVP_COLORS.pending },
      { label: "Declined", value: counts.declined, color: RSVP_COLORS.declined },
    ];
  }, [guests]);
  const guestTotal = guestSegments.reduce((s, seg) => s + seg.value, 0);

  const doneCount = subtasks.filter((s) => s.done).length;
  const taskPct = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0;

  return (
    <div>
      <SectionLabel n="01" title="Countdown" />
      <CountdownCard settings={settings} refresh={refresh} />

      <SectionLabel n="02" title="Budget breakdown" />
      <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5 mb-4 flex items-center gap-4">
        <Donut segments={budgetSegments} centerValue={fmt(spent)} centerLabel={target > 0 ? `of ${fmt(target)}` : "spent"} />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {budgetSegments.length === 0 ? (
            <div className="text-[12px] opacity-55 italic">Nothing approved yet — costs show up here once a vendor option is approved.</div>
          ) : (
            budgetSegments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="flex-1 truncate">{seg.label}</span>
                <span className="font-mono opacity-70">{fmt(seg.value)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <SectionLabel n="03" title="Guests" />
      <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5 mb-4 flex items-center gap-4">
        <Donut segments={guestSegments} centerValue={guestTotal} centerLabel="invited" />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {guestTotal === 0 ? (
            <div className="text-[12px] opacity-55 italic">No guests added yet — head to the Guests tab.</div>
          ) : (
            guestSegments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="flex-1 truncate">{seg.label}</span>
                <span className="font-mono opacity-70">{seg.value}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <SectionLabel n="04" title="Tasks" />
      <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] opacity-55">
            {doneCount} of {subtasks.length} done
          </span>
          <span className="font-mono text-[13px] font-semibold">{taskPct}%</span>
        </div>
        <div className="h-2 rounded bg-charcoal/10 overflow-hidden">
          <motion.div
            className="h-full rounded bg-sage"
            initial={{ width: 0 }}
            animate={{ width: `${taskPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

function CountdownCard({ settings, refresh }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(settings?.wedding_date || "");
  const days = settings?.wedding_date ? daysUntil(settings.wedding_date) : null;

  const commit = async () => {
    if (!value) return;
    await supabase.from("wedding_settings").upsert({ id: true, wedding_date: value, updated_at: new Date().toISOString() });
    await refresh();
    setEditing(false);
  };

  if (!settings?.wedding_date || editing) {
    return (
      <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5 mb-4">
        <div className="text-[11px] opacity-55 mb-1.5">Set the wedding date</div>
        <div className="flex items-center gap-1.5">
          <input type="date" autoFocus className={`${inputClass} flex-1 py-1`} value={value} onChange={(e) => setValue(e.target.value)} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={commit} className="w-8 h-8 shrink-0 rounded-lg btn-gradient flex items-center justify-center">
            <Check size={14} />
          </motion.button>
        </div>
      </div>
    );
  }

  const label = days === 0 ? "It's today!" : days < 0 ? `${Math.abs(days)} days ago` : `${days} day${days === 1 ? "" : "s"} to go`;
  return (
    <div className="bg-brass/8 border border-brass/25 rounded-lg p-4 mb-4 text-center">
      <div className="font-mono text-3xl font-bold text-gradient">{days < 0 ? "🎉" : days}</div>
      <div className="text-[12.5px] font-semibold mt-1">{label}</div>
      <button onClick={() => setEditing(true)} className="bg-transparent border-none p-0 text-[10px] uppercase tracking-wide underline opacity-55 cursor-pointer mt-1.5">
        change date
      </button>
    </div>
  );
}
