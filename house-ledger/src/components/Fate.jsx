import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Shuffle } from "lucide-react";
import SectionLabel from "./SectionLabel";

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

  const gradient =
    segments.length > 0
      ? `conic-gradient(${segments.map((s) => `${s.color} ${s.start}deg ${s.start + s.angle}deg`).join(", ")})`
      : "#F5ECD9";

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
        <div className="relative w-[220px] h-[220px] mx-auto mt-2 mb-[18px]">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[16px] border-t-charcoal" />
          <motion.div
            animate={{ rotate: rotation }}
            transition={spinning ? { duration: 4.2, ease: [0.15, 0.65, 0.1, 1] } : { duration: 0 }}
            style={{ background: gradient }}
            className="w-full h-full rounded-full border-4 border-white/20 shadow-[0_0_50px_-10px_rgba(240,176,41,0.5)]"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={spin}
            disabled={spinning || segments.length < 2}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-paper border-[3px] border-charcoal flex items-center justify-center text-charcoal z-30"
          >
            <motion.span animate={spinning ? { rotate: 360 } : {}} transition={spinning ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}>
              <Shuffle size={20} />
            </motion.span>
          </motion.button>
        </div>
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
              {options.map((opt) => (
                <motion.div
                  key={opt.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 px-3 py-2.5 bg-paper-2 rounded-lg text-[13px]"
                >
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
