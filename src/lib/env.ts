import { z } from "zod";

const optionalServerString = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().min(1).optional()
);

const serverSchema = z.object({
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, "STRIPE_SECRET_KEY is required")
    .refine((v) => v.startsWith("sk_test_") || v.startsWith("sk_live_"), {
      message: "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_",
    }),
  STRIPE_WEBHOOK_SECRET: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z
      .string()
      .refine((v) => v.startsWith("whsec_"), {
        message: "STRIPE_WEBHOOK_SECRET must start with whsec_",
      })
      .optional()
  ),
  STRIPE_PLATFORM_FEE_BPS: z
    .preprocess((v) => (v === "" || v === undefined ? "0" : v), z.string())
    .transform((v) => {
      const n = Number.parseInt(v, 10);
      if (Number.isNaN(n) || n < 0 || n > 10_000) {
        throw new Error("STRIPE_PLATFORM_FEE_BPS must be 0–10000");
      }
      return n;
    }),
  POSTMARK_SERVER_TOKEN: optionalServerString,
  POSTMARK_FROM_EMAIL: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.string().email("POSTMARK_FROM_EMAIL must be a valid email").optional()
  ),
  POSTMARK_MESSAGE_STREAM: optionalServerString,
  TWILIO_ACCOUNT_SID: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z
      .string()
      .refine((v) => v.startsWith("AC"), { message: "TWILIO_ACCOUNT_SID must start with AC" })
      .optional()
  ),
  TWILIO_AUTH_TOKEN: optionalServerString,
  TWILIO_FROM_NUMBER: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z
      .string()
      .refine((v) => v.startsWith("+"), {
        message: "TWILIO_FROM_NUMBER must be E.164 format (e.g. +13035551234)",
      })
      .optional()
  ),
  MAGIC_LINK_SECRET: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.string().min(32, "MAGIC_LINK_SECRET must be at least 32 chars (use a long random value)").optional()
  ),
});

const optionalString = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().min(1).optional()
);

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required")
    .refine((v) => v.startsWith("pk_test_") || v.startsWith("pk_live_"), {
      message: "Publishable key must start with pk_test_ or pk_live_",
    }),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: optionalString,
  NEXT_PUBLIC_GOOGLE_MAP_ID: optionalString,
});

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";

const publicInput = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_GOOGLE_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
};

const _publicEnv = skipValidation
  ? { success: true as const, data: publicInput as z.infer<typeof publicSchema> }
  : publicSchema.safeParse(publicInput);

if (!_publicEnv.success) {
  throw new Error(`Invalid public environment variables:\n${format(_publicEnv.error)}`);
}

export const publicEnv = _publicEnv.data;

let _serverEnv: z.infer<typeof serverSchema> | null = null;

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() called from the browser. Server env vars must never reach the client.");
  }
  if (_serverEnv) return _serverEnv;

  const input = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PLATFORM_FEE_BPS: process.env.STRIPE_PLATFORM_FEE_BPS,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL,
    POSTMARK_MESSAGE_STREAM: process.env.POSTMARK_MESSAGE_STREAM,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    MAGIC_LINK_SECRET: process.env.MAGIC_LINK_SECRET,
  };

  if (skipValidation) {
    _serverEnv = input as unknown as z.infer<typeof serverSchema>;
    return _serverEnv;
  }

  const parsed = serverSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${format(parsed.error)}`);
  }

  _serverEnv = parsed.data;
  return _serverEnv;
}
