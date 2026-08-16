import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EXPENSE_EMOJI = ["💵", "💸", "🧾"];
const SETTLE_EMOJI = ["🎉", "💰", "✨", "🙌", "✅"];
const SPIN_EMOJI = ["🎲", "🎉", "✨", "🕹️"];

// Renders a short burst of emoji particles, then unmounts itself.
// type: "expense" (small, quick) | "settle" | "spin" (bigger, longer)
export default function Celebration({ type, onDone }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!type) return;
    const big = type === "settle" || type === "spin";
    const set = type === "settle" ? SETTLE_EMOJI : type === "spin" ? SPIN_EMOJI : EXPENSE_EMOJI;
    const count = big ? 24 : 12;
    const next = Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      emoji: set[Math.floor(Math.random() * set.length)],
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      duration: 1.1 + Math.random() * 0.8,
      size: 18 + Math.random() * 20,
      drift: (Math.random() - 0.5) * 140,
      rotate: (Math.random() - 0.5) * 320,
    }));
    setParticles(next);
    const timeout = setTimeout(() => {
      setParticles([]);
      onDone?.();
    }, big ? 2000 : 1400);
    return () => clearTimeout(timeout);
  }, [type]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[999]">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
            animate={{ y: "-90vh", x: p.drift, rotate: p.rotate, opacity: [0, 1, 1, 0] }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
            style={{ position: "absolute", left: `${p.left}%`, bottom: -40, fontSize: p.size }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
