import React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { LANDING_LOGO_URL } from "@/components/landing/LandingLogo";

export default function LandingParallaxBackground({ heroRef }) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const logoY = useTransform(scrollY, [0, 2200], reduceMotion ? [0, 0] : [0, -180]);
  const glowY = useTransform(scrollY, [0, 2200], reduceMotion ? [0, 0] : [0, -90]);
  const colourOpacity = useTransform(
    heroProgress,
    reduceMotion ? [0, 0.98, 1] : [0, 0.45, 1],
    reduceMotion ? [0.5, 0.5, 0] : [0.5, 0.32, 0]
  );

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 otr-grid-bg opacity-[0.10] sm:opacity-[0.14]" />
      <motion.div style={{ y: glowY }} className="absolute inset-0 will-change-transform">
        <div className="absolute -top-36 -right-32 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[90px] sm:h-[560px] sm:w-[560px]" />
        <div className="absolute top-[42vh] -left-48 h-[360px] w-[360px] rounded-full bg-accent/8 blur-[90px] sm:h-[480px] sm:w-[480px]" />
        <div className="absolute bottom-[-10rem] right-[12vw] h-[360px] w-[360px] rounded-full bg-accent/8 blur-[100px] sm:h-[520px] sm:w-[520px]" />
      </motion.div>
      <motion.img
        style={{ y: logoY }}
        src={LANDING_LOGO_URL}
        alt=""
        className="absolute left-1/2 top-16 w-[720px] -translate-x-1/2 opacity-[0.055] blur-[0.2px] saturate-150 will-change-transform sm:top-8 sm:w-[1080px] sm:opacity-[0.075] lg:left-[34%] lg:w-[1220px]"
      />
      <motion.img
        style={{ y: logoY, opacity: colourOpacity }}
        src={LANDING_LOGO_URL}
        alt=""
        className="absolute left-1/2 top-16 w-[720px] -translate-x-1/2 blur-[0.2px] saturate-150 will-change-[transform,opacity] sm:top-8 sm:w-[1080px] lg:left-[34%] lg:w-[1220px]"
      />
      <motion.img
        style={{ y: logoY }}
        src={LANDING_LOGO_URL}
        alt=""
        className="absolute left-[62%] top-[118vh] hidden w-[1050px] -translate-x-1/2 opacity-[0.045] blur-[0.2px] saturate-150 will-change-transform md:block xl:w-[1280px]"
      />
      <div className="absolute inset-0 bg-background/72 sm:bg-background/62" />
    </div>
  );
}