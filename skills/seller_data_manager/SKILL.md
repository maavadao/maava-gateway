---
name: seller_data_manager
description: Query and manage your seller data — products, assets, listings, social accounts, campaigns — directly via chat.
metadata: { "openclaw": { "emoji": "🛒", "always": true } }
---

# Seller Data Manager Skill

You have **direct database access** to the authenticated user's seller data. You can read, create, update, and manage **all** seller-related tables — but **ONLY** data belonging to the current user. Row Level Security (RLS) is enforced at the database layer; you cannot access any other user's data.

---

## ⚠️ SECURITY MODEL — ABSOLUTE RULES

1. **User Isolation**: Every query runs inside a transaction that sets `app.current_user_id` to the authenticated user's UUID. RLS policies on every table guarantee you can only see/modify this user's rows. You CANNOT bypass this.
2. **Allowed Tables ONLY**: You may ONLY query the tables listed in "Accessible Tables" below. Any attempt to access `users`, `organizations`, `marketplace_agents`, `gateway_*`, `sessions`, `messages`, or ANY other table is **STRICTLY FORBIDDEN**.
3. **No DDL**: You may NEVER execute `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE INDEX`, or any Data Definition Language statement.
4. **No TRUNCATE / DELETE ALL**: Every `DELETE` MUST have a `WHERE` clause scoping to a specific record by `id`. Mass deletes are forbidden.
5. **No Raw Token Access**: You may NEVER `SELECT access_token_enc` or `refresh_token_enc` from `connected_social_accounts`. These columns are encrypted and off-limits.
6. **Parameterized Only**: All values in queries MUST use `$1, $2, ...` placeholders — NEVER string interpolation or concatenation.
7. **Read Before Write**: Before any UPDATE or DELETE, always SELECT first to confirm the record exists and belongs to the user. Show the user what will change and get confirmation for destructive operations.

---

## 📋 Accessible Tables — Complete Schema

### 1. `seller_profiles` — User's seller identity & preferences
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Auto-generated |
| user_id | UUID | Current user (RLS enforced) |
| category_id | UUID FK → seller_categories | Business category |
| business_name | TEXT | |
| brand_voice | TEXT | e.g. "professional", "casual", "playful" |
| tagline | TEXT | |
| target_audience | TEXT | |
| default_cta | TEXT | Default call-to-action |
| approval_required | BOOLEAN | Default true |
| auto_publish_channels | TEXT[] | Channel slugs allowed for auto-publish |
| timezone | TEXT | Default 'UTC' |
| logo_url | TEXT | |
| website_url | TEXT | |
| metadata | JSONB | |
| is_active | BOOLEAN | |
| onboarding_completed | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-set on update |

### 2. `seller_categories` — Business taxonomy (READ-ONLY)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| slug | TEXT UNIQUE | e.g. 'design_logo', 'digital_product', 'software' |
| name | TEXT | e.g. 'Design & Logo Services' |
| description | TEXT | |
| parent_id | UUID FK → self | For hierarchy |
| sort_order | INT | |
| is_active | BOOLEAN | |

**⚠️ READ-ONLY** — this is a shared reference table. Never INSERT/UPDATE/DELETE.

### 3. `products` — Core product/service records
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | RLS enforced |
| seller_profile_id | UUID FK → seller_profiles | |
| category_id | UUID FK → seller_categories | |
| name | TEXT NOT NULL | Product name |
| summary | TEXT | One-line summary |
| description | TEXT | Full description |
| price | NUMERIC(12,2) | |
| pricing_model | TEXT | 'one_time' \| 'subscription' \| 'custom' \| 'free' \| 'contact' |
| currency | TEXT | Default 'USD' |
| deliverables | TEXT[] | What buyer gets |
| target_audience | TEXT | |
| tags | TEXT[] | |
| status | TEXT | 'draft' \| 'active' \| 'paused' \| 'archived' |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 4. `product_versions` — Generated listing variants & revisions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK → products | RLS via products.user_id |
| version_num | INT | Default 1 |
| title | TEXT NOT NULL | |
| description | TEXT | |
| bullets | TEXT[] | Selling points |
| cta | TEXT | Call-to-action |
| hashtags | TEXT[] | |
| tone | TEXT | Detected/requested tone |
| generated_by | TEXT | 'ai', 'manual', 'hybrid' |
| is_current | BOOLEAN | Default false |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |

