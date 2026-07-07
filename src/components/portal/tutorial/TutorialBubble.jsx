import React from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

// Game-style guide bubble that always floats in the tutorial foreground layer.
export default function TutorialBubble({ title, text, onNext, onClose, nextLabel = "Next", arrow, className = "" }) {
  return (
    <div className={`pointer-events-auto relative w-full max-w-sm ${className}`}>
      {arrow === "up" && (
        <div className="absolute -top-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-accent bg-card" />
      )}
      <div className="rounded-2xl border-2 border-accent bg-card p-4 shadow-[0_0_0_4px_hsl(var(--accent)/0.15),0_16px_48px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent"><Sparkles className="h-4 w-4" /></span>
            <h3 className="font-heading text-sm font-extrabold">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-secondary" aria-label="Close tutorial"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={onNext} className="bg-accent text-accent-foreground hover:bg-accent/90">{nextLabel}</Button>
        </div>
      </div>
      {arrow === "down" && (
        <div className="absolute -bottom-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-accent bg-card" />
      )}
    </div>
  );
}