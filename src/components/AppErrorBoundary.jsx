import React from "react";
import { reportClientError } from "@/lib/reportClientError";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    reportClientError(error, {
      source: "react_error_boundary",
      component: info?.componentStack?.trim().split("\n")[0] || null,
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <section className="max-w-lg rounded-lg border border-border bg-card p-6 text-center shadow-sm" role="alert">
          <h1 className="font-heading text-xl font-extrabold">This page could not be displayed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reload the page, or return home and try again. If you had just submitted a form, check its status before submitting it again.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold" href="/">
              Return home
            </a>
          </div>
        </section>
      </main>
    );
  }
}