### 5. `product_assets` — Images, thumbnails, mockups, videos
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK → products | |
| user_id | UUID | RLS enforced |
| asset_type | TEXT | 'image' \| 'thumbnail' \| 'mockup' \| 'promo_card' \| 'video' \| 'document' \| 'other' |
| file_url | TEXT NOT NULL | |
| file_name | TEXT | |
| file_size | BIGINT | |
| mime_type | TEXT | |
| width | INT | |
| height | INT | |
| is_generated | BOOLEAN | AI-generated? |
| generation_prompt | TEXT | Prompt used if AI-generated |
| sort_order | INT | Display ordering |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |

### 6. `listing_outputs` — Channel-specific content (marketplace, Instagram, LinkedIn, etc.)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK → products | RLS via products.user_id |
| product_version_id | UUID FK → product_versions | Optional |
| channel | TEXT NOT NULL | 'marketplace', 'instagram', 'facebook_page', 'linkedin', 'short_promo', 'story_caption', 'followup' |
| title | TEXT | |
| body | TEXT | The post/listing content |
| cta | TEXT | |
| hashtags | TEXT[] | |
| media_urls | TEXT[] | |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 7. `connected_social_accounts` — User's social platform connections
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | RLS enforced |
| provider | TEXT | 'zernio', 'late', 'postiz', 'composio', etc. |
| provider_account_id | TEXT | ID within the provider |
| platform | TEXT | 'facebook_page', 'instagram', 'linkedin', 'twitter', 'tiktok' |
| platform_account_id | TEXT | Page/account ID on the platform |
| account_name | TEXT | Display name |
| account_url | TEXT | |
| ~~access_token_enc~~ | — | **🚫 NEVER SELECT THIS** |
| ~~refresh_token_enc~~ | — | **🚫 NEVER SELECT THIS** |
| token_expires_at | TIMESTAMPTZ | |
| scopes | TEXT[] | |
| is_active | BOOLEAN | |
| last_used_at | TIMESTAMPTZ | |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 8. `publishing_targets` — Configured publishing destinations
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | RLS enforced |
| social_account_id | UUID FK → connected_social_accounts | |
| target_type | TEXT | 'facebook_page', 'instagram_account', 'linkedin_page', 'internal_marketplace' |
| target_label | TEXT | User-friendly label |
| is_default | BOOLEAN | |
| is_active | BOOLEAN | |
| config | JSONB | Target-specific settings |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 9. `publishing_jobs` — Publishing queue (pending, published, failed)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | RLS enforced |
| product_id | UUID FK → products | |
| listing_output_id | UUID FK → listing_outputs | |
| publishing_target_id | UUID FK → publishing_targets | |
| channel | TEXT NOT NULL | |
| status | TEXT | 'pending' \| 'scheduled' \| 'publishing' \| 'published' \| 'failed' \| 'cancelled' |
| scheduled_at | TIMESTAMPTZ | |
| published_at | TIMESTAMPTZ | |
| retry_count | INT | Default 0 |
| max_retries | INT | Default 3 |
| last_error | TEXT | |
| idempotency_key | TEXT UNIQUE | Prevent duplicates |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 10. `publishing_results` — Execution results & platform post IDs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| publishing_job_id | UUID FK → publishing_jobs | RLS via publishing_jobs.user_id |
| provider | TEXT | |
| provider_post_id | TEXT | ID from Zernio/provider |
| platform_post_id | TEXT | ID on the actual platform |
| post_url | TEXT | Public URL of the published post |
| platform | TEXT | |
| status | TEXT | 'success' \| 'partial' \| 'failed' |
| error_code | TEXT | |
| error_message | TEXT | |
| response_data | JSONB | |
| created_at | TIMESTAMPTZ | |

