import { motion, useReducedMotion } from "framer-motion";

const DOTS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.round(Math.random() * 1000) / 10,
  y: Math.round(Math.random() * 1000) / 10,
  size: 1.2 + Math.random() * 1.8,
  delay: Math.round(Math.random() * 400) / 100,
  duration: 3 + Math.round(Math.random() * 300) / 100,
}));

// A bigger, more dramatic entrance treatment for the sign-in screen only:
// a pulsing aurora wash behind the card, plus a large house-outline and
// halo ring tucked into the corners (never crossing the card itself, so
// it stays legible on narrow phone widths). BackgroundArt (used
// elsewhere) stays smaller/quieter for everyday use.
export default function SignInArt() {
  const reduce = useReducedMotion();

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] aspect-square rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(240,176,41,0.3) 0%, rgba(226,87,46,0.16) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={reduce ? {} : { scale: [1, 1.1, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg className="absolute inset-0 w-full h-full">
        {DOTS.map((d) => (
          <motion.circle
            key={d.id}
            cx={`${d.x}%`}
            cy={`${d.y}%`}
            r={d.size}
            fill="#f5ecd9"
            initial={{ opacity: 0.12 }}
            animate={reduce ? { opacity: 0.12 } : { opacity: [0.08, 0.55, 0.08] }}
            transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>

      <svg
        className="absolute -bottom-[12%] -left-[22%] w-[75%] max-w-[380px] aspect-square opacity-[0.1]"
        viewBox="0 0 200 200"
        fill="none"
        stroke="#e8c078"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30 185 L30 95 L100 30 L170 95 L170 185" />
        <path d="M70 185 L70 130 L130 130 L130 185" />
      </svg>

      <motion.svg
        className="absolute -top-[18%] -right-[24%] w-[75%] max-w-[380px] aspect-square opacity-[0.14]"
        viewBox="0 0 200 200"
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="99" fill="none" stroke="#f0b429" strokeWidth="0.6" strokeDasharray="0.5 6" />
        <circle cx="100" cy="100" r="75" fill="none" stroke="#c2703d" strokeWidth="0.5" />
      </motion.svg>
    </div>
  );
}
