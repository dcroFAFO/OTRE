import React, { useState } from "react";
import { Facebook, Twitter, Linkedin, MessageCircle, Link2, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "x",
    label: "X",
    icon: Twitter,
    color: "hover:bg-black hover:text-white hover:border-black",
    getUrl: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]",
    getUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    getUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  {
    key: "email",
    label: "Email",
    icon: Mail,
    color: "hover:bg-accent hover:text-accent-foreground hover:border-accent",
    getUrl: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
];

export default function BlogShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareTitle = title || "Check out this article";

  const handleShare = (platformUrl) => {
    window.open(platformUrl, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-muted-foreground mr-1">Share:</span>
      {PLATFORMS.map(({ key, label, icon: Icon, color, getUrl }) => (
        <button
          key={key}
          onClick={() => handleShare(getUrl(shareUrl, shareTitle))}
          aria-label={`Share to ${label}`}
          title={`Share to ${label}`}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-200",
            color
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <button
        onClick={handleCopy}
        aria-label="Copy link"
        title="Copy link"
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:border-accent",
          copied && "bg-emerald-500 text-white border-emerald-500"
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}