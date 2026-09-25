import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, UserPlus, ChevronRight } from "lucide-react";
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

export default function WeddingGuests({ guests, events, attendance, refresh }) {
  const [filter, setFilter] = useState("all");

  const counts = useMemo(() => {
    const headcount = (rsvp) => guests.filter((g) => g.rsvp === rsvp).reduce((sum, g) => sum + (Number(g.adults) || 0) + (Number(g.kids) || 0), 0);
    return {
      total: guests.reduce((sum, g) => sum + (Number(g.adults) || 0) + (Number(g.kids) || 0), 0),
      confirmed: headcount("confirmed"),
      pending: headcount("pending"),
    };
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

  const setAttendance = async (guestId, eventId, attending) => {
    await supabase.from("wedding_guest_attendance").upsert({ guest_id: guestId, event_id: eventId, attending }, { onConflict: "guest_id,event_id" });
    await refresh();
  };

  return (
    <div>
      <SectionLabel n="01" title="Headcount" />
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3 text-center">
          <div className="font-mono text-xl font-semibold">{counts.total}</div>
          <div className="text-[10.5px] opacity-55 mt-0.5">total people</div>
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
              <GuestRow
                key={g.id}
                guest={g}
                events={events}
                attendance={attendance.filter((a) => a.guest_id === g.id)}
                onUpdate={updateGuest}
                onDelete={deleteGuest}
                onSetAttendance={setAttendance}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      <AddGuestRow onAdd={addGuest} />
    </div>
  );
}

function GuestRow({ guest, events, attendance, onUpdate, onDelete, onSetAttendance }) {
  const [open, setOpen] = useState(false);
  const rsvpMeta = RSVP_STATES.find(([k]) => k === guest.rsvp) || RSVP_STATES[0];
  const cycleRsvp = (e) => {
    e.stopPropagation();
    const idx = RSVP_STATES.findIndex(([k]) => k === guest.rsvp);
    const next = RSVP_STATES[(idx + 1) % RSVP_STATES.length][0];
    onUpdate(guest.id, { rsvp: next });
  };
  const partySize = (Number(guest.adults) || 0) + (Number(guest.kids) || 0);
  const isAttending = (eventId) => attendance.find((a) => a.event_id === eventId)?.attending ?? true;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="bg-paper-2 border border-charcoal/10 rounded-lg"
    >
      <div className="flex items-center gap-2.5 pl-3.5 pr-2 py-2.5 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} className="opacity-40 shrink-0">
          <ChevronRight size={12} />
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">
            {guest.name}
            {partySize > 1 && <span className="opacity-50 font-normal"> · party of {partySize}</span>}
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
          onClick={(e) => {
            e.stopPropagation();
            onDelete(guest.id);
          }}
          title="Remove guest"
          className="bg-transparent border-none text-rust/60 cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
        >
          <X size={14} />
        </motion.button>
      </div>

      {open && (
        <div className="border-t border-dashed border-charcoal/15 px-3.5 pb-3 pt-2.5 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
            <EditableField label="Adults" value={guest.adults} type="number" onSave={(v) => onUpdate(guest.id, { adults: parseInt(v) || 0 })} />
            <EditableField label="Kids" value={guest.kids} type="number" onSave={(v) => onUpdate(guest.id, { kids: parseInt(v) || 0 })} />
            <EditableField label="Relationship" value={guest.relationship} onSave={(v) => onUpdate(guest.id, { relationship: v || null })} />
            <EditableField label="Meal choice" value={guest.meal_choice} onSave={(v) => onUpdate(guest.id, { meal_choice: v || null })} />
            <EditableField label="Table #" value={guest.table_number} onSave={(v) => onUpdate(guest.id, { table_number: v || null })} />
          </div>

          {events.length > 0 && (
            <div>
              <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-1">Attending</div>
              <div className="flex flex-wrap gap-1.5">
                {events.map((ev) => {
                  const attending = isAttending(ev.id);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onSetAttendance(guest.id, ev.id, !attending)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-full border cursor-pointer ${
                        attending ? "btn-gradient border-transparent" : "bg-transparent border-charcoal/20 text-charcoal/40 line-through"
                      }`}
                    >
                      {ev.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function EditableField({ label, value, type, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  if (editing) {
    return (
      <div>
        <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-0.5">{label}</div>
        <input
          autoFocus
          type={type === "number" ? "number" : "text"}
          className={`${inputClass} w-full py-1 text-[12px]`}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            onSave(val);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(val);
              setEditing(false);
            }
          }}
        />
      </div>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-left bg-transparent border-none p-0 cursor-pointer">
      <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-0.5">{label}</div>
      <div className={value ? "" : "opacity-35 italic"}>{value || "add"}</div>
    </button>
  );
}

function AddGuestRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [side, setSide] = useState("shared");
  const [groupName, setGroupName] = useState("");
  const [adults, setAdults] = useState("1");
  const [kids, setKids] = useState("0");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, side, group_name: groupName.trim() || null, adults: parseInt(adults) || 1, kids: parseInt(kids) || 0, rsvp: "pending" });
    setName("");
    setGroupName("");
    setAdults("1");
    setKids("0");
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
        placeholder="Guest name (or family name)"
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
      <div className="flex gap-1.5">
        <div className="flex-1">
          <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-0.5">Adults</div>
          <input type="number" min="0" className={`${inputClass} w-full py-1.5 text-[12px]`} value={adults} onChange={(e) => setAdults(e.target.value)} />
        </div>
        <div className="flex-1">
          <div className="text-[9.5px] uppercase tracking-wide opacity-50 mb-0.5">Kids</div>
          <input type="number" min="0" className={`${inputClass} w-full py-1.5 text-[12px]`} value={kids} onChange={(e) => setKids(e.target.value)} />
        </div>
      </div>
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
