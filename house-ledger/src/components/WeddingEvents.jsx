import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, MapPin, Clock } from "lucide-react";
import { supabase } from "../supabaseClient";
import SectionLabel from "./SectionLabel";

const inputClass = "px-1 py-3 text-[15px] bg-transparent border-0 border-b-[1.5px] border-dashed border-charcoal/35 text-charcoal placeholder:text-charcoal/40";

// Sorts undated events to the bottom rather than the top, so the agenda
// reads as "what's scheduled" first and "still needs a date" last.
function sortEvents(events) {
  return [...events].sort((a, b) => {
    const aKey = `${a.event_date || "9999-99-99"} ${a.start_time || "99:99"}`;
    const bKey = `${b.event_date || "9999-99-99"} ${b.start_time || "99:99"}`;
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function WeddingEvents({ events, refresh }) {
  const sorted = sortEvents(events);

  const addEvent = async (payload) => {
    await supabase.from("wedding_events").insert(payload);
    await refresh();
  };

  const deleteEvent = async (id) => {
    await supabase.from("wedding_events").delete().eq("id", id);
    await refresh();
  };

  return (
    <div>
      <SectionLabel n="01" title="Schedule" />
      {sorted.length === 0 ? (
        <div className="text-[13px] opacity-55 italic py-2 mb-4">
          The wedding-day (and wedding-week) schedule goes here — ceremony, reception, sangeet, whatever's happening and when. Kept separate from Tasks, which is just budget and vendor tracking.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-4">
          <AnimatePresence initial={false}>
            {sorted.map((e) => (
              <EventRow key={e.id} event={e} onDelete={deleteEvent} />
            ))}
          </AnimatePresence>
        </div>
      )}
      <AddEventRow onAdd={addEvent} />
    </div>
  );
}

function EventRow({ event, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex items-start gap-3 pl-3.5 pr-2 py-3 bg-paper-2 border border-charcoal/10 rounded-lg"
    >
      <div className="w-14 shrink-0 text-center pt-0.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-brass">{formatDate(event.event_date) || "—"}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-[14px]">{event.title}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11.5px] opacity-60">
          {(event.start_time || event.end_time) && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatTime(event.start_time)}
              {event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {event.location}
            </span>
          )}
        </div>
        {event.notes && <div className="text-[11.5px] opacity-70 italic mt-1">{event.notes}</div>}
      </div>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onDelete(event.id)}
        title="Remove event"
        className="bg-transparent border-none text-rust/60 cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
      >
        <X size={14} />
      </motion.button>
    </motion.div>
  );
}

function AddEventRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd({
      title: trimmed,
      event_date: date || null,
      start_time: start || null,
      end_time: end || null,
      location: location.trim() || null,
    });
    setTitle("");
    setDate("");
    setStart("");
    setEnd("");
    setLocation("");
    setOpen(false);
  };

  if (!open) {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="w-full py-3 text-[13px] font-semibold rounded-lg border-[1.5px] border-dashed border-charcoal/25 bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-charcoal/60"
      >
        <Plus size={15} />
        Add an event
      </motion.button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 bg-paper-2 border border-charcoal/10 rounded-lg p-3">
      <input
        autoFocus
        className={`${inputClass} py-2 text-[13px]`}
        placeholder="Event, e.g. Sangeet"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="flex gap-1.5">
        <input type="date" className={`${inputClass} flex-1 min-w-0 py-1.5 text-[12px]`} value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" className={`${inputClass} flex-1 min-w-0 py-1.5 text-[12px]`} value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="time" className={`${inputClass} flex-1 min-w-0 py-1.5 text-[12px]`} value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <input
        className={`${inputClass} py-1.5 text-[12px]`}
        placeholder="Location (optional)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="flex gap-1.5 mt-1">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen(false)}
          className="flex-1 py-2 text-[12.5px] font-semibold rounded-lg border border-charcoal/20 bg-transparent cursor-pointer"
        >
          Cancel
        </motion.button>
        <motion.button
          whileTap={title.trim() ? { scale: 0.97 } : {}}
          disabled={!title.trim()}
          onClick={submit}
          className="flex-1 py-2 text-[12.5px] font-semibold rounded-lg btn-gradient cursor-pointer disabled:opacity-40"
        >
          Add
        </motion.button>
      </div>
    </div>
  );
}
