import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { CONTACT_DETAILS, CONTACT_LINKS } from "@/config/contactDetails";
import HeroCarouselArrow from "@/components/landing/HeroCarouselArrow";

const SLIDES = [
  {
    title: "Service that fits your life, not your lunch break.",
    body: "Open until midnight, every night — so a busy schedule never gets in the way of a repair. Can't make our hours? Get in touch and we'll arrange a time that suits you.",
    image: "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/8412588af_cover.jpg",
    alt: "Three electric scooters parked beside the On The Run mural in Woolloongabba",
  },
  {
    title: "Find us at 11 Lucinda Street, Woolloongabba.",
    body: "Roll in to our Woolloongabba workshop for same-day puncture repairs, brake adjustments and general maintenance — no appointment drama, just honest work.",
    image: "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/8a310eaae_frontwide.jpg",
    alt: "Front of the On The Run Electrics workshop on Lucinda Street",
  },
  {
    title: "Walk in, talk to a real technician.",
    body: "Every repair is explained face to face before we start. You'll know what's wrong, what it costs and how long it takes — before a single tool comes out.",
    image: "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/26be8bb88_frontclose.jpeg",
    alt: "On The Run Electrics shopfront signage and entry door",
  },
  {
    title: "Electrical faults diagnosed properly.",
    body: "Dashboards, controllers, throttles and wiring — we test the whole system instead of guessing, so the fault is fixed once rather than three times.",
    image: "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/ba46b8fea_inmotion.jpg",
    alt: "Electric scooter dashboard display powered on at the workshop",
  },
  {
    title: "Full servicing for every ride.",
    body: "Suspension, bearings, tyres, torque checks and a full safety inspection — routine servicing that keeps your scooter smooth, quiet and safe on Brisbane roads.",
    image: "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/896848d3b_inmotion2.jpg",
    alt: "Electric scooter standing in the workshop after a full service",
  },
  {
    title: "Brakes, tyres and punctures sorted fast.",
    body: "Most punctures, brake pads and tyre swaps are turned around the same day, with quality parts and a proper road test before you pick it up.",
    image: "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/37e8c611b_inmotion3.jpg",
    alt: "Rear wheel, tyre and brake assembly of a serviced electric scooter",
  },
];

const AUTO_MS = 6000;

function randomizeReveal(el) {
  if (!el) return;
  for (let i = 1; i <= 6; i++) {
    el.style.setProperty(`--ic2-x${i}`, `${Math.round(8 + Math.random() * 84)}%`);
    el.style.setProperty(`--ic2-y${i}`, `${Math.round(8 + Math.random() * 84)}%`);
    el.style.setProperty(`--ic2-r${i}`, "0%");
  }
}

export default function HeroCarousel() {
  const { data: { business } } = usePlatformConfig();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const photoRefs = useRef([]);

  const go = useCallback((next) => setIndex((current) => (next(current) + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const el = photoRefs.current[index];
    if (!el) return;
    randomizeReveal(el);
    el.classList.remove("ic2-anim-reveal");
    void el.offsetWidth;
    el.classList.add("ic2-anim-reveal");
  }, [index]);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => go((i) => i + 1), AUTO_MS);
    return () => clearTimeout(timer);
  }, [index, paused, go]);

  const slide = SLIDES[index];

  return (
    <div className="ic2-wrap mx-auto">
      <div
        className="ic2-card border border-border"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="ic2-inner">
          <div className="ic2-header">
            <h1 key={`title-${index}`} className="ic2-title ic2-anim-fade font-heading font-extrabold tracking-tight">
              {slide.title}
            </h1>
          </div>

          <div key={`d1-${index}`} className="ic2-divider ic2-anim-wipe" aria-hidden="true" />

          <div className="ic2-body-row">
            <div className="ic2-image-col">
              {SLIDES.map((item, i) => (
                <img
                  key={item.image}
                  ref={(el) => { photoRefs.current[i] = el; }}
                  className={`ic2-photo${i === index ? " is-active" : ""}`}
                  src={item.image}
                  alt={i === index ? item.alt : ""}
                />
              ))}
              <div className="ic2-navwrap">
                <div key={`nav-${index}`} className="ic2-navinner">
                  <button type="button" className="ic2-navbtn ic2-navbtn-prev" onClick={() => go((i) => i - 1)} aria-label="Previous slide">
                    <HeroCarouselArrow flipped />
                  </button>
                  <button type="button" className="ic2-navbtn ic2-navbtn-next" onClick={() => go((i) => i + 1)} aria-label="Next slide">
                    <HeroCarouselArrow />
                  </button>
                </div>
              </div>
            </div>

            <div className="ic2-text-col">
              <p key={`body-${index}`} className="ic2-body">{slide.body}</p>

              <div>
                <div key={`d2-${index}`} className="ic2-divider ic2-anim-wipe" style={{ width: "100%" }} aria-hidden="true" />
                <div className="ic2-cta-row">
                  <div className="ic2-cta-inner">
                    <Link to={business.primaryCta.target}>
                      <Button size="lg" className="h-11 rounded-xl bg-accent px-5 text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90">
                        Request a repair booking <ArrowRight aria-hidden="true" />
                      </Button>
                    </Link>
                    <a href={CONTACT_LINKS.phone}>
                      <Button size="lg" variant="outline" className="h-11 rounded-xl px-5">
                        <Phone aria-hidden="true" /> Call {CONTACT_DETAILS.phone}
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}