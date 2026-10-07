---
name: sponge-wallet
version: 0.2.1

description: Crypto wallet, token swaps, cross-chain bridges, and access to paid external services (search, image gen, web scraping, AI, and more) via x402 payments.
homepage: https://wallet.paysponge.com
user-invocable: true
metadata: {"openclaw":{"emoji":"🧽","category":"finance","primaryEnv":"SPONGE_API_KEY","requires":{"env":["SPONGE_API_KEY"]}}}
---

```
SPONGE WALLET API QUICK REFERENCE v0.2.1
Base:   https://api.wallet.paysponge.com
Auth:   Authorization: Bearer <SPONGE_API_KEY>
Ver:    Sponge-Version: 0.2.1  (REQUIRED on every request)
Docs:   This file is canonical (skills guide + params)

Capabilities: wallet + swaps (Solana/Base/Tempo) + bridges + payment links + paid external services (x402) + trading + shopping + prepaid cards + banking

Paid services (search, image gen, scraping, AI, data, etc.):
  GET  /api/discover                     -> Step 1: find services by query/category
  GET  /api/discover/:serviceId          -> Step 2: get endpoints, params, pricing (REQUIRED before fetch)
  POST /api/x402/fetch                   -> Step 3: call service endpoint (auto-pays with USDC)
  POST /api/siwe/generate                -> optional SIWE auth for endpoints that require EIP-4361 signatures

Wallet & tokens:
  GET  /api/balances                     -> get balances (includes Polymarket USDC.e)
  POST /api/payment-links                -> create reusable x402 payment link
  GET  /api/payment-links/:paymentLinkId -> get payment link status/details
  POST /api/transfers/evm                -> EVM transfer (ETH/USDC)
  POST /api/transfers/solana             -> Solana transfer (SOL/USDC)
  POST /api/solana/sign                  -> Sign pre-built Solana transaction only
  POST /api/solana/sign-and-send         -> Sign and submit pre-built Solana transaction
  POST /api/transactions/swap            -> Solana swap
  POST /api/transactions/base-swap       -> Base swap (0x)
  POST /api/transactions/tempo-swap      -> Tempo swap (StablecoinExchange DEX)
  POST /api/transactions/bridge          -> Bridge (deBridge)
  MCP: consolidate_usdc                  -> Consolidate USDC from all chains into one
  GET  /api/solana/tokens                -> list SPL tokens
  GET  /api/solana/tokens/search         -> search Jupiter token list
  GET  /api/transactions/status/:txHash  -> transaction status
  GET  /api/transactions/history         -> transaction history
  POST /api/wallets/withdraw-to-main     -> withdraw to owner

Secrets & checkout data:
  POST /api/credit-cards                 -> store encrypted card details (dedicated card tool)
  GET  /api/agent-keys                   -> list stored secret metadata
  GET  /api/agent-keys/value             -> retrieve a stored secret value
  DELETE /api/agent-keys                 -> delete saved secret by service
  POST /api/agent-keys                   -> store non-card service keys

Planning & proposals:
  POST /api/plans/submit                 -> submit multi-step plan
  POST /api/plans/approve                -> approve and execute plan
  POST /api/trades/propose               -> propose single swap for approval

Prepaid cards (Laso Finance, US only):
  MCP: order_prepaid_card                -> order non-reloadable prepaid Visa ($5-$1000, charged in USDC)
  MCP: get_prepaid_card                  -> get card status/details (poll until "ready")
  MCP: search_prepaid_card_merchants     -> check if a merchant accepts the card

Banking (Bridge.xyz):
  MCP: bank_onboard              -> start KYC, get hosted verification URL
  MCP: bank_status               -> check KYC/onboarding status
  MCP: bank_create_virtual_account -> create/get virtual bank account (USD→USDC deposits)
  MCP: bank_get_virtual_account  -> get deposit instructions for a wallet
  MCP: bank_list_external_accounts -> list linked bank accounts
  MCP: bank_add_external_account -> link US bank account for ACH payouts
  MCP: bank_send                -> off-ramp: send USD to linked bank via ACH (USDC→USD)
  MCP: bank_list_transfers       -> list fiat transfer history

Trading & shopping:
  POST /api/polymarket                   -> Polymarket prediction market trading
  POST /api/hyperliquid                  -> Hyperliquid perps/spot trading
  POST /api/checkout                     -> Amazon checkout (initiate purchase)
  GET  /api/checkout/:sessionId          -> checkout status
  DELETE /api/checkout/:sessionId        -> cancel checkout
  GET  /api/checkout/history             -> checkout history
  POST /api/checkout/amazon-search       -> search Amazon products

Auth (one-time setup):
  POST /api/agents/register              -> register (no auth)
  POST /api/oauth/device/authorization   -> device login start (humans)
  POST /api/oauth/device/token           -> device token poll (agents + humans)

Rules: use register (agents), never login | store key in ~/.spongewallet/credentials.json | requests are JSON
Errors: HTTP status + JSON error message
```

This skill is **doc-only**. There is no local CLI. Most capabilities are exposed via the Sponge Wallet REST API, and MCP-only tools are labeled explicitly in this file.

## What you can do with Sponge
1. **Manage crypto** — check balances, transfer tokens (EVM and Solana), swap on Solana/Base/Tempo, bridge cross-chain
2. **Create payment links** — generate reusable x402 payment URLs and check payment status
3. **Access paid external services** — search, image generation, web scraping, AI models, data enrichment, and more. Always follow these 3 steps:
   1. `GET /api/discover?query=...` — find a service
   2. `GET /api/discover/{serviceId}` — get its endpoints, params, and payment config **(do not skip)**
   3. `POST /api/x402/fetch` — call the endpoint using the URL and params from step 2 (auto-pays with USDC)
4. **Banking** — KYC onboarding, virtual bank accounts (receive USD as USDC), link bank accounts, send USD to bank (off-ramp USDC)
5. **Trade on prediction markets and perps** — Polymarket, Hyperliquid
6. **Shop on Amazon** — search products and checkout
7. **Store encrypted card data for checkout** — use the dedicated card tool

**If a task requires an external capability you don't have** (e.g., generating images, searching the web, scraping a URL, looking up a person's email), use the 3-step discover flow above. There is likely a paid service available for it.

## Base URL & Auth
- Base URL: `https://api.wallet.paysponge.com`
- Auth header: `Authorization: Bearer <SPONGE_API_KEY>`
- Content-Type: `application/json`
- Version header: `Sponge-Version: 0.2.1` (REQUIRED on every request)

## Agent Registration
```bash
curl -sS -X POST "https://api.wallet.paysponge.com/api/agents/register" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"YourAgentName",
    "agentFirst": true,
    "testnet": true
  }'
```

Store `apiKey`, `claimCode`, and `verificationUriComplete` in `~/.spongewallet/credentials.json` so a human can claim later.

## Payment Links (Core for Marketplace)
```bash
# Create a payment link
curl -sS -X POST "https://api.wallet.paysponge.com/api/payment-links" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "25.00",
    "description": "Product purchase",
    "callback_url": "https://api.mawadao.com/seller/orders/webhook/payment"
  }'

# Check payment status
curl -sS "https://api.wallet.paysponge.com/api/payment-links/<ID>" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1"
```

## Check Balance
```bash
curl -sS "https://api.wallet.paysponge.com/api/balances?chain=base" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1"
```

## Transfer USDC
```bash
curl -sS -X POST "https://api.wallet.paysponge.com/api/transfers/evm" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Sponge-Version: 0.2.1" \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "base",
    "to": "0x...",
    "amount": "10",
    "currency": "USDC"
  }'
```
