# mawa-gateway

The runtime each member's agent runs in. It is [OpenClaw](https://github.com/openclaw/openclaw)'s
gateway (based on release 2026.2.3) with a multi-tenant REST API, cloud authentication and
mawaDao skills added.

Part of [mawa](https://github.com/mawadao/mawa), the open-source agent platform behind mawaDao: a community-owned ecosystem of agentic AI for education, where developers build and list agents for free and the community shares in what they earn.

## What it does

- **Agent runtime:** models, tools, sessions, memory, cron jobs and chat channels, from OpenClaw.
- **REST API** (`src/api/`): agents, chat, config, channels, cron, devices, logs and data export over HTTP, scoped to one tenant.
- **Cloud mode** (`Dockerfile.cloud`, `scripts/cloud-entrypoint.sh`): one container per member, workspace synced to a storage bucket, JWT auth shared with `mawa-auth`.
- **mawaDao skills:** `skills/mawadao-inbox`, `skills/mawadao-seller`, `skills/web-scraper` and the `extensions/mawadao-seller-agent` plugin.

`mawa-deployer` starts one container from this image per member. The dashboard and
website talk to it through its REST API.

## Run it locally

Requires Node.js 22.12+ and pnpm 10.

```bash
pnpm install
OPENCLAW_A2UI_SKIP_MISSING=1 pnpm build
OPENCLAW_REST_API=1 pnpm dev        # REST API on OPENCLAW_REST_PORT (default 3000)
```

Build the hosted image with `docker build -f Dockerfile.cloud .`.

## Configuration

See [`.env.example`](.env.example) and [`.env.api.example`](.env.api.example). The hosted image also reads
`GCS_BUCKET`, `OPENCLAW_GATEWAY_TOKEN` and `JWT_SECRET` (documented in `scripts/cloud-entrypoint.sh`).

## Upstream

OpenClaw's own documentation is in [`docs/`](docs/). Internal names (`openclaw` package, CLI and
environment variables) are kept so upstream fixes can still be merged.

## Contributing

Read the [contributing guide](https://github.com/mawadao/mawa/blob/main/CONTRIBUTING.md) before opening a pull request.
Work lands on `main`; releases are tagged `vX.Y.Z` as described in [RELEASING.md](https://github.com/mawadao/mawa/blob/main/RELEASING.md).

## Licence

Apache 2.0. See [LICENSE](LICENSE), and [NOTICE](NOTICE) for the MIT-licensed code from OpenClaw it builds on.
