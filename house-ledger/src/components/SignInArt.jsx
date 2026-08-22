import { motion, useReducedMotion } from "framer-motion";

const FLECKS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.round(Math.random() * 1000) / 10,
  y: Math.round(Math.random() * 1000) / 10,
  size: 1 + Math.random() * 1.4,
  delay: Math.round(Math.random() * 400) / 100,
  duration: 3.5 + Math.round(Math.random() * 300) / 100,
}));

// A bigger entrance treatment for the sign-in screen only: dust flecks on
// the desk, a large faint ticket-stub outline (with its own perforated
// edge) tucked in one corner, and a slowly-turning stamp ring in the
// other -- never crossing the card itself, so it stays legible on narrow
// phone widths. BackgroundArt (used elsewhere) stays quieter for everyday
// use.
export default function SignInArt() {
  const reduce = useReducedMotion();

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full">
        {FLECKS.map((d) => (
          <motion.circle
            key={d.id}
            cx={`${d.x}%`}
            cy={`${d.y}%`}
            r={d.size}
            fill="#f3ede2"
            initial={{ opacity: 0.05 }}
            animate={reduce ? { opacity: 0.05 } : { opacity: [0.03, 0.18, 0.03] }}
            transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>

      <svg
        className="absolute -bottom-[10%] -left-[18%] w-[70%] max-w-[340px] aspect-[2/3] opacity-[0.09]"
        viewBox="0 0 140 210"
        fill="none"
        stroke="#f3ede2"
        strokeWidth="1.4"
      >
        <rect x="6" y="6" width="128" height="198" rx="4" />
        <circle cx="6" cy="76" r="7" fill="#3c3934" stroke="none" />
        <circle cx="134" cy="76" r="7" fill="#3c3934" stroke="none" />
        <line x1="18" y1="76" x2="122" y2="76" strokeDasharray="3 4" strokeWidth="1" />
      </svg>

      <motion.svg
        className="absolute -top-[16%] -right-[20%] w-[65%] max-w-[340px] aspect-square opacity-[0.12]"
        viewBox="0 0 200 200"
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="96" fill="none" stroke="#c1452e" strokeWidth="1.4" strokeDasharray="1 7" />
        <circle cx="100" cy="100" r="74" fill="none" stroke="#c1452e" strokeWidth="1" />
      </motion.svg>
    </div>
  );
}
