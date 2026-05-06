import { Loader2 } from "lucide-react";

export default function OnboardingLoading() {
  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-7 border border-gray-100 animate-in fade-in duration-300">
      {/* Step pips skeleton */}
      <div className="flex items-center justify-between mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse" />
            {i < 4 && (
              <div className="flex-1 h-0.5 mx-1 rounded bg-gray-100" />
            )}
          </div>
        ))}
      </div>

      <div className="h-3 w-32 bg-gray-100 rounded-full mx-auto mb-5 animate-pulse" />

      <div className="flex flex-col items-center gap-4 py-6">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        <p className="text-sm text-gray-500">Setting up your workspace…</p>
      </div>
    </div>
  );
}
