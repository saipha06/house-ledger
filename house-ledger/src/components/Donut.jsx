import { motion } from "framer-motion";

// Generic ring chart: draws each segment as its own animated stroke around a
// shared circle, positioned back-to-front via strokeDashoffset. Used
// anywhere a value needs to read as "share of a whole" at a glance rather
// than as a number in a list.
export default function Donut({ segments, size = 128, thickness = 16, centerValue, centerLabel }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-charcoal/8" />
        {total > 0 &&
          segments
            .filter((seg) => seg.value > 0)
            .map((seg, i) => {
              const length = (seg.value / total) * circumference;
              const dashoffset = -cumulative;
              cumulative += length;
              return (
                <motion.circle
                  key={seg.label + i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={thickness}
                  strokeDashoffset={dashoffset}
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray: `${length} ${circumference - length}` }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
                />
              );
            })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
        <div className="font-mono text-lg font-semibold leading-tight text-center">{centerValue}</div>
        {centerLabel && <div className="text-[9px] opacity-55 uppercase tracking-wide mt-0.5 text-center">{centerLabel}</div>}
      </div>
    </div>
  );
}
