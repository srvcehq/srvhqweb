import { NextResponse } from "next/server";

/**
 * A redirect that uses a *relative* `Location` header.
 *
 * On Netlify, route handlers see `request.url` / the `Host` header as the
 * deploy-specific alias (e.g. `main--site.netlify.app` or
 * `<deploy-id>--site.netlify.app`), not the host the browser actually
 * connected to. Redirecting to an absolute URL built from `request.url`
 * therefore sends the browser to a different host than the one our cookies
 * are scoped to — so the session cookie isn't sent and the user bounces.
 *
 * A relative `Location` is resolved by the browser against the URL in its
 * address bar (the real, public host), so cookies survive the hop.
 */
export function relativeRedirect(path: string, status: 302 | 303 = 303): NextResponse {
  return new NextResponse(null, { status, headers: { Location: path } });
}
