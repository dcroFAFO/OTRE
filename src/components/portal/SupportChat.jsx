import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const AGENT_NAME = "support_assistant";

export default function SupportChat({ user }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // Create a conversation the first time the chat is opened
  useEffect(() => {
    if (!open || conversation) return;
    base44.agents
      .createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: `Support · ${user?.full_name || "Customer"}` },
      })
      .then(setConversation);
  }, [open, conversation, user]);

  // Subscribe to live updates for the active conversation
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setSending(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setInput("");
    setSending(true);
    await base44.agents.addMessage(conversation, { role: "user", content: text });
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 transition-transform hover:scale-105"
        aria-label="Open support chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[32rem] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/20"><Sparkles className="h-4 w-4 text-accent" /></span>
            <div>
              <p className="text-sm font-semibold leading-tight">Support Assistant</p>
              <p className="text-[11px] opacity-80">Ask about bookings or your repair</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="mx-auto mb-2 h-7 w-7 opacity-40" />
                Hi {user?.full_name?.split(" ")[0] || "there"}! Ask me about your repair, bookings, or how things work.
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Type a message…"
                className="max-h-28 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ message }) {
  const isUser = message.role === "user";
  if (!message.content) return null;
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "border border-border bg-secondary/50"
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}