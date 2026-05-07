// Entry point: tiny Express server with /health and /render endpoints.
// /render is HMAC-authenticated, accepts both carousel and broll jobs via
// a discriminated union (`kind`), and processes the job in the background
// (responds 202 immediately so the calling edge function isn't blocked).

import express, { type Request, type Response } from "express";
import { z } from "zod";
import { verifyHmac } from "./auth.js";
import { processCarouselJob, processBrollJob } from "./queue.js";
import { shutdownBrowser } from "./render.js";

const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.RENDER_WORKER_SECRET;

if (!SECRET) {
  console.error("FATAL: RENDER_WORKER_SECRET is required");
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
  process.exit(1);
}
if (!process.env.SUPABASE_FUNCTIONS_URL) {
  console.error("FATAL: SUPABASE_FUNCTIONS_URL is required");
  process.exit(1);
}

const app = express();

// Need raw body access for HMAC verification; Express's json parser
// strips it. We capture rawBody in a custom verify hook.
app.use(
  express.json({
    limit: "2mb",
    verify: (req: express.Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString("utf-8");
    },
  }),
);

// ─── Discriminated union: kind: "carousel" | "broll" ────────────────────────
const CarouselJobSchema = z.object({
  kind: z.literal("carousel"),
  job_id: z.string().uuid(),
  carousel_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  mode: z.enum(["static", "animated"]),
  design_format: z.enum([
    "diario",
    "punk",
    "minimalista",
    "tech",
    "esquemas",
  ]),
  slides: z
    .array(
      z.object({
        index: z.number().int().min(0).max(15),
        template: z.enum(["T1Cover", "T2Feature", "T3Grid", "T4VS", "T5CTA"]),
        content: z.record(z.string(), z.unknown()),
        output_format: z.enum(["png", "mp4"]),
      }),
    )
    .min(1)
    .max(12),
});

const BrollJobSchema = z.object({
  kind: z.literal("broll"),
  broll_suggestion_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  template: z.enum([
    "WordStack",
    "Typewriter",
    "AcronymReveal",
    "BoldStatement",
    "BarGrowth",
    "StatCounter",
    "BulletList",
    "QuoteCard",
  ]),
  content: z.record(z.string(), z.unknown()),
  style_id: z.string().uuid().nullable(),
  style_template_code: z.string().nullable(),
  output_format: z.literal("mp4"),
});

const JobSchema = z.discriminatedUnion("kind", [
  CarouselJobSchema,
  BrollJobSchema,
]);

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    chromium: process.env.HYPERFRAMES_BROWSER_PATH || "(not set)",
    node: process.version,
  });
});

app.post(
  "/render",
  async (
    req: Request & { rawBody?: string },
    res: Response,
  ): Promise<void> => {
    // 1) HMAC verification
    const verdict = verifyHmac(
      req.header("Authorization") ?? undefined,
      req.rawBody ?? "",
      SECRET,
    );
    if (!verdict.ok) {
      res.status(401).json({ error: verdict.reason });
      return;
    }

    // 2) Backward-compat: the legacy carousel payload didn't include `kind`.
    //    If we see a `slides` array and no `kind`, infer "carousel". This lets
    //    older deploys of `start-carousel-render` continue working during the
    //    rollout window.
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!body.kind && Array.isArray(body.slides)) {
      body.kind = "carousel";
    }

    // 3) Body validation
    const parsed = JobSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({
        error: "invalid_body",
        detail: parsed.error.issues.slice(0, 5),
      });
      return;
    }

    // 4) Acknowledge IMMEDIATELY -- the edge function caller is not waiting.
    //    Extract narrowed locals before the async closure so the closure
    //    doesn't have to re-narrow the union (which TS can't do across boundaries).
    if (parsed.data.kind === "carousel") {
      const job = parsed.data;
      res.status(202).json({
        ok: true,
        kind: "carousel",
        job_id: job.job_id,
        total_slides: job.slides.length,
      });
      processCarouselJob(job).catch((err) => {
        console.error(`[carousel job=${job.job_id}] uncaught:`, err);
      });
    } else {
      const job = parsed.data;
      res.status(202).json({
        ok: true,
        kind: "broll",
        broll_suggestion_id: job.broll_suggestion_id,
      });
      processBrollJob(job).catch((err) => {
        console.error(`[broll=${job.broll_suggestion_id}] uncaught:`, err);
      });
    }
  },
);

const server = app.listen(PORT, () => {
  console.log(`render worker listening on :${PORT}`);
});

// Graceful shutdown -- close the browser when the container is stopping
async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down`);
  await shutdownBrowser().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
