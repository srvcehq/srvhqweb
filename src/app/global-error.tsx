"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#111827",
          padding: "1rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            background: "#ffffff",
            border: "1px solid #f3f4f6",
            borderRadius: "1rem",
            boxShadow:
              "0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.08)",
            padding: "1.75rem",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/srvce-mark.png"
            alt="SRVCE HQ"
            height={22}
            style={{ display: "block", height: "22px", width: "auto", marginBottom: "0.75rem" }}
          />
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
            SRVCE HQ hit a problem
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#6b7280",
            }}
          >
            The app failed to load. Please refresh the page — if it keeps
            happening, try again in a moment.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "0.5rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.6875rem",
                color: "#9ca3af",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
