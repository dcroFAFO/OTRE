import React from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus, Wrench, Receipt, MessageSquare, StickyNote, RefreshCw, Loader2, ExternalLink, Inbox
} from "lucide-react";

const ICONS = { UserPlus, Wrench, Receipt, MessageSquare, StickyNote, RefreshCw };

// Renders the unified, real history returned by the customerHistory function.
export default function ClientHistoryTimeline({ timeline, loading }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8">
        <Inbox className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No history recorded for this client yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {timeline.map((e, i) => {
        const Icon = ICONS[e.icon] || RefreshCw;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground shrink-0"><Icon className="h-4 w-4" /></span>
              {i < timeline.length - 1 && <span className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="pb-5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{e.title}</span>
                {e.link && <Link to={e.link} className="text-accent hover:underline"><ExternalLink className="h-3 w-3" /></Link>}
              </div>
              {e.subtitle && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{e.subtitle}</p>}
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                {e.author ? `${e.author} · ` : ""}{e.date ? formatDistanceToNow(new Date(e.date), { addSuffix: true }) : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}