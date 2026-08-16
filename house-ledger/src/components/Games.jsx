import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Dices } from "lucide-react";
import { supabase } from "../supabaseClient";
import SectionLabel from "./SectionLabel";

const PALETTE = ["#F0B429", "#E2572E", "#9BC53D", "#C2703D", "#D4A017", "#8B5A2B", "#F2994A", "#B8461F"];
const inputClass = "w-full px-3 py-3 text-[15px] border border-charcoal/20 rounded-lg bg-paper-2 text-charcoal";

export default function Games({ games, refresh, onCelebrate }) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const timeoutRef = useRef(null);

  const total = games.reduce((s, g) => s + Number(g.weight), 0);

  const segments = useMemo(() => {
    let acc = 0;
    return games.map((g, i) => {
      const angle = total > 0 ? (360 * Number(g.weight)) / total : 0;
      const seg = { ...g, start: acc, angle, color: PALETTE[i % PALETTE.length] };
      acc += angle;
      return seg;
    });
  }, [games, total]);

  const gradient =
    segments.length > 0
      ? `conic-gradient(${segments.map((s) => `${s.color} ${s.start}deg ${s.start + s.angle}deg`).join(", ")})`
      : "#F5ECD9";

  const addGame = async () => {
    const n = name.trim();
    const w = parseFloat(weight) || 1;
    if (!n) return;
    await supabase.from("games").insert({ name: n, weight: w });
    setName("");
    setWeight("1");
    await refresh();
  };

  const deleteGame = async (id) => {
    await supabase.from("games").delete().eq("id", id);
    await refresh();
  };

  const updateWeight = async (id, w) => {
    await supabase.from("games").update({ weight: w }).eq("id", id);
    await refresh();
  };

  const spin = () => {
    if (segments.length < 2 || spinning) return;
    setWinner(null);
    setSpinning(true);
    const r = Math.random() * total;
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
      onCelebrate("spin");
    }, 4200);
  };

  return (
    <div>
      <SectionLabel n="🎲" title="Spin for game night" />

      {games.length === 0 ? (
        <div className="text-[13px] opacity-55 italic py-2 mb-4">
          The wheel needs at least two games to spin. Add your favorites below — give the ones you love more weight.
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
              <Dices size={22} />
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
            Tonight's game: <strong>{winner.name}</strong>
          </motion.div>
        )}
      </AnimatePresence>

      {segments.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-6">
          {segments.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-[13px]">
              <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: s.color }} />
              <span className="flex-1">{s.name}</span>
              <span className="text-[11.5px] opacity-55">{Math.round((s.angle / 360) * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <SectionLabel n="+" title="Manage games" />
      <div className="flex flex-col gap-2 mb-4">
        <AnimatePresence initial={false}>
          {games.map((g) => (
            <motion.div
              key={g.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 text-[13px]"
            >
              <span className="flex-1">{g.name}</span>
              <input
                className={`${inputClass} w-16 text-center py-2 px-1.5`}
                inputMode="decimal"
                value={g.weight}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  updateWeight(g.id, v === "" ? 0 : parseFloat(v));
                }}
              />
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => deleteGame(g.id)} title="Remove game" className="bg-transparent border-none text-rust/60 cursor-pointer p-2">
                <X size={14} />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1 min-w-0`}
          placeholder="Add a game, e.g. Splendor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addGame()}
        />
        <input
          className={`${inputClass} w-14 text-center`}
          inputMode="decimal"
          placeholder="wt"
          value={weight}
          onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ""))}
        />
        <motion.button whileTap={name.trim() ? { scale: 0.9 } : {}} onClick={addGame} disabled={!name.trim()} className="w-[46px] shrink-0 rounded-lg btn-gradient flex items-center justify-center disabled:opacity-40">
          <Plus size={18} />
        </motion.button>
      </div>
      <div className="text-[11.5px] opacity-55 mt-2">
        Weight controls the odds — a game with weight 2 is twice as likely to be picked as one with weight 1.
      </div>
    </div>
  );
}
