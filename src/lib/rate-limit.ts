import "server-only";
import { NextRequest, NextResponse } from "next/server";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

function getOrCreateBucket(key: string, capacity: number): Bucket {
  const existing = buckets.get(key);
  if (existing) return existing;

  if (buckets.size >= MAX_BUCKETS) {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [k, b] of buckets) {
      if (b.lastRefillMs < cutoff) buckets.delete(k);
      if (buckets.size < MAX_BUCKETS * 0.9) break;
    }
  }

  const bucket: Bucket = { tokens: capacity, lastRefillMs: Date.now() };
  buckets.set(key, bucket);
  return bucket;
}

/**
 * Token bucket rate limiter, in-memory.
 * Limits to `capacity` requests per `windowMs` window per key.
 *
 * Caveat: in-memory means each serverless instance has its own counter.
 * For production scale, swap this backend for Upstash Redis.
 */
export function checkRateLimit(
  key: string,
  capacity: number,
  windowMs: number
): RateLimitResult {
  const bucket = getOrCreateBucket(key, capacity);
  const now = Date.now();
  const elapsed = now - bucket.lastRefillMs;

  if (elapsed > 0) {
    const refill = (elapsed / windowMs) * capacity;
    bucket.tokens = Math.min(capacity, bucket.tokens + refill);
    bucket.lastRefillMs = now;
  }

  if (bucket.tokens < 1) {
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterSeconds = Math.ceil((tokensNeeded / capacity) * (windowMs / 1000));
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  bucket.tokens -= 1;
  return { ok: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests", retryAfterSeconds: result.retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
