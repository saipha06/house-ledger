import { motion, useReducedMotion } from "framer-motion";

const DOTS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: Math.round(Math.random() * 1000) / 10,
  y: Math.round(Math.random() * 1000) / 10,
  size: 1.4 + Math.random() * 1.8,
  delay: Math.round(Math.random() * 400) / 100,
  duration: 3 + Math.round(Math.random() * 300) / 100,
}));

// Decorative, non-interactive layer: twinkling dots, slow-rotating orbit
// rings, and a faint tiled roofline motif. Sits behind app content.
export default function BackgroundArt() {
  const reduce = useReducedMotion();

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {DOTS.map((d) => (
          <motion.circle
            key={d.id}
            cx={`${d.x}%`}
            cy={`${d.y}%`}
            r={d.size}
            fill="#f5ecd9"
            initial={{ opacity: 0.12 }}
            animate={reduce ? { opacity: 0.12 } : { opacity: [0.08, 0.45, 0.08] }}
            transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>

      <motion.svg
        className="absolute -top-[15%] -right-[20%] w-[70%] h-[70%] opacity-[0.07]"
        viewBox="0 0 200 200"
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="96" fill="none" stroke="#f0b429" strokeWidth="0.6" strokeDasharray="1 6" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#c2703d" strokeWidth="0.6" />
      </motion.svg>

      <motion.svg
        className="absolute -bottom-[10%] -left-[15%] w-[55%] h-[55%] opacity-[0.06]"
        viewBox="0 0 200 200"
        animate={reduce ? {} : { rotate: -360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="80" fill="none" stroke="#9bc53d" strokeWidth="0.6" strokeDasharray="1 8" />
      </motion.svg>

      <svg className="absolute inset-x-0 bottom-0 w-full h-[110px] opacity-[0.055]" preserveAspectRatio="none">
        <defs>
          <pattern id="casa-roofline" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M0 60 L0 42 L15 24 L30 42 L30 60 M30 60 L30 34 L45 18 L60 34 L60 60"
              fill="none"
              stroke="#e8c078"
              strokeWidth="1.1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#casa-roofline)" />
      </svg>
    </div>
  );
}
