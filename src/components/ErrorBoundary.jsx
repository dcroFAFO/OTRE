import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// App-wide safety net: catches render-time crashes so users get a clear
// recovery screen instead of a blank white page.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Render error caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-6 bg-background">
          <div className="max-w-sm w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h2 className="font-heading text-lg font-bold mb-1">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-5">
              The page hit an unexpected problem. Reloading usually fixes it.
            </p>
            <Button onClick={() => window.location.reload()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}