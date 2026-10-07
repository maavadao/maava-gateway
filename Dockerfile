FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $OPENCLAW_DOCKER_APT_PACKAGES && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

# ── Skill binary dependencies ──────────────────────────────────────────
# Python3/pip/venv needed by skills that run Python scripts (nano-banana-pro, etc.)
# build-essential + procps are hard requirements for Linuxbrew.
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv build-essential procps && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# uv — fast Python package manager required by nano-banana-pro and other skills
ENV UV_TOOL_DIR=/opt/uv-tools
ENV UV_TOOL_BIN_DIR=/usr/local/bin
RUN pip install --break-system-packages uv

# ── Homebrew (Linuxbrew) — required by skill auto-installers ───────────
# Skills declare kind:"brew" install steps; Linuxbrew lets `brew install <formula>` work.
# The Homebrew installer refuses to run as root, so we create a dedicated user,
# install as that user, then make the prefix world-readable.
RUN useradd -m -s /bin/bash linuxbrew
USER linuxbrew
RUN NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
USER root
RUN chmod -R a+rX /home/linuxbrew
ENV PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:${PATH}"
ENV HOMEBREW_NO_AUTO_UPDATE=1

COPY package.json pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install

COPY . .
RUN OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV OPENCLAW_PREFER_PNPM=1
ENV CI=true
RUN echo "frozen-lockfile=false" >> /app/.npmrc && pnpm ui:build

ENV NODE_ENV=production

# Gateway authentication token – this is used to secure the WebSocket dashboard and API access.
# Override at build time with: --build-arg OPENCLAW_GATEWAY_TOKEN=your-secret-token
# Or at runtime with: --set-env-vars OPENCLAW_GATEWAY_TOKEN=your-secret-token
ARG OPENCLAW_GATEWAY_TOKEN=1
ENV OPENCLAW_GATEWAY_TOKEN=$OPENCLAW_GATEWAY_TOKEN

# State / workspace directories — gateway writes lock files, sessions, cron state here.
# Without these, the gateway tries to create dirs under /home/node which may fail.
ENV OPENCLAW_STATE_DIR=/home/node/.openclaw
ENV OPENCLAW_WORKSPACE_DIR=/home/node/.openclaw/workspace

# Node memory limit — gateway needs ~370 MiB just to initialise.
# 768 MiB heap + ~100 MiB OS/native overhead fits a 1 GiB Cloud Run container.
# Pair with: gcloud run services update tenant-platform --memory=1Gi --region=europe-west1
ENV NODE_OPTIONS="--max-old-space-size=768"

# Enable REST API — mounted on the gateway HTTP server (same port).
# This exposes /api/v1/* endpoints with CORS headers for the frontend dashboard.
ENV OPENCLAW_REST_API=1

# Create state/workspace dirs BEFORE switching to non-root user
RUN mkdir -p /home/node/.openclaw/workspace

# Create minimal gateway config:
#  - auth.mode: "token" — force token-based auth (prevents env OPENCLAW_GATEWAY_PASSWORD from switching to password mode)
#  - controlUi.allowInsecureAuth: true — skip device-pairing for the built-in Control UI
RUN printf '{"gateway":{"auth":{"mode":"token"},"controlUi":{"allowInsecureAuth":true}}}\n' > /home/node/.openclaw/openclaw.json

# Allow non-root user to write temp files during runtime/tests.
RUN chown -R node:node /app /home/node/.openclaw

# Security hardening: Run as non-root user
# The node:22-bookworm image includes a 'node' user (uid 1000)
# This reduces the attack surface by preventing container escape via root privileges
USER root

# Start gateway server with default config.
# Binds to 0.0.0.0 (lan) for container platforms (Cloud Run, Fly, Railway, etc.)
# Uses the PORT env var set by the platform (defaults to 3000).
#
# Required env vars at runtime:
#   OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD  (auth required for --bind lan)
# Optional env vars:
#   PORT                  - listening port (default: 3000, set by Cloud Run / Fly / etc.)
#   OPENCLAW_REST_API=1   - enable REST API on the same container
#   OPENCLAW_REST_PORT    - REST API port (default: 3000)
CMD ["sh", "-c", "exec node dist/index.js gateway --allow-unconfigured --bind lan --port ${PORT:-3000}"]
