import { createClient } from "@supabase/supabase-js";
import { publicEnv, getServerEnv } from "@/lib/env";

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin() called from the browser — service role key must never reach the client");
  }
  if (_adminClient) return _adminClient;

  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  _adminClient = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _adminClient;
}
