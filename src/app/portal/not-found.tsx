import Link from "next/link";
import { Compass } from "lucide-react";

export default function PortalNotFound() {
  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Compass className="h-5 w-5" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight text-gray-900">
        Not found
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
        This page doesn&rsquo;t exist, or you don&rsquo;t have access to it.
      </p>
      <div className="mt-6">
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_2px_4px_0_rgba(0,0,0,0.18)] transition-transform active:translate-y-px"
        >
          Back to portal
        </Link>
      </div>
    </div>
  );
}
