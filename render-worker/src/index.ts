// Entry point: tiny Express server with /health and /render endpoints.
// /render is HMAC-authenticated and processes the job in the background
// (responds 202 immediately so the calling edge function isn't blocked).

import express, { type Request, type Response } from "express";
import { z } from "zod";
import { verifyHmac } from "./auth.js";
import { processRenderJob } from "./queue.js";
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

const RenderJobSchema = z.object({
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

    // 2) Body validation
    const parsed = RenderJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "invalid_body",
        detail: parsed.error.issues.slice(0, 5),
      });
      return;
    }

    // 3) Acknowledge IMMEDIATELY -- the edge function caller is not waiting
    res.status(202).json({
      ok: true,
      job_id: parsed.data.job_id,
      total_slides: parsed.data.slides.length,
    });

    // 4) Process asynchronously
    processRenderJob(parsed.data).catch((err) => {
      console.error(`[job=${parsed.data.job_id}] uncaught:`, err);
    });
  },
);

const server = app.listen(PORT, () => {
  console.log(`carousel render worker listening on :${PORT}`);
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
