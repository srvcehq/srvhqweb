/**
 * SRVCE HQ brand marks.
 *
 *   <BrandMark size={28} />              the standalone "S" mark (black)
 *   <BrandMark size={28} variant="light" />   white mark, for dark surfaces
 *   <BrandLockup height={22} />          the horizontal mark + "SRVCE HQ" wordmark
 *
 * Source artwork lives in /public/brand. Aspect ratios are hard-coded from the
 * cropped PNGs so the browser reserves space (no layout shift).
 */

import type { CSSProperties } from "react";

type Variant = "dark" | "light";

const MARK_RATIO = 918 / 1540; // width / height
const LOCKUP_RATIO = 1473 / 416;
const WORDMARK_RATIO = 1354 / 220;

function src(base: string, variant: Variant) {
  return variant === "light" ? `/brand/${base}-white.png` : `/brand/${base}.png`;
}

export function BrandMark({
  size = 28,
  variant = "dark",
  className,
  style,
}: {
  /** rendered height in px */
  size?: number;
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src("srvce-mark", variant)}
      alt="SRVCE HQ"
      width={Math.round(size * MARK_RATIO)}
      height={size}
      className={className}
      style={{ display: "block", ...style }}
    />
  );
}

export function BrandLockup({
  height = 22,
  variant = "dark",
  className,
  style,
}: {
  /** rendered height in px */
  height?: number;
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === "light" ? "/brand/srvce-lockup-white.png" : "/brand/srvce-lockup.png"}
      alt="SRVCE HQ"
      width={Math.round(height * LOCKUP_RATIO)}
      height={height}
      className={className}
      style={{ display: "block", ...style }}
    />
  );
}

export function BrandWordmark({
  height = 18,
  className,
  style,
}: {
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/srvce-wordmark.png"
      alt="SRVCE HQ"
      width={Math.round(height * WORDMARK_RATIO)}
      height={height}
      className={className}
      style={{ display: "block", ...style }}
    />
  );
}
