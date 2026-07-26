import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { HERO_SLIDES } from "@/components/landing/heroSlides";

export default function HeroCarousel({ children }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const slide = HERO_SLIDES[index];

  const go = (step) => setIndex((prev) => (prev + step + HERO_SLIDES.length) % HERO_SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % HERO_SLIDES.length), 10000);
    return () => clearInterval(timer);
  }, [paused, index]);

  return (
    <div
      className="relative w-full overflow-hidden border-y border-border bg-foreground shadow-gentle"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[calc(100svh-9rem)] sm:min-h-[calc(100svh-11rem)]">
        {HERO_SLIDES.map((item, i) => (
          <img
            key={item.id}
            src={item.image}
            alt={item.eyebrow}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full transition-opacity duration-[1600ms] ease-in-out ${item.imageFit === "contain" ? "object-contain" : "object-cover"} ${item.imageOrientation === "landscape" ? "rotate-90 scale-[1.35]" : ""} ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />

        <div className="relative mx-auto flex min-h-[calc(100svh-9rem)] w-full max-w-7xl flex-col justify-end p-6 sm:min-h-[calc(100svh-11rem)] sm:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                {slide.eyebrow}
              </span>
              <h1 className="mt-4 font-heading text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {children}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next slide"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="ml-2 flex items-center gap-2">
              {HERO_SLIDES.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}