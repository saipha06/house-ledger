import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Shirt } from "lucide-react";
import { supabase } from "../supabaseClient";
import { fmt } from "../lib/balances";
import SectionLabel from "./SectionLabel";

const inputClass = "px-1 py-3 text-[15px] bg-transparent border-0 border-b-[1.5px] border-dashed border-charcoal/35 text-charcoal placeholder:text-charcoal/40";

export default function WeddingOutfits({ outfits, events, refresh }) {
  const total = outfits.reduce((sum, o) => sum + (Number(o.cost) || 0), 0);
  const eventTitle = (id) => events.find((e) => e.id === id)?.title || "";

  const addOutfit = async (payload) => {
    await supabase.from("wedding_outfits").insert(payload);
    await refresh();
  };

  const updateOutfit = async (id, patch) => {
    await supabase.from("wedding_outfits").update(patch).eq("id", id);
    await refresh();
  };

  const deleteOutfit = async (id) => {
    await supabase.from("wedding_outfits").delete().eq("id", id);
    await refresh();
  };

  return (
    <div>
      <SectionLabel n="01" title="Outfits & jewelry" />
      {total > 0 && (
        <div className="bg-paper-2 border border-charcoal/10 rounded-lg p-3.5 mb-4 flex items-center justify-between">
          <span className="text-[12px] opacity-55">Total cost</span>
          <span className="font-mono text-lg font-semibold">{fmt(total)}</span>
        </div>
      )}

      {outfits.length === 0 ? (
        <div className="text-[13px] opacity-55 italic py-2 mb-4">Track what each person is wearing for each event — item, color, cost, and whether it's ordered.</div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          <AnimatePresence initial={false}>
            {outfits.map((o) => (
              <OutfitRow key={o.id} outfit={o} eventTitle={eventTitle(o.event_id)} onUpdate={updateOutfit} onDelete={deleteOutfit} />
            ))}
          </AnimatePresence>
        </div>
      )}
      <AddOutfitRow events={events} onAdd={addOutfit} />
    </div>
  );
}

function OutfitRow({ outfit: o, eventTitle, onUpdate, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="flex items-center gap-2.5 pl-3.5 pr-2 py-2.5 bg-paper-2 border border-charcoal/10 rounded-lg"
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onUpdate(o.id, { ordered: !o.ordered })}
        title={o.ordered ? "Ordered" : "Not ordered"}
        className={`w-[19px] h-[19px] shrink-0 rounded-full flex items-center justify-center text-paper ${
          o.ordered ? "bg-sage border-none" : "bg-transparent border-[1.5px] border-charcoal/30"
        }`}
      >
        {o.ordered && <span className="text-[10px] leading-none">✓</span>}
      </motion.button>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">
          {o.item || "—"}
          {o.color && <span className="opacity-50 font-normal"> · {o.color}</span>}
        </div>
        <div className="text-[10.5px] opacity-55 mt-0.5 truncate">
          {[o.person, eventTitle, o.fitting_date && `fitting ${o.fitting_date}`].filter(Boolean).join(" · ")}
        </div>
      </div>
      {o.cost > 0 && <span className="font-mono font-semibold text-[12.5px] shrink-0">{fmt(Number(o.cost))}</span>}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onDelete(o.id)}
        title="Remove"
        className="bg-transparent border-none text-rust/60 cursor-pointer p-2 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
      >
        <X size={14} />
      </motion.button>
    </motion.div>
  );
}

function AddOutfitRow({ events, onAdd }) {
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState("");
  const [item, setItem] = useState("");
  const [color, setColor] = useState("");
  const [cost, setCost] = useState("");
  const [eventId, setEventId] = useState("");

  const submit = () => {
    const trimmedPerson = person.trim();
    if (!trimmedPerson) return;
    onAdd({
      person: trimmedPerson,
      item: item.trim() || null,
      color: color.trim() || null,
      cost: parseFloat(cost) || null,
      event_id: eventId || null,
    });
    setPerson("");
    setItem("");
    setColor("");
    setCost("");
    setEventId("");
    setOpen(false);
  };

  if (!open) {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="w-full py-3 text-[13px] font-semibold rounded-lg border-[1.5px] border-dashed border-charcoal/25 bg-transparent cursor-pointer flex items-center justify-center gap-1.5 text-charcoal/60"
      >
        <Shirt size={15} />
        Add an outfit
      </motion.button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 bg-paper-2 border border-charcoal/10 rounded-lg p-3">
      <div className="flex gap-1.5">
        <input
          autoFocus
          className={`${inputClass} flex-1 min-w-0 py-2 text-[13px]`}
          placeholder="Person, e.g. Bride"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {events.length > 0 && (
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={`${inputClass} flex-1 min-w-0 py-2 text-[13px]`}>
            <option value="">Event (optional)</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <input
        className={`${inputClass} py-1.5 text-[12px]`}
        placeholder="Outfit / item"
        value={item}
        onChange={(e) => setItem(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <div className="flex gap-1.5">
        <input
          className={`${inputClass} flex-1 min-w-0 py-1.5 text-[12px]`}
          placeholder="Color (optional)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className={`${inputClass} w-20 py-1.5 text-[12px]`}
          placeholder="Cost"
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value.replace(/[^0-9.]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
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
          whileTap={person.trim() ? { scale: 0.97 } : {}}
          disabled={!person.trim()}
          onClick={submit}
          className="flex-1 py-2 text-[12.5px] font-semibold rounded-lg btn-gradient cursor-pointer disabled:opacity-40"
        >
          Add
        </motion.button>
      </div>
    </div>
  );
}