### 11. `approval_requests` — Review/approve/reject workflow
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | RLS enforced |
| product_id | UUID FK → products | |
| product_version_id | UUID FK → product_versions | |
| listing_output_id | UUID FK → listing_outputs | |
| request_type | TEXT | 'listing' \| 'publish' \| 'visual' \| 'promotion' |
| status | TEXT | 'pending' \| 'approved' \| 'rejected' \| 'expired' |
| reviewer_notes | TEXT | |
| submitted_at | TIMESTAMPTZ | |
| reviewed_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 12. `promotion_rules` — Recurring/scheduled promotion automation
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | RLS enforced |
| product_id | UUID FK → products | |
| rule_name | TEXT NOT NULL | |
| rule_type | TEXT | 'repost' \| 'reminder' \| 'launch_sequence' \| 'weekend_promo' \| 'still_available' \| 'custom' |
| schedule_cron | TEXT | Cron expression |
| delay_hours | INT | Simple delay from product activation |
| template | TEXT | Text template with {{placeholders}} |
| channels | TEXT[] | |
| max_runs | INT | Max executions (null = unlimited) |
| is_active | BOOLEAN | |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 13. `campaign_runs` — Audit log of automation executions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | RLS enforced |
| promotion_rule_id | UUID FK → promotion_rules | |
| product_id | UUID FK → products | |
| publishing_job_id | UUID FK → publishing_jobs | |
| run_type | TEXT | 'scheduled' \| 'manual' \| 'auto_repost' |
| status | TEXT | 'running' \| 'completed' \| 'failed' \| 'skipped' |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| summary | JSONB | Channels posted, errors, etc. |
| created_at | TIMESTAMPTZ | |

---

## 🔧 How to Execute SQL — Action Blocks

To perform any database operation, output a `[SELLER_SQL]` block. The system will execute the query using `queryWithRLS(userId, sql, params)` which automatically wraps in a transaction with `set_config('app.current_user_id', userId, true)`.

### Block Format

```
[SELLER_SQL]
operation: SELECT | INSERT | UPDATE | DELETE
table: <table_name>
description: <brief human-readable description of what this query does>
sql: <SQL with $1, $2, ... parameter placeholders>
params: ["value1", "value2", ...]
confirm: true | false
[/SELLER_SQL]
```

### Field Rules
- **operation**: Required. One of SELECT, INSERT, UPDATE, DELETE.
- **table**: Required. Must be one of the 13 accessible tables listed above.
- **description**: Required. Short human-readable explanation (shown to user before execution).
- **sql**: Required. Parameterized SQL query. ONLY use `$1`, `$2`, etc. for values.
- **params**: Required. JSON array of parameter values matching `$1`, `$2`, etc.
- **confirm**: Required for UPDATE/DELETE operations. Set `true` to require user confirmation before execution. Always `true` for DELETE.

### Examples

#### List all products
```
[SELLER_SQL]
operation: SELECT
table: products
description: Fetching all your products with their status and pricing
sql: SELECT id, name, summary, price, pricing_model, currency, status, created_at FROM products WHERE user_id = $1 ORDER BY created_at DESC
params: ["{{USER_ID}}"]
confirm: false
[/SELLER_SQL]
```

#### Get product details with assets and listings
```
[SELLER_SQL]
operation: SELECT
table: products
description: Getting full details for your product including assets and listing outputs
sql: SELECT p.id, p.name, p.summary, p.description, p.price, p.pricing_model, p.status, p.tags, p.deliverables, p.target_audience, (SELECT json_agg(json_build_object('id', pa.id, 'type', pa.asset_type, 'url', pa.file_url, 'name', pa.file_name)) FROM product_assets pa WHERE pa.product_id = p.id) AS assets, (SELECT json_agg(json_build_object('id', lo.id, 'channel', lo.channel, 'title', lo.title, 'body', lo.body, 'hashtags', lo.hashtags, 'media_urls', lo.media_urls)) FROM listing_outputs lo WHERE lo.product_id = p.id) AS listings FROM products p WHERE p.id = $1 AND p.user_id = $2
params: ["<product-uuid>", "{{USER_ID}}"]
confirm: false
[/SELLER_SQL]
```

#### Create a new product
```
[SELLER_SQL]
operation: INSERT
table: products
description: Creating a new product listing for you
sql: INSERT INTO products (user_id, seller_profile_id, name, summary, description, price, pricing_model, currency, target_audience, tags, status) VALUES ($1, (SELECT id FROM seller_profiles WHERE user_id = $1 LIMIT 1), $2, $3, $4, $5, $6, $7, $8, $9, 'draft') RETURNING id, name, status
params: ["{{USER_ID}}", "Product Name", "Short summary", "Full description", "29.99", "one_time", "USD", "Target audience", ["tag1", "tag2"]]
confirm: false
[/SELLER_SQL]
```

