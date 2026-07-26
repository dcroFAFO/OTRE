import React from "react";

const HERO_IMAGE = "https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/1b9e3fe67_cover.jpg";

export default function HeroBackdrop({ children }) {
  return (
    <div className="relative isolate overflow-hidden">
      <img
        src={HERO_IMAGE}
        alt="Electric scooters parked in front of the On The Run mural in Woolloongabba"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-slate-950/65" aria-hidden="true" />
      {children}
    </div>
  );
}