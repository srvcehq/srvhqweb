import Link from "next/link";
import { Compass } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-logo";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-7 shadow-xl">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
            <BrandMark size={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            SRVCE HQ
          </span>
        </div>

        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <Compass className="h-5 w-5" />
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-gray-900">
          Page not found
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have
          moved.
        </p>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_2px_4px_0_rgba(0,0,0,0.18)] transition-transform active:translate-y-px"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
