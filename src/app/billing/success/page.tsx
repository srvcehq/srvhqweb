import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function BillingSuccessPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">You're in.</h1>
        <p className="text-gray-600 text-sm">
          Your subscription is active. Your dashboard is ready.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
