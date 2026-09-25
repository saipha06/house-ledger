import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, UserPlus } from "lucide-react";
import { supabase } from "../supabaseClient";
import SectionLabel from "./SectionLabel";

const inputClass = "px-1 py-3 text-[15px] bg-transparent border-0 border-b-[1.5px] border-dashed border-charcoal/35 text-charcoal placeholder:text-charcoal/40";

const SIDES = [
  ["bride", "Bride's side"],
  ["groom", "Groom's side"],
  ["shared", "Shared"],
];
const RSVP_STATES = [
  ["pending", "Pending", "bg-charcoal/8 text-charcoal/55"],
  ["confirmed", "Confirmed", "bg-sage/15 text-sage"],
  ["declined", "Declined", "bg-rust/15 text-rust"],
];

export default function WeddingGuests({ guests, refresh }) {
  const [filter, setFilter] = useState("all");

  const counts = useMemo(() => {
    const total = guests.length + guests.filter((g) => g.plus_one).length;
    const confirmed = guests.filter((g) => g.rsvp === "confirmed").length + guests.filter((g) => g.rsvp === "confirmed" && g.plus_one).length;
    const pending = guests.filter((g) => g.rsvp === "pending").length;
    const declined = guests.filter((g) => g.rsvp === "declined").length;
    return { total, confirmed, pending, declined };
  }, [guests]);

  const visible = filter === "all" ? guests : guests.filter((g) => g.rsvp === filter);

  const addGuest = async (payload) => {
    await supabase.from("wedding_guests").insert(payload);
    await refresh();
  };

  const updateGuest = async (id, patch) => {
    await supabase.from("wedding_guests").update(patch).eq("id", id);
    await refresh();
  };

  const deleteGuest = async (id) => {
    await supabase.from("wedding_guests").delete().eq("id", id);
    await refresh();
  };

  return (
    <div>
      <SectionLabel n="01" title="Headcount" />
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3 text-center">
          <div className="font-mono text-xl font-semibold">{counts.total}</div>
          <div className="text-[10.5px] opacity-55 mt-0.5">with plus-ones</div>
        </div>
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3 text-center">
          <div className="font-mono text-xl font-semibold text-sage">{counts.confirmed}</div>
          <div className="text-[10.5px] opacity-55 mt-0.5">confirmed</div>
        </div>
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3 text-center">
          <div className="font-mono text-xl font-semibold opacity-60">{counts.pending}</div>
          <div className="text-[10.5px] opacity-55 mt-0.5">pending</div>
        </div>
      </div>

      <SectionLabel n="02" title="Guest list" />
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[["all", "All"], ...RSVP_STATES.map(([k, label]) => [k, label])].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-[11.5px] font-medium rounded-full border cursor-pointer ${
              filter === key ? "btn-gradient border-transparent" : "bg-paper-2 border-charcoal/20 text-charcoal"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-[13px] opacity-55 italic py-2 mb-4">
          {guests.length === 0 ? "No guests added yet." : "No guests match this filter."}
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          <AnimatePresence initial={false}>
            {visible.map((g) => (
              <GuestRow key={g.id} guest={g} onUpdate={updateGuest} onDelete={deleteGuest} />
            ))}
          </AnimatePresence>
        </div>
      )}
      <AddGuestRow onAdd={addGuest} />
    </div>
  );
}

function GuestRow({ guest, onUpdate, onDelete }) {
  const rsvpMeta = RSVP_STATES.find(([k]) => k === guest.rsvp) || RSVP_STATES[0];
  const cycleRsvp = () => {
    const idx = RSVP_STATES.findIndex(([k]) => k === guest.rsvp);
    const next = RSVP_STATES[(idx + 1) % RSVP_STATES.length][0];
    onUpdate(guest.id, { rsvp: next });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex items-center gap-2.5 pl-3.5 pr-2 py-2.5 bg-paper-2 border border-charcoal/10 rounded-lg"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">
          {guest.name}
          {guest.plus_one && <span className="opacity-50 font-normal"> +1</span>}
        </div>
        <div className="text-[10.5px] opacity-55 mt-0.5 truncate">
          {[SIDES.find(([k]) => k === guest.side)?.[1], guest.group_name].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={cycleRsvp}
        className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full border-none cursor-pointer shrink-0 whitespace-nowrap ${rsvpMeta[2]}`}
      >
        {rsvpMeta[1]}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onDelete(guest.id)}
        title="Remove guest"
        className="bg-transparent border-none text-rust/60 cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
      >
        <X size={14} />
      </motion.button>
    </motion.div>
  );
}

function AddGuestRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [side, setSide] = useState("shared");
  const [groupName, setGroupName] = useState("");
  const [plusOne, setPlusOne] = useState(false);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, side, group_name: groupName.trim() || null, plus_one: plusOne, rsvp: "pending" });
    setName("");
    setGroupName("");
    setPlusOne(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="w-full py-3 text-[13px] font-semibold rounded-lg border-[1.5px] border-dashed border-charcoal/25 bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-charcoal/60"
      >
        <UserPlus size={15} />
        Add a guest
      </motion.button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 bg-paper-2 border border-charcoal/10 rounded-lg p-3">
      <input
        autoFocus
        className={`${inputClass} py-2 text-[13px]`}
        placeholder="Guest name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="flex gap-1.5 flex-wrap">
        {SIDES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSide(key)}
            className={`px-3 py-1.5 text-[11.5px] font-medium rounded-full border cursor-pointer ${
              side === key ? "btn-gradient border-transparent" : "bg-paper-2 border-charcoal/20 text-charcoal"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        className={`${inputClass} py-1.5 text-[12px]`}
        placeholder="Group (optional), e.g. College friends"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <label className="flex items-center gap-2 text-[12.5px] py-1 cursor-pointer select-none">
        <input type="checkbox" checked={plusOne} onChange={(e) => setPlusOne(e.target.checked)} className="w-4 h-4 accent-brass" />
        Bringing a plus-one
      </label>
      <div className="flex gap-1.5 mt-1">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen(false)}
          className="flex-1 py-2 text-[12.5px] font-semibold rounded-lg border border-charcoal/20 bg-transparent cursor-pointer"
        >
          Cancel
        </motion.button>
        <motion.button
          whileTap={name.trim() ? { scale: 0.97 } : {}}
          disabled={!name.trim()}
          onClick={submit}
          className="flex-1 py-2 text-[12.5px] font-semibold rounded-lg btn-gradient cursor-pointer disabled:opacity-40"
        >
          Add
        </motion.button>
      </div>
    </div>
  );
}
