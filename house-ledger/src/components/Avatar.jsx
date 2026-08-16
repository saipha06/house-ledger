const GRADIENTS = [
  ["#f0b429", "#e2572e"],
  ["#e2572e", "#c2703d"],
  ["#9bc53d", "#f0b429"],
  ["#c2703d", "#8b5a2b"],
  ["#f5b942", "#b8461f"],
  ["#d4a017", "#9bc53d"],
];

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name = "?", size = 32, ring = false, className = "" }) {
  const [from, to] = GRADIENTS[hashStr(name) % GRADIENTS.length];
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full font-semibold text-white leading-none ${
        ring ? "ring-2 ring-white/15" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.38),
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 3px 12px -3px ${from}80`,
      }}
    >
      {initials(name)}
    </span>
  );
}
