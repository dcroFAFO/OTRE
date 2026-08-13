import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { HERO_SLIDES } from "@/components/landing/heroSlides";

const AUTOPLAY_DELAY_MS = 8000;
const SWIPE_THRESHOLD_PX = 48;

export default function HeroCarousel({ children }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const swipeStart = useRef(null);
  const reduceMotion = useReducedMotion();
  const slide = HERO_SLIDES[index];

  const go = (step) => {
    setIndex((current) => (current + step + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  useEffect(() => {
    if (paused || reduceMotion || HERO_SLIDES.length < 2) return undefined;

    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, AUTOPLAY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [index, paused, reduceMotion]);

  useEffect(() => {
    const nextSlide = HERO_SLIDES[(index + 1) % HERO_SLIDES.length];
    if (!nextSlide) return;

    const image = new Image();
    image.src = nextSlide.image;
  }, [index]);

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    setPaused(true);
  };

  const handleTouchEnd = (event) => {
    const start = swipeStart.current;
    const touch = event.changedTouches[0];
    swipeStart.current = null;
    setPaused(false);

    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (isHorizontalSwipe) go(deltaX > 0 ? -1 : 1);
  };

  return (
    <section
      aria-label="On The Run Electrics electric scooter repair services"
      aria-roledescription="carousel"
      className="relative w-full touch-pan-y overflow-hidden border-y border-border bg-foreground shadow-gentle"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        swipeStart.current = null;
        setPaused(false);
      }}
    >
      <div className="relative min-h-[82svh] lg:min-h-[88svh]">
        {/* Full-bleed background image (all viewports) */}
        <div className="absolute inset-0 overflow-hidden bg-black">
          <AnimatePresence initial={false}>
            <motion.img
              key={slide.id}
              src={slide.image}
              alt={slide.alt}
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeInOut" }}
              style={/** @type {any} */ ({ "--desktop-position": slide.desktopPosition })}
              className="absolute inset-0 h-full w-full object-cover [object-position:center_center] lg:[object-position:var(--desktop-position)]"
            />
          </AnimatePresence>
          {/* Legibility overlays — visible on every viewport so copy stays readable over the photo */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent sm:from-black/50" aria-hidden="true" />
        </div>

        {/* Edge tap zones — tap left/right to change slide (invisible, non-blocking) */}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous slide"
          className="absolute left-0 top-0 z-10 h-full w-12 cursor-pointer bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 sm:w-16"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next slide"
          className="absolute right-0 top-0 z-10 h-full w-12 cursor-pointer bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 sm:w-16"
          tabIndex={-1}
        />

        {/* Foreground content */}
        <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col px-5 pb-8 pt-24 text-white sm:px-8 sm:pb-10 sm:pt-28 lg:min-h-[88svh] lg:justify-end lg:pb-12">
          <h1 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Electric Scooter Repairs Brisbane
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Repairs, servicing and diagnostics from our Woolloongabba workshop, with online booking and clear job updates.
          </p>

          <div className="mt-5 min-h-[9rem] sm:min-h-[7.5rem]" aria-live={paused ? "polite" : "off"}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${HERO_SLIDES.length}: ${slide.title}`}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
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
          </div>

          {children}

          <div className="mt-7 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next slide"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="ml-1 flex items-center" role="group" aria-label="Choose a slide">
              {HERO_SLIDES.map((item, slideIndex) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(slideIndex)}
                  aria-label={`Show ${item.eyebrow}`}
                  aria-current={slideIndex === index ? "true" : undefined}
                  className="grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all ${slideIndex === index ? "w-6 bg-white" : "w-3 bg-white/40 hover:bg-white/70"}`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
