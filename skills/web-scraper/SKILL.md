---
name: Barrsa Web Scraper
version: 1.0.0
description: >
  Advanced web scraping skill using Lightpanda headless browser.
  Handles anti-bot protected pages (Etsy, Amazon, etc.) that block
  standard HTTP scrapers. Use for marketplace product import and
  data extraction from JavaScript-heavy or CAPTCHA-protected sites.
metadata:
  author: Barrsa AI
  source: "https://github.com/lightpanda-io/agent-skill"
  homepage: "https://github.com/lightpanda-io/browser"
---

# Barrsa Web Scraper Skill

Use Lightpanda headless browser for web scraping when standard HTTP fetch or
built-in browser tools are blocked by anti-bot protections (CAPTCHA, JS
challenges, Cloudflare, etc.).

Lightpanda is 9x faster and uses 16x less memory than Chrome. It executes
JavaScript, handles SPAs, and extracts content as clean markdown.

## Install

```bash
bash scripts/install-lightpanda.sh
```

## When to Use This Skill

Use Lightpanda when:
- A page returns CAPTCHA or JS challenge errors
- Standard `fetch()` or `browser.request` gets blocked
- The target site uses heavy JavaScript rendering (React, Vue, Angular SPA)
- You need to scrape marketplace pages (Etsy, Amazon, eBay, etc.)
- You need structured data extraction from dynamic pages

Do NOT use when:
- Simple static HTML pages (use standard fetch)
- API endpoints that return JSON directly
- Pages that load fine with the built-in browser tool

## Three Ways to Use Lightpanda

| Interface    | Best for                                    | Command                                      |
|-------------|---------------------------------------------|----------------------------------------------|
| **CLI fetch** | Quick one-off page extraction               | `lightpanda fetch --dump markdown URL`       |
| **MCP server**| Agent workflows, interactive browsing       | `lightpanda mcp`                             |
| **CDP server**| Custom Playwright/Puppeteer automation      | `lightpanda serve --port 9222`               |

## CLI Fetch (Recommended for Import Jobs)

For single-page extraction, use the CLI:

```bash
# Extract page as markdown (best for AI processing)
~/.local/bin/lightpanda fetch --dump markdown --wait-until networkidle https://www.etsy.com/shop/ExampleShop

# Extract with longer wait for slow pages
~/.local/bin/lightpanda fetch --dump markdown --wait-ms 15000 --wait-until networkidle https://example.com

# Extract semantic tree (compact, AI-optimized)
~/.local/bin/lightpanda fetch --dump semantic_tree_text --wait-until networkidle https://example.com

# Extract raw HTML
~/.local/bin/lightpanda fetch --dump html --wait-until done https://example.com

# Strip JavaScript and CSS from output
~/.local/bin/lightpanda fetch --dump markdown --strip-mode js,css https://example.com
```

### CLI Options

- `--dump` — Output format: `html`, `markdown`, `semantic_tree`, `semantic_tree_text`
- `--wait-until` — Wait strategy: `load`, `domcontentloaded`, `networkidle`, `done` (default)
- `--wait-ms` — Max wait time in milliseconds (default: 5000)
- `--strip-mode` — Remove tag groups: `js`, `css`, `ui`, `full` (comma-separated)
- `--with-frames` — Include iframe contents
- `--obey-robots` — Respect robots.txt

## MCP Server (For Agent Workflows)

### Available MCP Tools

**Navigation & content extraction:**
- `goto` — Navigate to a URL and load the page
- `markdown` — Get page content as markdown (accepts optional URL)
- `links` — Extract all links from the page
- `semantic_tree` — Get simplified semantic DOM tree
- `structuredData` — Extract JSON-LD, OpenGraph, etc.
- `evaluate` — Execute JavaScript in the page context

**Interactive elements:**
- `interactiveElements` — List all interactive elements
- `detectForms` — Detect forms with field structure
- `click` — Click an interactive element
- `fill` — Fill text into an input or select
- `scroll` — Scroll the page

### MCP Workflow Example

1. `goto` the target URL
2. `markdown` to get page content
3. `links` to discover product pages
4. For each product page: `goto` + `markdown` to extract details
5. `structuredData` to get any JSON-LD product schema

## Marketplace Scraping Strategy

When scraping marketplace shops (Etsy, Amazon, eBay, etc.):

1. **Navigate to shop page**: Use `lightpanda fetch --dump markdown --wait-until networkidle <shop_url>`
2. **Extract product links**: Parse the markdown for product URLs
3. **Scrape each product**: Fetch each product page individually
4. **Handle pagination**: Look for "next page" links and follow them
5. **Rate limiting**: Wait 1-2 seconds between requests to avoid IP blocks

### Anti-Bot Tips

- Use `--wait-until networkidle` to wait for JS to finish
- Use `--wait-ms 15000` for slower sites with heavy JS
- If a page still blocks, try `--wait-until done` with longer `--wait-ms`
- Etsy, Amazon, and eBay may still use CAPTCHA — if markdown output shows CAPTCHA text, report it as an error
- For Google searches, use DuckDuckGo instead (Google blocks Lightpanda fingerprint)

## Important Notes

- Lightpanda runs on Linux and macOS only (Windows via WSL2)
- Binary location: `~/.local/bin/lightpanda`
- Only 1 CDP connection per process; use CLI for simple extraction
- If crashes occur, run `scripts/install-lightpanda.sh` to update to latest nightly
- The MCP server handles connection management automatically
