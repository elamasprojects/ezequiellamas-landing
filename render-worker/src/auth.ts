// HMAC verification for inbound /render requests.
//
// Wire format: Authorization: HMAC <timestamp>.<signature>
// Where signature = HMAC-SHA256(RENDER_WORKER_SECRET, `${timestamp}.${rawBody}`)
// Timestamp is ms since epoch as string, must be within 5 minutes of now.

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60 * 1000;

export function sign(body: string, secret: string): string {
  const timestamp = Date.now().toString();
  const sig = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `HMAC ${timestamp}.${sig}`;
}

export function verifyHmac(
  authorization: string | undefined,
  rawBody: string,
  secret: string,
): { ok: true } | { ok: false; reason: string } {
  if (!authorization) return { ok: false, reason: "missing_auth_header" };
  if (!authorization.startsWith("HMAC ")) {
    return { ok: false, reason: "wrong_scheme" };
  }
  const payload = authorization.slice(5);
  const dotIndex = payload.indexOf(".");
  if (dotIndex === -1) return { ok: false, reason: "malformed_payload" };

  const ts = payload.slice(0, dotIndex);
  const sig = payload.slice(dotIndex + 1);
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { ok: false, reason: "invalid_timestamp" };
  }
  if (Math.abs(Date.now() - tsNum) > MAX_SKEW_MS) {
    return { ok: false, reason: "timestamp_skew" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  // Timing-safe compare. Buffers must be same length.
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return { ok: false, reason: "signature_mismatch" };
  if (!timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true };
}
