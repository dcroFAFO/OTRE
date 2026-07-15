import React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { LANDING_LOGO_URL } from "@/components/landing/LandingLogo";

export default function LandingParallaxBackground({ heroRef }) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [heroHeight, setHeroHeight] = React.useState(900);

  React.useEffect(() => {
    const hero = heroRef?.current;
    if (!hero) return undefined;
    const measure = () => setHeroHeight(hero.offsetHeight || window.innerHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroRef]);

  const logoY = useTransform(scrollY, [0, 2200], reduceMotion ? [0, 0] : [0, -180]);
  const glowY = useTransform(scrollY, [0, 2200], reduceMotion ? [0, 0] : [0, -90]);
  const colourOpacity = useTransform(
    scrollY,
    reduceMotion ? [0, heroHeight * 0.7, heroHeight * 0.71] : [0, heroHeight * 0.2, heroHeight * 0.85],
    reduceMotion ? [0.58, 0.58, 0] : [0.58, 0.4, 0]
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
        className="absolute left-[58%] top-24 w-[560px] -translate-x-1/2 opacity-[0.045] blur-[0.2px] saturate-150 will-change-transform sm:left-1/2 sm:top-8 sm:w-[1080px] sm:opacity-[0.075] lg:left-[34%] lg:w-[1220px]"
      />
      <motion.img
        style={{ y: logoY, opacity: colourOpacity }}
        src={LANDING_LOGO_URL}
        alt=""
        className="absolute left-[58%] top-24 w-[560px] -translate-x-1/2 blur-[0.2px] saturate-150 will-change-[transform,opacity] sm:left-1/2 sm:top-8 sm:w-[1080px] lg:left-[34%] lg:w-[1220px]"
      />
      <motion.img
        style={{ y: logoY }}
        src={LANDING_LOGO_URL}
        alt=""
        className="absolute left-[62%] top-[118vh] hidden w-[1050px] -translate-x-1/2 opacity-[0.045] blur-[0.2px] saturate-150 will-change-transform md:block xl:w-[1280px]"
      />
      <div className="absolute inset-0 bg-background/78 sm:bg-background/62" />
    </div>
  );
}