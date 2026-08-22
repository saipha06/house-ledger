import { motion } from "framer-motion";

function polarToXY(cx, cy, radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + radius * Math.sin(rad), cy - radius * Math.cos(rad)];
}

function truncateLabel(name, maxChars) {
  if (name.length <= maxChars) return name;
  return `${name.slice(0, maxChars - 1).trimEnd()}…`;
}

// A labeled pie wheel, built as SVG so the circle is always crisp (no
// conic-gradient/border-radius clipping artifacts) and each slice can
// carry its own readable, correctly-rotated text label.
export default function Wheel({ segments, rotation, spinning, onSpin, size = 220, Icon }) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const sliceR = r - 2;
  const labelR = r * 0.62;
  const maxChars = segments.length <= 3 ? 14 : segments.length <= 5 ? 11 : segments.length <= 7 ? 8 : 6;
  const disabled = spinning || segments.length < 2;

  return (
    <div className="relative mx-auto mt-2 mb-[18px]" style={{ width: size, height: size }}>
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[16px] border-t-charcoal" />

      <div className="w-full h-full rounded-full shadow-[0_10px_36px_-10px_rgba(0,0,0,0.6)]">
        <motion.div
          animate={{ rotate: rotation }}
          transition={spinning ? { duration: 4.2, ease: [0.15, 0.65, 0.1, 1] } : { duration: 0 }}
          className="w-full h-full rounded-full overflow-hidden border-4 border-white/20"
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            {segments.length === 1 ? (
              <circle cx={cx} cy={cy} r={sliceR} fill={segments[0].color} />
            ) : (
              segments.map((s) => {
                const [x1, y1] = polarToXY(cx, cy, sliceR, s.start);
                const [x2, y2] = polarToXY(cx, cy, sliceR, s.start + s.angle);
                const largeArc = s.angle > 180 ? 1 : 0;
                const d = `M ${cx} ${cy} L ${x1} ${y1} A ${sliceR} ${sliceR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                return <path key={s.id ?? s.name} d={d} fill={s.color} stroke="rgba(247,244,236,0.5)" strokeWidth="1" />;
              })
            )}
            {segments.length > 1 &&
              segments.map((s) => {
                const mid = s.start + s.angle / 2;
                const [lx, ly] = polarToXY(cx, cy, labelR, mid);
                const textRot = mid > 90 && mid < 270 ? mid + 180 : mid;
                return (
                  <text
                    key={`${s.id ?? s.name}-label`}
                    x={lx}
                    y={ly}
                    fill="#f7f4ec"
                    fontSize="10.5"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRot} ${lx} ${ly})`}
                  >
                    {truncateLabel(s.name, maxChars)}
                  </text>
                );
              })}
          </svg>
        </motion.div>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSpin}
        disabled={disabled}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-paper border-[3px] border-charcoal flex items-center justify-center text-charcoal z-30"
      >
        <motion.span animate={spinning ? { rotate: 360 } : {}} transition={spinning ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}>
          <Icon size={20} />
        </motion.span>
      </motion.button>
    </div>
  );
}
