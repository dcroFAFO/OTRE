import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function TutorialBubble({ title, text, onNext, onClose, nextLabel = "Next", className = "" }) {
  return (
    <div className={`pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-sm font-extrabold">{title}</h3>
        <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-secondary" aria-label="Close tutorial"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        <Button size="sm" onClick={onNext} className="bg-accent text-accent-foreground hover:bg-accent/90">{nextLabel}</Button>
      </div>
    </div>
  );
}