/**
 * Route-transition skeleton for the contractor app. Shown by the Next.js
 * Suspense boundary while a page's server component streams; pages then take
 * over with their own react-query loading states.
 */
export default function AppLoading() {
  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* header */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-3.5 w-64 rounded bg-muted/70 animate-pulse" />
          </div>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="h-3.5 w-24 rounded bg-muted animate-pulse mb-3" />
              <div className="h-7 w-20 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        {/* content block */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
              <div className="h-4 flex-1 rounded bg-muted/70 animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted/70 animate-pulse" />
              <div className="h-6 w-16 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
