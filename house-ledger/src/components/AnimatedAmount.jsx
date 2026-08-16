import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

// Smoothly tweens a dollar amount whenever `value` changes, instead of snapping.
export default function AnimatedAmount({ value, className }) {
  const spring = useSpring(value, { stiffness: 140, damping: 20 });
  const display = useTransform(spring, (v) => {
    const sign = v < 0 ? "-" : "";
    return `${sign}$${Math.abs(v).toFixed(2)}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [value]);

  return <motion.span className={className}>{display}</motion.span>;
}
