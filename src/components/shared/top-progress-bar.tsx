"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin gradient bar pinned to the top of the viewport that runs on every
 * route change. App Router doesn't expose mid-flight navigation events, so we
 * key off pathname + search params — when those change, the inner element
 * remounts and the CSS keyframe replays from 0%. The bar fires *after* the
 * new page is ready, which reads as "page loaded" closure rather than
 * mid-flight progress; combined with `loading.tsx` skeletons for slower
 * server routes, this is enough to make navigation feel intentional.
 *
 * The first-paint flash on initial load is intentional and barely visible
 * (~700ms gradient fade-out). Avoiding it would require tracking "is first
 * render" state, which trips the React-19 set-state-in-effect rule for
 * marginal benefit.
 */
function TopProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navKey = `${pathname}?${searchParams.toString()}`;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none"
      aria-hidden
    >
      <div
        key={navKey}
        className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.55)] origin-left animate-[topbar_700ms_ease-out_forwards]"
      />
    </div>
  );
}

/**
 * useSearchParams() needs a Suspense boundary in App Router or it forces the
 * whole route to client-render. Wrap so this bar can sit at the root layout
 * without poisoning the server tree.
 */
export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <TopProgressBarInner />
    </Suspense>
  );
}
