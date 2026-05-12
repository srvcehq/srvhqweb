/**
 * SupabaseEntityStore — list/filter/get/create/update/delete/bulkCreate over a
 * Supabase table, intended for **client-side** use (react-query queryFns,
 * dialogs, hooks).
 *
 * Tenant scoping is enforced by Postgres RLS (every per-tenant table has a
 * `company_id` filtered by `auth_company_id()`). The browser client carries the
 * signed-in user's JWT, so reads/writes auto-scope to their company, and
 * `company_id` is stripped from write payloads — the column's DEFAULT fills it.
 *
 * It deliberately does NOT support server-side use: server code must build a
 * cookie-aware client with `createSupabaseServerClient()` (RLS-scoped) or the
 * service-role admin client (and scope manually) — using `db.*` server-side
 * would either crash (browser client needs `document`) or risk bypassing RLS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaseEntity } from "@/data/types";
import { createSupabaseBrowserClient } from "./client";

// Fields the UI sometimes passes in filter criteria that we ignore — `company_id`
// scoping is handled by RLS, not by client-side filters.
const IGNORED_FILTER_KEYS = new Set(["company_id"]);

// Fields we never write back during create/update — generated/owned by Postgres.
const STRIPPED_WRITE_KEYS = new Set(["id", "created_date", "updated_date", "company_id"]);

async function getClient(): Promise<SupabaseClient> {
  if (typeof window === "undefined") {
    throw new Error(
      "SupabaseEntityStore (db.*) is client-only. Server code must use createSupabaseServerClient() (RLS-scoped) or getSupabaseAdmin() with explicit company scoping."
    );
  }
  return createSupabaseBrowserClient() as unknown as SupabaseClient;
}

function stripWriteKeys<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (STRIPPED_WRITE_KEYS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export class SupabaseEntityStore<T extends BaseEntity> {
  constructor(private readonly table: string) {}

  async list(): Promise<T[]> {
    const client = await getClient();
    const { data, error } = await client.from(this.table).select("*");
    if (error) throw new Error(`[${this.table}] list failed: ${error.message}`);
    return (data ?? []) as T[];
  }

  async filter(criteria: Partial<T>, sort?: string): Promise<T[]> {
    const client = await getClient();
    let query = client.from(this.table).select("*");

    for (const [key, value] of Object.entries(criteria)) {
      if (value === undefined || value === null) continue;
      if (IGNORED_FILTER_KEYS.has(key)) continue;
      query = query.eq(key, value as never);
    }

    if (sort) {
      const desc = sort.startsWith("-");
      const field = desc ? sort.slice(1) : sort;
      query = query.order(field, { ascending: !desc });
    }

    const { data, error } = await query;
    if (error) throw new Error(`[${this.table}] filter failed: ${error.message}`);
    return (data ?? []) as T[];
  }

  async get(id: string): Promise<T | null> {
    const client = await getClient();
    const { data, error } = await client.from(this.table).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[${this.table}] get failed: ${error.message}`);
    return (data ?? null) as T | null;
  }

  async create(data: Partial<Omit<T, "id" | "created_date" | "updated_date">>): Promise<T> {
    const client = await getClient();
    const payload = stripWriteKeys(data as Record<string, unknown>);
    const { data: row, error } = await client
      .from(this.table)
      .insert(payload as never)
      .select()
      .single();
    if (error) throw new Error(`[${this.table}] create failed: ${error.message}`);
    return row as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const client = await getClient();
    const payload = stripWriteKeys(data as Record<string, unknown>);
    const { data: row, error } = await client
      .from(this.table)
      .update(payload as never)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`[${this.table}] update failed: ${error.message}`);
    return (row ?? null) as T | null;
  }

  async delete(id: string): Promise<boolean> {
    const client = await getClient();
    const { error, count } = await client
      .from(this.table)
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw new Error(`[${this.table}] delete failed: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async bulkCreate(
    dataArray: Partial<Omit<T, "id" | "created_date" | "updated_date">>[]
  ): Promise<T[]> {
    if (dataArray.length === 0) return [];
    const client = await getClient();
    const payload = dataArray.map((d) => stripWriteKeys(d as Record<string, unknown>));
    const { data, error } = await client.from(this.table).insert(payload as never).select();
    if (error) throw new Error(`[${this.table}] bulkCreate failed: ${error.message}`);
    return (data ?? []) as T[];
  }
}
