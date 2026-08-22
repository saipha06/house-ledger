import { motion, useReducedMotion } from "framer-motion";

const FLECKS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: Math.round(Math.random() * 1000) / 10,
  y: Math.round(Math.random() * 1000) / 10,
  size: 1 + Math.random() * 1.3,
  delay: Math.round(Math.random() * 400) / 100,
  duration: 4 + Math.round(Math.random() * 300) / 100,
}));

// Decorative, non-interactive layer: a few faint dust flecks on the desk,
// and a row of perforation dots along the bottom edge, echoing the
// punched-paper motif used on every ticket card. Sits behind app content.
export default function BackgroundArt() {
  const reduce = useReducedMotion();

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {FLECKS.map((d) => (
          <motion.circle
            key={d.id}
            cx={`${d.x}%`}
            cy={`${d.y}%`}
            r={d.size}
            fill="#f3ede2"
            initial={{ opacity: 0.05 }}
            animate={reduce ? { opacity: 0.05 } : { opacity: [0.03, 0.14, 0.03] }}
            transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>

      <svg className="absolute inset-x-0 bottom-0 w-full h-4 opacity-[0.12]" preserveAspectRatio="none">
        <defs>
          <pattern id="casa-perf" width="18" height="16" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="0" r="3.5" fill="none" stroke="#f3ede2" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#casa-perf)" />
      </svg>
    </div>
  );
}
