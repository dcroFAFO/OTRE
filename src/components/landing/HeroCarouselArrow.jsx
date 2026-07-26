import React from "react";

export default function HeroCarouselArrow({ flipped = false }) {
  const transform = flipped ? "scale(-1,1) translate(-29,0)" : undefined;
  return (
    <svg viewBox="0 0 29 29" fill="none" aria-hidden="true">
      <path
        d="M5.19171 0.579403H23.8089C26.3561 0.57954 28.4212 2.64446 28.4212 5.19171V23.8089C28.4211 26.356 26.356 28.4211 23.8089 28.4212H5.19171C2.64446 28.4212 0.57954 26.3561 0.579403 23.8089V5.19171C0.579403 2.64438 2.64438 0.579403 5.19171 0.579403Z"
        fill="var(--ic2-card)"
        stroke="var(--ic2-text)"
        strokeWidth="0.8"
      />
      <path
        d="M17.6151 7.33058L20.4149 10.5439C22.3196 12.7296 22.3196 16.2722 20.4149 18.458L17.6151 21.6713"
        stroke="var(--ic2-text)"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.97"
        transform={transform}
      />
      <path d="M21.8377 14.5591H7.16228" stroke="var(--ic2-text)" strokeWidth="0.8" strokeLinecap="round" transform={transform} />
    </svg>
  );
}