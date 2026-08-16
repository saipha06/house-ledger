import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Shuffle } from "lucide-react";
import SectionLabel from "./SectionLabel";
import Wheel from "./Wheel";

const PALETTE = ["#F0B429", "#E2572E", "#9BC53D", "#C2703D", "#D4A017", "#8B5A2B", "#F2994A", "#B8461F"];
const STORAGE_KEY = "casa-fate-options";
const inputClass = "px-3 py-3 text-[15px] border border-charcoal/20 rounded-lg bg-paper-2 text-charcoal";

function loadOptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

// A generic random-pick wheel, mirroring Games.jsx's spin mechanic but with
// plain, equally-weighted, freeform options. Persists to localStorage only —
// this is per-device and never touches Supabase.
export default function Fate({ onCelebrate }) {
  const [options, setOptions] = useState(loadOptions);
  const [text, setText] = useState("");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  }, [options]);

  const total = options.length;

  const segments = useMemo(() => {
    const angle = total > 0 ? 360 / total : 0;
    let acc = 0;
    return options.map((opt, i) => {
      const seg = { ...opt, start: acc, angle, color: PALETTE[i % PALETTE.length] };
      acc += angle;
      return seg;
    });
  }, [options, total]);

  const addOption = () => {
    const n = text.trim();
    if (!n) return;
    setOptions((prev) => [...prev, { id: uid(), name: n }]);
    setText("");
  };

  const removeOption = (id) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
    setWinner((w) => (w?.id === id ? null : w));
  };

  const spin = () => {
    if (segments.length < 2 || spinning) return;
    setWinner(null);
    setSpinning(true);
    const r = Math.random() * 360;
    let acc = 0;
    let selected = segments[0];
    for (const seg of segments) {
      if (r < acc + seg.angle) {
        selected = seg;
        break;
      }
      acc += seg.angle;
    }
    const mid = selected.start + selected.angle / 2;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (360 - mid - currentMod + 360) % 360;
    const target = rotation + delta + 360 * 6;
    setRotation(target);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setWinner(selected);
      onCelebrate?.("spin");
    }, 4200);
  };

  return (
    <div>
      <SectionLabel n="🔮" title="Let fate decide" />

      {options.length < 2 ? (
        <div className="text-[13px] opacity-55 italic py-2 mb-4">
          Add at least two options below — what's for dinner, who does the dishes, where to go this weekend — and spin to let fate decide.
        </div>
      ) : (
        <Wheel segments={segments} rotation={rotation} spinning={spinning} onSpin={spin} Icon={Shuffle} />
      )}

      <AnimatePresence>
        {winner && !spinning && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-center font-display text-[17px] px-3 py-2.5 bg-paper-2 rounded-lg mb-[18px]"
          >
            Fate says: <strong>{winner.name}</strong>
          </motion.div>
        )}
      </AnimatePresence>

      {options.length > 0 && (
        <>
          <SectionLabel n={String(options.length).padStart(2, "0")} title="Options" />
          <div className="flex flex-col gap-2 mb-4">
            <AnimatePresence initial={false}>
              {options.map((opt, i) => (
                <motion.div
                  key={opt.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 px-3 py-2.5 bg-paper-2 rounded-lg text-[13px]"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="flex-1">{opt.name}</span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => removeOption(opt.id)}
                    title="Remove"
                    className="bg-transparent border-none text-rust/60 cursor-pointer p-1"
                  >
                    <X size={14} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1 min-w-0`}
          placeholder="Add an option, e.g. Tacos"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOption()}
        />
        <motion.button
          whileTap={text.trim() ? { scale: 0.9 } : {}}
          onClick={addOption}
          disabled={!text.trim()}
          className="w-[46px] shrink-0 rounded-lg btn-gradient flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={18} />
        </motion.button>
      </div>
      <div className="text-[11.5px] opacity-55 mt-2">Stays on this device only — not shared with the rest of the house.</div>
    </div>
  );
}
