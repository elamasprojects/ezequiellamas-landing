# Render worker for the @ezequiellamas carousel generator.
#
# Build context: REPO ROOT (not render-worker/). Railway: set Root Directory = "."
# and Dockerfile path = "render-worker/Dockerfile". This lets us COPY both
# render-worker/ and src/lib/carousel/ (the shared templates) into the image.
#
# Why we resolve the chromium path at build time instead of hardcoding it:
# Playwright's Chromium ends up at ~/.cache/ms-playwright/chromium-NNNN/...,
# and NNNN changes every Playwright release. The system_prompt v2.2 hardcodes
# /opt/pw-browsers/chromium-1194/... but that's specific to the Anthropic
# sandbox -- in Docker we ask Playwright where it installed its binary and
# stash the path in /tmp/chromium.path so the runtime CMD reads it back.

FROM node:20-bookworm-slim

# System deps: FFmpeg for Hyperframes MP4 export, ca-certs for HTTPS, git in
# case any npm dep needs it (rare). Keep image lean.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install worker deps first (better layer caching when source changes)
COPY render-worker/package.json render-worker/package-lock.json* ./render-worker/
RUN cd render-worker && npm install --no-audit --no-fund

# Install Chromium for Playwright + its OS deps
RUN cd render-worker && npx playwright install --with-deps chromium

# Resolve chromium path NOW so the runtime CMD doesn't depend on Playwright
# being able to introspect it (avoid surprise on first request)
RUN cd render-worker && \
    node -e "import('playwright').then(p => console.log(p.chromium.executablePath()))" \
    > /tmp/chromium.path

# Copy worker source + shared carousel/broll templates from repo root
COPY render-worker/src ./render-worker/src
COPY render-worker/tsconfig.json ./render-worker/tsconfig.json
COPY src/lib/carousel ./src/lib/carousel
COPY src/lib/broll ./src/lib/broll

# Hyperframes critical-path env vars (per system prompt v2.2 §7):
# - HYPERFRAMES_BROWSER_PATH: tell Hyperframes to use the Chromium we already installed
# - PRODUCER_FORCE_SCREENSHOT: force the deterministic screenshot pipeline
ENV NODE_ENV=production
ENV PRODUCER_FORCE_SCREENSHOT=true

# Workdir for runtime
WORKDIR /app/render-worker

EXPOSE 8080

# Read the resolved path at runtime, export it, then start the server.
CMD ["sh", "-c", "export HYPERFRAMES_BROWSER_PATH=$(cat /tmp/chromium.path) && npm start"]
