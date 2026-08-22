// Flat inks, not glossy gradients -- each housemate gets a stamp color.
const INKS = ["#c1452e", "#35507a", "#5c7a45", "#b8862c", "#7a3f5c", "#2f7a72"];

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
  const ink = INKS[hashStr(name) % INKS.length];
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full font-semibold text-paper leading-none ${
        ring ? "ring-2 ring-paper/40" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.38),
        background: ink,
        boxShadow: "0 2px 5px -1px rgba(38, 34, 29, 0.4)",
      }}
    >
      {initials(name)}
    </span>
  );
}
