export default function PortalLoading() {
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      <header className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-3" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
