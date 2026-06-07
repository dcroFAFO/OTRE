import React, { useEffect, useState } from "react";
import { listActivities } from "@/services/crmService";
import { ACTIVITY_TYPES } from "@/config/crmConfig";
import { formatDistanceToNow } from "date-fns";
import {
  StickyNote, Phone, Mail, MessageSquare, Calendar, CheckSquare, RefreshCw,
  GitBranch, UserPlus, Paperclip, FileText, Zap, Settings, Loader2
} from "lucide-react";

const ICONS = { StickyNote, Phone, Mail, MessageSquare, Calendar, CheckSquare, RefreshCw, GitBranch, UserPlus, Paperclip, FileText, Zap, Settings };
const typeMap = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.key, t]));

export default function CRMTimeline({ relatedType, relatedId, refreshKey }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    listActivities(relatedType, relatedId).then(setItems);
  }, [relatedType, relatedId, refreshKey]);

  if (items === null) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No activity yet. Log a call, note, email, SMS, or meeting.</p>;
  }

  return (
    <div className="space-y-0">
      {items.map((a, i) => {
        const cfg = typeMap[a.activity_type] || typeMap.note;
        const Icon = ICONS[cfg.icon] || StickyNote;
        return (
          <div key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground shrink-0">
                <Icon className="h-4 w-4" />
              </span>
              {i < items.length - 1 && <span className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="pb-5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{a.title || cfg.label}</span>
                {a.outcome && <span className="text-[11px] text-muted-foreground capitalize">· {a.outcome.replace(/_/g, " ")}</span>}
              </div>
              {a.body && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{a.body}</p>}
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                {a.actor_name || "System"} · {a.activity_date ? formatDistanceToNow(new Date(a.activity_date), { addSuffix: true }) : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}