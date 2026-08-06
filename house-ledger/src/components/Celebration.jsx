import { useEffect, useState } from "react";

const EXPENSE_EMOJI = ["💵", "💸", "🧾"];
const SETTLE_EMOJI = ["🎉", "💰", "✨", "🙌", "✅"];

// Renders a short burst of emoji particles, then unmounts itself.
// type: "expense" (small, quick) | "settle" (bigger, longer)
export default function Celebration({ type, onDone }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!type) return;
    const set = type === "settle" ? SETTLE_EMOJI : EXPENSE_EMOJI;
    const count = type === "settle" ? 26 : 14;
    const next = Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: set[Math.floor(Math.random() * set.length)],
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      duration: 1.1 + Math.random() * 0.9,
      size: 18 + Math.random() * 20,
      drift: (Math.random() - 0.5) * 140,
      rotate: (Math.random() - 0.5) * 360,
    }));
    setParticles(next);
    const timeout = setTimeout(() => {
      setParticles([]);
      onDone?.();
    }, type === "settle" ? 2000 : 1400);
    return () => clearTimeout(timeout);
  }, [type]);

  if (!type || particles.length === 0) return null;

  return (
    <div style={overlay}>
      <style>{keyframes}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            bottom: "-40px",
            fontSize: p.size,
            animation: `celebrate-rise ${p.duration}s ease-out ${p.delay}s forwards`,
            "--drift": `${p.drift}px`,
            "--rotate": `${p.rotate}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
  zIndex: 999,
};

const keyframes = `
  @keyframes celebrate-rise {
    0% {
      transform: translate(0, 0) rotate(0deg);
      opacity: 0;
    }
    12% {
      opacity: 1;
    }
    100% {
      transform: translate(var(--drift), -90vh) rotate(var(--rotate));
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    [style*="celebrate-rise"] { animation: none !important; opacity: 0 !important; }
  }
`;
