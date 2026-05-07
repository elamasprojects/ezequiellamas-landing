// HMAC-signed callbacks back to the complete-{carousel,broll}-render edge functions.
// Each edge function validates the signature with the same RENDER_WORKER_SECRET
// and updates the corresponding rows accordingly.

import { sign } from "./auth.js";

// ─── Carousel callbacks ─────────────────────────────────────────────────────
interface SlideDoneBody {
  job_id: string;
  slide_index: number;
  status: "done";
  rendered_path: string;
  rendered_format: "png" | "mp4";
}

interface SlideErrorBody {
  job_id: string;
  slide_index: number;
  status: "error";
  error: string;
}

interface JobDoneBody {
  job_id: string;
  status: "job_done";
}

interface JobErrorBody {
  job_id: string;
  status: "job_error";
  error: string;
}

type CallbackBody =
  | SlideDoneBody
  | SlideErrorBody
  | JobDoneBody
  | JobErrorBody;

// ─── Broll callbacks ────────────────────────────────────────────────────────
interface BrollDoneBody {
  broll_suggestion_id: string;
  status: "done";
  rendered_path: string;
  signed_url: string;
}

interface BrollErrorBody {
  broll_suggestion_id: string;
  status: "error";
  error: string;
}

type BrollCallbackBody = BrollDoneBody | BrollErrorBody;

// ─── Generic poster ─────────────────────────────────────────────────────────
async function postCallback(slug: string, raw: string): Promise<void> {
  const url = process.env.SUPABASE_FUNCTIONS_URL;
  const secret = process.env.RENDER_WORKER_SECRET;
  if (!url || !secret) {
    throw new Error("missing_callback_env_vars");
  }
  const auth = sign(raw, secret);

  // The Supabase functions-v1 endpoint requires the anon key in `apikey` header
  // to even reach the function (the function itself does NOT verify_jwt -- it
  // verifies our HMAC). Use the SERVICE_ROLE_KEY since we have it; either works.
  const apikey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${url}/${slug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      ...(apikey ? { apikey } : {}),
    },
    body: raw,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${slug}_callback_${res.status}: ${text.slice(0, 300)}`);
  }
}

export async function callback(body: CallbackBody): Promise<void> {
  await postCallback("complete-carousel-render", JSON.stringify(body));
}

export async function brollCallback(body: BrollCallbackBody): Promise<void> {
  await postCallback("complete-broll-render", JSON.stringify(body));
}
