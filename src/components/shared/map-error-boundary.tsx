"use client";

import React from "react";
import { MapPin } from "lucide-react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean };

/**
 * Catches render errors from the Google Maps subtree (a bad/missing API key,
 * referrer restrictions, an Advanced-Markers hiccup, etc.) so the rest of the
 * page still works instead of bombing out to the app error boundary.
 */
export class MapErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[map] render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted/40 p-6 text-center">
            <MapPin className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">The map couldn&rsquo;t load.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check that the Google Maps key allows this site and the Maps/Places APIs are enabled.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
