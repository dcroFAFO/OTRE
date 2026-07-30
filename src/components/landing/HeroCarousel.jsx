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
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, [paused, index]);

  // Preload only the next image so mobile never downloads all slides at once.
  useEffect(() => {
    const next = (index + 1) % HERO_SLIDES.length;
    const url = HERO_SLIDES[next]?.image;
    if (url) {
      const img = new Image();
      img.src = url;
    }
  }, [index]);

  return (
    <section
      aria-label="On The Run Electrics electric scooter repair services"
      aria-roledescription="carousel"
      className="relative w-full overflow-hidden border-y border-border bg-foreground shadow-gentle"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[88svh]">
        <AnimatePresence>
          <motion.img
            key={slide.id}
            src={slide.image}
            alt={slide.eyebrow}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />

        <div className="relative mx-auto flex min-h-[88svh] w-full max-w-7xl flex-col justify-end p-6 sm:p-12">
          {/* Stable, SEO-optimised H1 — does not rotate so search engines always
              index the primary keyword target for this page. */}
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Electric Scooter Repairs Brisbane
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Expert repairs, servicing and diagnostics in Woolloongabba — open until midnight, 7 days a week.
          </p>

          {/* Rotating service highlight (secondary content, not the H1) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                {slide.eyebrow}
              </span>
              <h2 className="mt-3 font-heading text-xl font-bold text-white sm:text-2xl">
                {slide.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
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
              className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next slide"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
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
                  aria-current={i === index}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}