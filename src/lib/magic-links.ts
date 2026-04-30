import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "./env";
import { publicEnv } from "./env";

export type MagicLinkPurpose = "bid_view" | "client_login" | "payment" | "invite";

export interface MagicLinkPayload {
  /** Subject — typically a contact_id, bid_id, payment_id, etc. */
  sub: string;
  /** Purpose — what this token grants */
  purpose: MagicLinkPurpose;
  /** Issued-at (unix seconds) */
  iat: number;
  /** Expires-at (unix seconds) */
  exp: number;
  /** Optional metadata, e.g. { company_id: "1" } */
  meta?: Record<string, string>;
}

export interface IssueOpts {
  /** TTL in seconds. Defaults vary per purpose. */
  ttlSeconds?: number;
  meta?: Record<string, string>;
}

const DEFAULT_TTL: Record<MagicLinkPurpose, number> = {
  bid_view: 60 * 60 * 24 * 30, // 30 days — bids stay viewable
  client_login: 60 * 60 * 24 * 7, // 7 days
  payment: 60 * 60 * 24 * 7, // 7 days
  invite: 60 * 60 * 24 * 14, // 14 days
};

function getSecret(): string {
  const env = getServerEnv();
  if (!env.MAGIC_LINK_SECRET) {
    throw new Error("MAGIC_LINK_SECRET not configured. Set in .env.local with `openssl rand -hex 32`.");
  }
  return env.MAGIC_LINK_SECRET;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(payload).digest());
}

/**
 * Issue a signed token. Format: `<base64url(payload)>.<base64url(hmac)>`.
 * Self-contained — no DB lookup required to verify.
 *
 * Caveat: tokens can't be revoked individually without a DB-backed revocation list.
 * For one-shot use (single payment, single bid view), you'd need DB to track usage.
 * For now, time-bounded validity is the only gate.
 */
export function issueMagicLink(
  sub: string,
  purpose: MagicLinkPurpose,
  opts: IssueOpts = {}
): string {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL[purpose];
  const payload: MagicLinkPayload = {
    sub,
    purpose,
    iat: now,
    exp: now + ttl,
    ...(opts.meta ? { meta: opts.meta } : {}),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
}

export type VerifyResult =
  | { valid: true; payload: MagicLinkPayload }
  | { valid: false; reason: "malformed" | "bad_signature" | "expired" | "purpose_mismatch" };

export function verifyMagicLink(token: string, expectedPurpose?: MagicLinkPurpose): VerifyResult {
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };
  const [encoded, sig] = parts;

  const expectedSig = sign(encoded, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "bad_signature" };
  }

  let payload: MagicLinkPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "expired" };
  }
  if (expectedPurpose && payload.purpose !== expectedPurpose) {
    return { valid: false, reason: "purpose_mismatch" };
  }

  return { valid: true, payload };
}

/* ------------------------------------------------------------------ */
/* URL builders                                                        */
/* ------------------------------------------------------------------ */

export function buildBidViewUrl(bidId: string, meta?: Record<string, string>): string {
  const token = issueMagicLink(bidId, "bid_view", { meta });
  return `${publicEnv.NEXT_PUBLIC_APP_URL}/bid/${bidId}?t=${token}`;
}

export function buildClientLoginUrl(contactId: string, meta?: Record<string, string>): string {
  const token = issueMagicLink(contactId, "client_login", { meta });
  return `${publicEnv.NEXT_PUBLIC_APP_URL}/portal?t=${token}`;
}

export function buildClientInviteUrl(contactId: string, meta?: Record<string, string>): string {
  const token = issueMagicLink(contactId, "invite", { meta });
  return `${publicEnv.NEXT_PUBLIC_APP_URL}/portal/welcome?t=${token}`;
}