#### Update product price
```
[SELLER_SQL]
operation: UPDATE
table: products
description: Updating the price of "Product Name" from $29.99 to $49.99
sql: UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, name, price
params: ["49.99", "<product-uuid>", "{{USER_ID}}"]
confirm: true
[/SELLER_SQL]
```

#### Create a listing output for Instagram
```
[SELLER_SQL]
operation: INSERT
table: listing_outputs
description: Creating an Instagram listing with caption and hashtags for your product
sql: INSERT INTO listing_outputs (product_id, channel, title, body, hashtags, media_urls) VALUES ($1, 'instagram', $2, $3, $4, $5) RETURNING id, channel, title
params: ["<product-uuid>", "Post Title", "Full caption text here...", ["#hashtag1", "#hashtag2"], ["/api/media/workspace/image.png"]]
confirm: false
[/SELLER_SQL]
```

#### Check publishing job status
```
[SELLER_SQL]
operation: SELECT
table: publishing_jobs
description: Checking the status of your recent publishing jobs
sql: SELECT pj.id, pj.channel, pj.status, pj.last_error, pj.retry_count, pj.published_at, pj.created_at, p.name AS product_name, (SELECT json_build_object('post_url', pr.post_url, 'status', pr.status, 'error', pr.error_message) FROM publishing_results pr WHERE pr.publishing_job_id = pj.id ORDER BY pr.created_at DESC LIMIT 1) AS result FROM publishing_jobs pj JOIN products p ON p.id = pj.product_id WHERE pj.user_id = $1 ORDER BY pj.created_at DESC LIMIT 10
params: ["{{USER_ID}}"]
confirm: false
[/SELLER_SQL]
```

#### View connected social accounts
```
[SELLER_SQL]
operation: SELECT
table: connected_social_accounts
description: Listing your connected social media accounts
sql: SELECT id, provider, platform, account_name, account_url, is_active, scopes, last_used_at, created_at FROM connected_social_accounts WHERE user_id = $1 AND is_active = true ORDER BY platform
params: ["{{USER_ID}}"]
confirm: false
[/SELLER_SQL]
```

#### Create a publishing target
```
[SELLER_SQL]
operation: INSERT
table: publishing_targets
description: Setting up a publishing target for your Instagram account
sql: INSERT INTO publishing_targets (user_id, social_account_id, target_type, target_label, is_active, is_default) VALUES ($1, $2, 'instagram_account', $3, true, true) RETURNING id, target_type, target_label
params: ["{{USER_ID}}", "<social-account-uuid>", "My Instagram"]
confirm: false
[/SELLER_SQL]
```

#### Create a promotion rule
```
[SELLER_SQL]
operation: INSERT
table: promotion_rules
description: Setting up a weekly repost rule for your product across Instagram and LinkedIn
sql: INSERT INTO promotion_rules (user_id, product_id, rule_name, rule_type, schedule_cron, channels, template, is_active) VALUES ($1, $2, $3, 'repost', $4, $5, $6, true) RETURNING id, rule_name, rule_type
params: ["{{USER_ID}}", "<product-uuid>", "Weekly Social Repost", "0 10 * * 1", ["instagram", "linkedin"], "Still available! {{product_name}} — {{summary}} #{{tags}}"]
confirm: false
[/SELLER_SQL]
```

#### Get full seller dashboard overview
```
[SELLER_SQL]
operation: SELECT
table: seller_profiles
description: Loading your complete seller dashboard overview
sql: SELECT sp.business_name, sp.brand_voice, sp.tagline, sp.target_audience, sp.timezone, sc.name AS category, (SELECT COUNT(*) FROM products WHERE user_id = $1) AS total_products, (SELECT COUNT(*) FROM products WHERE user_id = $1 AND status = 'active') AS active_products, (SELECT COUNT(*) FROM publishing_jobs WHERE user_id = $1 AND status = 'published') AS total_published, (SELECT COUNT(*) FROM publishing_jobs WHERE user_id = $1 AND status = 'failed') AS total_failed, (SELECT COUNT(*) FROM connected_social_accounts WHERE user_id = $1 AND is_active = true) AS connected_accounts, (SELECT COUNT(*) FROM approval_requests WHERE user_id = $1 AND status = 'pending') AS pending_approvals FROM seller_profiles sp LEFT JOIN seller_categories sc ON sc.id = sp.category_id WHERE sp.user_id = $1
params: ["{{USER_ID}}"]
confirm: false
[/SELLER_SQL]
```

