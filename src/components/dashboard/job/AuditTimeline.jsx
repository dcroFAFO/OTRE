import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, MessageSquare, RefreshCw, Lock, Wrench, Mail, Bell } from "lucide-react";
import { format } from "date-fns";

const eventIcon = (type) => {
  if (type === "note") return MessageSquare;
  if (type === "private_notes_updated") return Lock;
  if (type?.includes("status") || type?.includes("rescheduled") || type?.includes("reopened")) return RefreshCw;
  if (type?.includes("notification") || type?.includes("email") || type?.includes("sms")) return Bell;
  return Wrench;
};

export default function AuditTimeline({ job, refreshKey }) {
  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!job?.id) return;
    base44.functions.invoke("jobActions", { action: "list_activity", jobId: job.id })
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]));

    // Fetch notification deliveries for this job
    base44.entities.NotificationDelivery.filter({ job_id: job.id }, "-created_time", 50)
      .then((rows) => setNotifications(rows || []))
      .catch(() => setNotifications([]));
  }, [job?.id, refreshKey]);

  // Merge activity items and notification deliveries into a single timeline
  const merged = [
    ...items.map((item) => ({
      id: `activity-${item.id}`,
      title: item.title,
      detail: item.detail,
      actor: item.actor,
      date: item.date,
      type: item.type,
      visibility: item.visibility,
      channel: null,
    })),
    ...notifications.map((n) => ({
      id: `notif-${n.id}`,
      title: `Notification sent (${n.channel || "—"})`,
      detail: n.failure_reason || (n.delivery_status === "delivered" ? "Delivered successfully" : n.delivery_status),
      actor: n.recipient_address || "—",
      date: n.send_time || n.scheduled_for || n.created_time,
      type: "notification",
      visibility: "system",
      channel: n.channel,
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading font-bold flex items-center gap-1.5">
          <History className="h-4 w-4 text-muted-foreground" /> Activity timeline
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Detailed log of every event, notification, and status change for this job.</p>
      </div>

      <ol className="relative border-l border-border ml-3 space-y-5">
        {merged.map((item) => {
          const Icon = eventIcon(item.type);
          return (
            <li key={item.id} className="ml-6">
              <span className="absolute -left-3 grid h-6 w-6 place-items-center rounded-full border border-border bg-card shadow-sm">
                <Icon className="h-3.5 w-3.5 text-accent" />
              </span>
              <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.channel && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        {item.channel === "email" ? <Mail className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                        {item.channel}
                      </span>
                    )}
                    {item.visibility && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                        {item.visibility}
                      </span>
                    )}
                  </div>
                </div>
                {item.detail && <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{item.detail}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {item.actor} · {item.date ? format(new Date(item.date), "d MMM yyyy, h:mm a") : "Unknown time"}
                </p>
              </div>
            </li>
          );
        })}
        {merged.length === 0 && <p className="ml-6 text-sm text-muted-foreground">No activity yet.</p>}
      </ol>
    </div>
  );
}