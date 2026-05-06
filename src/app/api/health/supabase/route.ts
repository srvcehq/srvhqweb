import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const tablesToProbe = [
      "contacts",
      "locations",
      "projects",
      "bids",
      "payments",
      "maintenance_plans",
      "communications",
      "company_settings",
      "door_to_door_pins",
    ];

    const results = await Promise.all(
      tablesToProbe.map(async (table) => {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        return { table, count: count ?? 0, error: error?.message ?? null };
      })
    );

    const failed = results.filter((r) => r.error);
    if (failed.length > 0) {
      return NextResponse.json(
        { ok: false, message: "Some tables failed to query", failed, results },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase connected. All probed tables responded.",
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
