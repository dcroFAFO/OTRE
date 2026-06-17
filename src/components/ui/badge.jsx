import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/8 text-primary hover:bg-primary/12 shadow-sm",
        secondary:
          "border-border/50 bg-secondary/50 text-secondary-foreground hover:bg-secondary/70",
        destructive:
          "border-destructive/20 bg-destructive/8 text-destructive hover:bg-destructive/12 shadow-sm",
        outline: "border-border/70 text-foreground/80 hover:bg-secondary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }