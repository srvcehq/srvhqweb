"use client";

import { Input } from "@/components/ui/input";

/**
 * Format US phone digits as `(XXX) XXX-XXXX` as the user types. A leading "1"
 * country code is dropped for display. Anything that isn't a plain 10/11-digit
 * US number is left as typed, so international numbers still work.
 */
export function formatUsPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  // 11+ digits / weird input — don't mangle it (e.g. an international number).
  return raw;
}

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/** A phone field that auto-formats US numbers as `(555) 555-5555`. */
export function PhoneInput({
  id,
  value,
  onChange,
  placeholder = "(555) 555-5555",
  className,
  disabled,
}: Props) {
  return (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(formatUsPhone(e.target.value))}
      className={className}
    />
  );
}
