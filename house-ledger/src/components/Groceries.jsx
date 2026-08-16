import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check } from "lucide-react";
import { supabase } from "../supabaseClient";
import SectionLabel from "./SectionLabel";

const inputClass = "w-full px-3 py-3 text-[15px] border border-charcoal/20 rounded-lg bg-paper-2 text-charcoal";

export default function Groceries({ items, members, me, refresh }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const memberName = (id) => members.find((m) => m.id === id)?.name || "?";

  const add = async () => {
    const name = text.trim();
    if (!name) return;
    setText("");
    setBusy(true);
    await supabase.from("grocery_items").insert({ name, added_by: me.id });
    await refresh();
    setBusy(false);
  };

  const toggle = async (item) => {
    await supabase.from("grocery_items").update({ checked: !item.checked }).eq("id", item.id);
    await refresh();
  };

  const remove = async (id) => {
    await supabase.from("grocery_items").delete().eq("id", id);
    await refresh();
  };

  const pending = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <div>
      <SectionLabel n="01" title="Add an item" />
      <div className="flex gap-2 mb-[22px]">
        <input
          className={`${inputClass} flex-1 min-w-0`}
          placeholder="e.g. Milk"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <motion.button
          whileTap={text.trim() ? { scale: 0.9 } : {}}
          disabled={!text.trim() || busy}
          onClick={add}
          className="w-[46px] shrink-0 rounded-lg bg-charcoal text-paper flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={18} />
        </motion.button>
      </div>

      <SectionLabel n={String(pending.length).padStart(2, "0")} title="Still need" />
      {pending.length === 0 ? (
        <div className="text-[13px] opacity-55 italic py-2 mb-4">The list is clear. Add whatever you're out of and it'll show up for the whole house.</div>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          <AnimatePresence initial={false}>
            {pending.map((item) => (
              <GroceryRow key={item.id} item={item} memberName={memberName} onToggle={() => toggle(item)} onDelete={() => remove(item.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {done.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SectionLabel n={String(done.length).padStart(2, "0")} title="Got it" />
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {done.map((item) => (
                  <GroceryRow key={item.id} item={item} memberName={memberName} onToggle={() => toggle(item)} onDelete={() => remove(item.id)} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroceryRow({ item, memberName, onToggle, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: item.checked ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ layout: { type: "spring", stiffness: 400, damping: 32 } }}
      className="flex items-center gap-2.5 pl-1 pr-3 py-3 bg-paper-2 rounded-md"
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onToggle}
        className={`w-[22px] h-[22px] shrink-0 rounded-md flex items-center justify-center text-paper-2 ${
          item.checked ? "bg-sage border-none" : "bg-transparent border-[1.5px] border-charcoal/30"
        }`}
      >
        <AnimatePresence>
          {item.checked && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
              <Check size={13} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <div className="flex-1 min-w-0">
        <div className={`text-[13.5px] font-medium ${item.checked ? "line-through" : ""}`}>{item.name}</div>
        <div className="text-[11.5px] opacity-55 mt-0.5">added by {memberName(item.added_by)}</div>
      </div>
      <motion.button whileTap={{ scale: 0.85 }} onClick={onDelete} title="Remove" className="bg-transparent border-none text-rust/60 cursor-pointer p-2">
        <X size={14} />
      </motion.button>
    </motion.div>
  );
}
