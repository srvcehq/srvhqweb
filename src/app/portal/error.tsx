"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal error boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight text-gray-900">
        Something went wrong
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
        We couldn&rsquo;t load this part of your portal. Try again — if it keeps
        happening, ask your contractor to resend your portal link.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-gray-400">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_2px_4px_0_rgba(0,0,0,0.18)] transition-transform active:translate-y-px"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
        <a
          href="/portal/dashboard"
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:translate-y-px"
        >
          Back to portal
        </a>
      </div>
    </div>
  );
}
