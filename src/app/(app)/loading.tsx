import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
