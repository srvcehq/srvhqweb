import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv, getServerEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev shortcut — creates a "Dev Admin" user in Supabase Auth on first call,
 * then signs in via password and returns the cookie session.
 *
 * Triple-guarded: NODE_ENV !== "production" AND NEXT_PUBLIC_AUTH_DEV_MODE
 * AND DEV_USER_PASSWORD must be set.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (!publicEnv.NEXT_PUBLIC_AUTH_DEV_MODE) {
    return NextResponse.json(
      { error: "Dev mode is not enabled" },
      { status: 404 }
    );
  }

  const env = getServerEnv();
  const email = env.DEV_USER_EMAIL ?? "dev@terraflow.local";
  const password = env.DEV_USER_PASSWORD;

  if (!password) {
    return NextResponse.json(
      {
        error:
          "DEV_USER_PASSWORD is not set in .env.local. Add a long random value and restart the dev server.",
      },
      { status: 500 }
    );
  }

  const admin = getSupabaseAdmin();

  // Find or create the dev user. listUsers paginates; for dev we just look at
  // the first page (we never have many users locally).
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const existing = list.users.find((u) => u.email === email);

  if (!existing) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: "Dev",
        last_name: "Admin",
        full_name: "Dev Admin",
        role: "admin",
      },
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
  } else {
    // Make sure the password matches what we have in env (dev-only — handy
    // when DEV_USER_PASSWORD changes between sessions).
    await admin.auth.admin.updateUserById(existing.id, { password });
  }

  // Now sign in via the cookie-aware server client so the session lands in
  // the user's browser.
  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    return NextResponse.json({ error: signInErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
