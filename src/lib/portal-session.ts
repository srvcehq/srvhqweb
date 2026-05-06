import "server-only";
import { cookies } from "next/headers";
import {
  issueMagicLink,
  verifyMagicLink,
  type MagicLinkPayload,
} from "./magic-links";

/**
 * Client portal session = an HMAC-signed `client_login` magic-link token stored
 * in an HttpOnly cookie. No DB session table — the token is self-contained.
 *
 * Trade-off: tokens can't be revoked individually before expiry. Mitigated by
 * 7-day TTL and HttpOnly + SameSite=Lax cookie. If we ever need per-session
 * revocation (suspicious activity, contact removed, etc.) add a session table
 * with a hashed token column and check it during verification.
 *
 * Cookie path is "/" so it reaches both /portal/* (server-rendered pages) and
 * /api/portal/* (route handlers — sign-out, pay, profile, proposal-respond).
 * Scoping to /portal silently broke every API action.
 */

const COOKIE_NAME = "tf_portal_session";
const COOKIE_PATH = "/";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches client_login default

export interface PortalSession {
  contactId: string;
  payload: MagicLinkPayload;
}

/** Set the portal session cookie for the given contact. */
export async function setPortalSession(contactId: string, meta?: Record<string, string>) {
  const token = issueMagicLink(contactId, "client_login", { meta });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

/** Read the portal session cookie. Returns null if missing or invalid. */
export async function getPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const result = verifyMagicLink(token, "client_login");
  if (!result.valid) return null;

  return { contactId: result.payload.sub, payload: result.payload };
}

/** Clear the portal session cookie (sign-out). */
export async function clearPortalSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}
