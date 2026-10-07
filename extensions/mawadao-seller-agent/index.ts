import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { Type } from "openclaw/plugin-sdk";
import { MawadaoSellerClient } from "./src/client.js";
import { readFileSync } from "node:fs";

const SPONGE_API_URL = "https://api.wallet.paysponge.com";
const SPONGE_VERSION = "0.2.1";

const plugin = {
  id: "mawadao-seller-agent",
  name: "mawaDao Seller Agent",
  description:
    "Autonomous marketplace agent — product listing, social selling, image generation (via nano-banana-pro), payments (via sponge-wallet), and approval workflows for mawaDao sellers.",
  configSchema: Type.Object({
    mawadao_api_url: Type.String(),
    mawadao_api_token: Type.String(),
    gemini_api_key: Type.Optional(Type.String()),
    sponge_api_key: Type.Optional(Type.String()),
  }),

  register(api: OpenClawPluginApi) {
    // ── Hook: inject seller context + provision env keys ────────────
    api.registerHook("session:start", async (ctx) => {
      // Auto-provision GEMINI_API_KEY for the nano-banana-pro skill
      if (ctx.config.gemini_api_key && !process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = ctx.config.gemini_api_key;
      }
      // Auto-provision SPONGE_API_KEY for the sponge-wallet skill
      if (ctx.config.sponge_api_key && !process.env.SPONGE_API_KEY) {
        process.env.SPONGE_API_KEY = ctx.config.sponge_api_key;
      }

      const client = new MawadaoSellerClient(
        ctx.config.mawadao_api_url,
        ctx.config.mawadao_api_token,
      );
      const profile = await client.getSellerProfile().catch(() => null);
      if (profile) {
        ctx.session.set("seller_profile", profile);
        ctx.session.set("seller_category", profile.category_slug);
      }
    });

    // ── Tool: detect_seller_category ────────────────────────────────
    api.registerTool({
      name: "detect_seller_category",
      description:
        "Detect or confirm the seller's category based on their profile and product description. Returns the best-matching category from: design_logo, digital_product, software, creative_services, consulting, marketing.",
      parameters: Type.Object({
        product_description: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const categories = await client.listCategories();
        const profile = ctx.session.get("seller_profile");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                current_category: profile?.category_slug || null,
                available_categories: categories,
                product_hint: params.product_description || null,
                instruction:
                  "Based on the seller profile and product description, select the most appropriate category. If uncertain, ask the seller 2-3 clarifying questions.",
              }),
            },
          ],
        };
      },
    });

    // ── Tool: create_listing_draft ──────────────────────────────────
    api.registerTool({
      name: "create_listing_draft",
      description:
        "Create a new product listing draft in mawaDao. Requires at minimum: product name and a one-line summary. Returns the created product record.",
      parameters: Type.Object({
        name: Type.String(),
        summary: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        price: Type.Optional(Type.String()),
        pricing_model: Type.Optional(
          Type.Union([
            Type.Literal("one_time"),
            Type.Literal("subscription"),
            Type.Literal("custom"),
            Type.Literal("free"),
            Type.Literal("contact"),
          ]),
        ),
        deliverables: Type.Optional(Type.Array(Type.String())),
        target_audience: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const product = await client.createProduct({
          name: params.name,
          summary: params.summary,
          description: params.description,
          price: params.price,
          pricingModel: params.pricing_model,
          deliverables: params.deliverables,
          targetAudience: params.target_audience,
          tags: params.tags,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(product),
            },
          ],
        };
      },
    });

    // ── Tool: generate_listing_variants ─────────────────────────────
    api.registerTool({
      name: "generate_listing_variants",
      description:
        "Save an AI-generated listing version for a product. Includes title, description, bullet points, CTA, hashtags, and tone. The version is marked as current.",
      parameters: Type.Object({
        product_id: Type.String(),
        title: Type.String(),
        description: Type.Optional(Type.String()),
        bullets: Type.Optional(Type.Array(Type.String())),
        cta: Type.Optional(Type.String()),
        hashtags: Type.Optional(Type.Array(Type.String())),
        tone: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const version = await client.createProductVersion(params.product_id, {
          title: params.title,
          description: params.description,
          bullets: params.bullets,
          cta: params.cta,
          hashtags: params.hashtags,
          tone: params.tone,
          generatedBy: "ai",
          isCurrent: true,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(version) }],
        };
      },
    });

    // ── Tool: rewrite_listing_for_channel ───────────────────────────
    api.registerTool({
      name: "rewrite_listing_for_channel",
      description:
        "Save a platform-specific version of a product listing for social media publishing. " +
        "Platforms: marketplace, facebook_page, instagram, linkedin, short_promo, story_caption, followup. " +
        "NOTE: These are social publishing platforms managed via Social Accounts (/seller/social-accounts), NOT messaging channels.",
      parameters: Type.Object({
        product_id: Type.String(),
        channel: Type.String(),
        title: Type.Optional(Type.String()),
        body: Type.String(),
        cta: Type.Optional(Type.String()),
        hashtags: Type.Optional(Type.Array(Type.String())),
        product_version_id: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const output = await client.createListingOutput(params.product_id, {
          channel: params.channel,
          title: params.title,
          body: params.body,
          cta: params.cta,
          hashtags: params.hashtags,
          productVersionId: params.product_version_id,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
        };
      },
    });

    // ── Tool: register_product_asset ────────────────────────────────
    // NOTE: Image generation is delegated to OpenClaw's native
    // nano-banana-pro skill. The AI agent generates the image first,
    // then calls this tool to register it as a product asset.
    api.registerTool({
      name: "register_product_asset",
      description:
        "Register an image file (generated by nano-banana-pro skill or uploaded) as a product asset in mawaDao. " +
        "WORKFLOW: First use the nano-banana-pro skill to generate the image, then call this tool with the file_path from the MEDIA: output. " +
        "Asset types: image, thumbnail, mockup, promo_card.",
      parameters: Type.Object({
        product_id: Type.String(),
        file_path: Type.String(),
        asset_type: Type.String(),
        file_name: Type.Optional(Type.String()),
        generation_prompt: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        // Read the image file and convert to base64 data URI
        let fileUrl: string;
        try {
          const fileBuffer = readFileSync(params.file_path);
          const base64 = fileBuffer.toString("base64");
          const ext = params.file_path.split(".").pop()?.toLowerCase() || "png";
          const mimeMap: Record<string, string> = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            webp: "image/webp",
            gif: "image/gif",
          };
          const mimeType = mimeMap[ext] || "image/png";
          fileUrl = `data:${mimeType};base64,${base64}`;
        } catch (err: any) {
          throw new Error(`Failed to read image file: ${err.message}`);
        }

        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const asset = await client.createAsset(params.product_id, {
          assetType: params.asset_type,
          fileUrl,
          fileName: params.file_name || `Generated ${params.asset_type}`,
          isGenerated: !!params.generation_prompt,
          generationPrompt: params.generation_prompt,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(asset) }],
        };
      },
    });

    // ── Tool: create_payment_link ───────────────────────────────────
    api.registerTool({
      name: "create_payment_link",
      description:
        "Create a PaySponge payment link for a product. Buyers pay via USDC. " +
        "Returns a payment URL the buyer can use to complete the purchase.",
      parameters: Type.Object({
        product_id: Type.String(),
        amount: Type.String(),
        description: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const spongeKey = ctx.config.sponge_api_key || process.env.SPONGE_API_KEY;
        if (!spongeKey) {
          throw new Error(
            "Missing sponge_api_key. Set it in plugin config or install the sponge-wallet skill and set SPONGE_API_KEY."
          );
        }

        // Create payment link via PaySponge API
        const res = await fetch(`${SPONGE_API_URL}/api/payment-links`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${spongeKey}`,
            "Sponge-Version": SPONGE_VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: params.amount,
            description:
              params.description || `Purchase: Product ${params.product_id}`,
            callback_url: `${ctx.config.mawadao_api_url}/seller/orders/webhook/payment`,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(
            `PaySponge error: ${(err as any)?.error || res.statusText}`
          );
        }

        const linkData = await res.json();

        // Also record the payment link in mawaDao for tracking
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        await client.createOrder({
          productId: params.product_id,
          amount: params.amount,
          currency: "USDC",
          paymentLinkId: linkData.id || linkData.paymentLinkId,
        }).catch(() => null); // non-fatal if order table not yet deployed

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                payment_link_id: linkData.id || linkData.paymentLinkId,
                payment_url: linkData.url || linkData.paymentUrl,
                amount: params.amount,
                currency: "USDC",
                product_id: params.product_id,
                status: "awaiting_payment",
              }),
            },
          ],
        };
      },
    });

    // ── Tool: get_wallet_balance ────────────────────────────────────
    api.registerTool({
      name: "get_wallet_balance",
      description:
        "Check the seller's PaySponge wallet balance. Shows USDC and other token balances across chains (Base, Solana, etc.).",
      parameters: Type.Object({
        chain: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const spongeKey = ctx.config.sponge_api_key || process.env.SPONGE_API_KEY;
        if (!spongeKey) {
          throw new Error(
            "Missing sponge_api_key. Set it in plugin config or install the sponge-wallet skill."
          );
        }

        const query = params.chain ? `?chain=${params.chain}` : "";
        const res = await fetch(
          `${SPONGE_API_URL}/api/balances${query}`,
          {
            headers: {
              Authorization: `Bearer ${spongeKey}`,
              "Sponge-Version": SPONGE_VERSION,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(
            `PaySponge error: ${(err as any)?.error || res.statusText}`
          );
        }

        const balances = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(balances) }],
        };
      },
    });

    // ── Tool: check_order_status ────────────────────────────────────
    api.registerTool({
      name: "check_order_status",
      description:
        "Check the payment/delivery status of a marketplace order by its payment link ID.",
      parameters: Type.Object({
        payment_link_id: Type.String(),
      }),
      async execute(_id, params, ctx) {
        const spongeKey = ctx.config.sponge_api_key || process.env.SPONGE_API_KEY;
        if (!spongeKey) {
          throw new Error("Missing sponge_api_key.");
        }

        const res = await fetch(
          `${SPONGE_API_URL}/api/payment-links/${params.payment_link_id}`,
          {
            headers: {
              Authorization: `Bearer ${spongeKey}`,
              "Sponge-Version": SPONGE_VERSION,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(
            `PaySponge error: ${(err as any)?.error || res.statusText}`
          );
        }

        const status = await res.json();
        return {
          content: [{ type: "text", text: JSON.stringify(status) }],
        };
      },
    });

    // ── Tool: save_listing ──────────────────────────────────────────
    api.registerTool({
      name: "save_listing",
      description:
        "Update a product's status or details. Use to activate, pause, or archive a product.",
      parameters: Type.Object({
        product_id: Type.String(),
        status: Type.Optional(
          Type.Union([
            Type.Literal("draft"),
            Type.Literal("active"),
            Type.Literal("paused"),
            Type.Literal("archived"),
          ]),
        ),
        name: Type.Optional(Type.String()),
        summary: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const product = await client.updateProduct(params.product_id, {
          status: params.status,
          name: params.name,
          summary: params.summary,
          description: params.description,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(product) }],
        };
      },
    });

    // ── Tool: request_approval ──────────────────────────────────────
    api.registerTool({
      name: "request_approval",
      description:
        "Submit a listing, publish action, visual, or promotion for seller approval. Types: listing, publish, visual, promotion.",
      parameters: Type.Object({
        product_id: Type.String(),
        request_type: Type.Union([
          Type.Literal("listing"),
          Type.Literal("publish"),
          Type.Literal("visual"),
          Type.Literal("promotion"),
        ]),
        product_version_id: Type.Optional(Type.String()),
        listing_output_id: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const approval = await client.createApproval({
          productId: params.product_id,
          requestType: params.request_type,
          productVersionId: params.product_version_id,
          listingOutputId: params.listing_output_id,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(approval) }],
        };
      },
    });

    // ── Tool: publish_to_channel ────────────────────────────────────
    api.registerTool({
      name: "publish_to_channel",
      description:
        "Publish a product listing to a social media platform (facebook_page, instagram, linkedin, internal_marketplace). " +
        "Dispatches through mawaDao's publishing pipeline via Zernio social accounts. " +
        "IMPORTANT: Social publishing uses Social Accounts connected at /seller/social-accounts — NOT the messaging Channels page at /channels. " +
        "If the seller has no connected social accounts, direct them to /seller/social-accounts to connect via Zernio.",
      parameters: Type.Object({
        product_id: Type.String(),
        channel: Type.String(),
        listing_output_id: Type.Optional(Type.String()),
        publishing_target_id: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const result = await client.publish({
          productId: params.product_id,
          channel: params.channel,
          listingOutputId: params.listing_output_id,
          publishingTargetId: params.publishing_target_id,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    });

    // ── Tool: schedule_recurring_promotion ───────────────────────────
    api.registerTool({
      name: "schedule_recurring_promotion",
      description:
        "Create a recurring promotion rule for a product. Types: repost, reminder, launch_sequence, weekend_promo, still_available, custom.",
      parameters: Type.Object({
        product_id: Type.String(),
        rule_name: Type.String(),
        rule_type: Type.Union([
          Type.Literal("repost"),
          Type.Literal("reminder"),
          Type.Literal("launch_sequence"),
          Type.Literal("weekend_promo"),
          Type.Literal("still_available"),
          Type.Literal("custom"),
        ]),
        delay_hours: Type.Optional(Type.Number()),
        schedule_cron: Type.Optional(Type.String()),
        template: Type.Optional(Type.String()),
        channels: Type.Optional(Type.Array(Type.String())),
        max_runs: Type.Optional(Type.Number()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const rule = await client.createPromotion({
          productId: params.product_id,
          ruleName: params.rule_name,
          ruleType: params.rule_type,
          delayHours: params.delay_hours,
          scheduleCron: params.schedule_cron,
          template: params.template,
          channels: params.channels,
          maxRuns: params.max_runs,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(rule) }],
        };
      },
    });

    // ── Tool: list_connected_social_accounts ────────────────────────
    api.registerTool({
      name: "list_connected_social_accounts",
      description:
        "List the seller's connected social accounts and publishing targets for social media posting. " +
        "These are Zernio-powered accounts for PUBLISHING content (Instagram, Facebook, LinkedIn, Twitter). " +
        "NOT the same as messaging Channels (/channels). If no accounts are connected, tell the seller to go to Social Accounts (/seller/social-accounts).",
      parameters: Type.Object({}),
      async execute(_id, _params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const [accounts, targets] = await Promise.all([
          client.listSocialAccounts(),
          client.listPublishingTargets(),
        ]);

        const hasAccounts = Array.isArray(accounts) && accounts.length > 0;
        const guidance = hasAccounts
          ? undefined
          : "No social accounts are connected yet. The seller should go to Social Accounts (/seller/social-accounts) to connect their Instagram, Facebook, LinkedIn, or Twitter accounts via Zernio. This is different from messaging Channels (/channels).";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ accounts, targets, ...(guidance ? { guidance } : {}) }),
            },
          ],
        };
      },
    });

    // ── Tool: get_publishing_status ─────────────────────────────────
    api.registerTool({
      name: "get_publishing_status",
      description:
        "Check the status of publishing jobs for a product. Shows pending, published, failed, and scheduled jobs.",
      parameters: Type.Object({
        product_id: Type.Optional(Type.String()),
        status: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const jobs = await client.listPublishingJobs({
          productId: params.product_id,
          status: params.status,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(jobs) }],
        };
      },
    });

    // ── Tool: get_wallet_settings ───────────────────────────────────
    api.registerTool({
      name: "get_wallet_settings",
      description:
        "Get the seller's wallet configuration — connection status, daily limits, approval policy, and allowed chains.",
      parameters: Type.Object({}),
      async execute(_id, _params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const settings = await client.getWalletSettings();
        return {
          content: [{ type: "text", text: JSON.stringify(settings) }],
        };
      },
    });

    // ── Tool: request_wallet_transfer ───────────────────────────────
    api.registerTool({
      name: "request_wallet_transfer",
      description:
        "Request a USDC transfer from the seller's wallet. If the amount exceeds the auto-approve " +
        "threshold, the action will be queued for human approval. Returns the pending action record.",
      parameters: Type.Object({
        to: Type.String(),
        amount: Type.String(),
        chain: Type.Optional(Type.String()),
        currency: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const result = await client.requestWalletTransfer({
          to: params.to,
          amount: params.amount,
          chain: params.chain,
          currency: params.currency,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    });

    // ── Tool: request_wallet_swap ───────────────────────────────────
    api.registerTool({
      name: "request_wallet_swap",
      description:
        "Request a token swap via the seller's wallet (e.g. USDC → ETH). " +
        "Subject to approval policy. Returns the pending action record.",
      parameters: Type.Object({
        from: Type.String(),
        to: Type.String(),
        amount: Type.String(),
        chain: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const result = await client.requestWalletSwap({
          from: params.from,
          to: params.to,
          amount: params.amount,
          chain: params.chain,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    });

    // ── Tool: list_wallet_actions ───────────────────────────────────
    api.registerTool({
      name: "list_wallet_actions",
      description:
        "List pending wallet actions awaiting approval, or query by status/type. " +
        "Use this to check if any transfers, swaps, or other actions need attention.",
      parameters: Type.Object({
        status: Type.Optional(Type.String()),
        action_type: Type.Optional(Type.String()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const actions = await client.listWalletActions({
          status: params.status,
          actionType: params.action_type,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(actions) }],
        };
      },
    });

    // ── Tool: get_wallet_transactions ───────────────────────────────
    api.registerTool({
      name: "get_wallet_transactions",
      description:
        "Fetch recent transaction history from the seller's PaySponge wallet. " +
        "Optionally filter by chain.",
      parameters: Type.Object({
        chain: Type.Optional(Type.String()),
        limit: Type.Optional(Type.Number()),
      }),
      async execute(_id, params, ctx) {
        const client = new MawadaoSellerClient(
          ctx.config.mawadao_api_url,
          ctx.config.mawadao_api_token,
          ctx.metadata?.user_id || ctx.metadata?.moltbook_user_id || ctx.session?.get("user_id")
        );
        const txns = await client.getWalletTransactions({
          chain: params.chain,
          limit: params.limit,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(txns) }],
        };
      },
    });
  },
};

export default plugin;
