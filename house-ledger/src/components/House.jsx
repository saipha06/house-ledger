import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import SectionLabel from "./SectionLabel";
import Avatar from "./Avatar";

export default function House({ members, onSave, busy }) {
  const [local, setLocal] = useState(members);
  useEffect(() => setLocal(members), [members]);
  const update = (id, name) => setLocal((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));

  return (
    <div>
      <SectionLabel n="04" title="Household" />
      <div className="flex flex-col gap-2.5 mb-[18px]">
        {local.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2.5 text-[13px]"
          >
            <Avatar name={m.name} size={30} ring />
            <input
              value={m.name}
              onChange={(e) => update(m.id, e.target.value)}
              className="flex-1 px-3 py-3 text-[15px] border border-charcoal/20 rounded-lg bg-paper-2 text-charcoal"
            />
          </motion.div>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={busy}
        onClick={() => onSave(local)}
        className="w-full py-3.5 text-[15px] font-semibold rounded-xl border-none btn-gradient cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
      >
        <Check size={15} />
        Save names
      </motion.button>
    </div>
  );
}
