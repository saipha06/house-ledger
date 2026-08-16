import { motion } from "framer-motion";

export default function SectionLabel({ n, title }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-baseline gap-2.5 font-display text-[15px] font-semibold mb-3.5 text-charcoal"
    >
      <span className="font-mono text-[11px] font-normal text-brass tracking-wide">{n}</span>
      <span>{title}</span>
    </motion.div>
  );
}
