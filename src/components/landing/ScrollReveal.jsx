import React from "react";
import { motion } from "framer-motion";

/**
 * Lightweight scroll-reveal wrapper.
 * Uses IntersectionObserver via framer-motion's whileInView.
 * No jank — pure CSS transform + opacity only.
 */
export default function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
  as: Tag = "div",
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}