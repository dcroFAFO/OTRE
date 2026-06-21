import React, { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import FeedbackModal from "./FeedbackModal";

// Floating "Send Feedback" button — only shown to logged-in users on the
// customer portal (staff don't leave feedback).
const FEEDBACK_PATHS = ["/portal"];

export default function FeedbackButton() {
  const { user } = useCurrentUser();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (!user || !FEEDBACK_PATHS.includes(pathname)) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-4 w-4 text-accent" />
        <span className="hidden sm:inline">Send Feedback</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} user={user} />
    </>
  );
}