#### Delete a product (with confirmation)
```
[SELLER_SQL]
operation: DELETE
table: products
description: ⚠️ Deleting product "Product Name" (id: xxx). This will also cascade-delete all versions, assets, listings, and jobs for this product.
sql: DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING id, name
params: ["<product-uuid>", "{{USER_ID}}"]
confirm: true
[/SELLER_SQL]
```

---

## 🧠 Behavioral Guidelines

### When User Asks About Their Data
1. **Always query first** — never assume data state. Run a SELECT to see current data before responding.
2. **Present results clearly** — format query results as tables, lists, or summaries depending on what's natural.
3. **Proactive context** — when showing a product, also mention how many assets, listings, and jobs it has.

### When User Asks to Create/Modify
1. **Gather requirements** — ask for missing required fields conversationally.
2. **Show before save** — for new products, show a preview of what will be created and let the user confirm.
3. **After creation** — always show the returned ID and a summary of what was created.

### When User Asks to Publish
1. **Verify prerequisites** — check that the product has assets (`product_assets`) and a listing output (`listing_outputs`) for the target channel.
2. **Verify social account** — check `connected_social_accounts` for the target platform.
3. **Verify publishing target** — check `publishing_targets` for the target. If missing, offer to create one.
4. **Create listing if needed** — if no listing output exists for the channel, generate one and INSERT it.
5. **Then use [PUBLISH_PRODUCT] block** — after ensuring all prerequisites are met (listing_output_id + publishing_target_id exist), output a [PUBLISH_PRODUCT] block with the correct IDs.

### Multi-Step Operations
For complex operations (e.g., "create a product and post it to Instagram"), chain multiple `[SELLER_SQL]` blocks in sequence:
1. INSERT into `products` → get product ID
2. INSERT into `product_assets` → attach images
3. INSERT into `listing_outputs` → generate Instagram caption
4. Verify `publishing_targets` → ensure target exists
5. Output `[PUBLISH_PRODUCT]` → trigger the publish

### Error Handling
- If a query fails, explain what went wrong in simple terms.
- If a constraint is violated (e.g., duplicate), explain and suggest an alternative.
- Never retry destructive operations without user confirmation.

---

## 🚫 Forbidden Operations — NEVER DO

| Action | Why |
|--------|-----|
| `SELECT * FROM users` | Not a seller table — blocked by RLS |
| `SELECT access_token_enc FROM connected_social_accounts` | Encrypted secrets — off-limits |
| `UPDATE seller_categories SET ...` | Shared reference table — read-only |
| `DROP TABLE products` | DDL is forbidden |
| `DELETE FROM products WHERE user_id = $1` (no specific ID) | Mass delete — forbidden |
| `SELECT * FROM organizations` | Not a seller table |
| `SELECT * FROM marketplace_agents` | Not a seller table |
| String concatenation in SQL: `'...WHERE name = ' + userInput` | SQL injection risk — use $N params |

---

## 📌 Quick Reference — Common User Commands

| User Says | What To Do |
|-----------|-----------|
| "Show my products" | SELECT from products |
| "Product details for X" | SELECT product + assets + listings + jobs |
| "Create a product" | Gather info → INSERT into products |
| "Update the price" | SELECT first → confirm → UPDATE |
| "Delete product X" | SELECT first → confirm → DELETE |
| "Add an image to product X" | INSERT into product_assets |
| "Generate Instagram caption" | INSERT into listing_outputs with channel='instagram' |
| "Post to Instagram" | Check prerequisites → create listing_output if missing → resolve publishing_target → [PUBLISH_PRODUCT] |
| "Show my social accounts" | SELECT from connected_social_accounts (excluding tokens) |
| "What's my publishing history?" | SELECT from publishing_jobs + publishing_results |
| "Set up weekly reposts" | INSERT into promotion_rules |
| "Show failed posts" | SELECT publishing_jobs WHERE status='failed' with publishing_results |
| "My seller dashboard" | Aggregate query across seller_profiles + counts |
| "Update my brand voice" | UPDATE seller_profiles |
| "Show my approval queue" | SELECT from approval_requests WHERE status='pending' |
