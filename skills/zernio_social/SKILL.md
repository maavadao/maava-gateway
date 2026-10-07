---
name: zernio_social
description: Manage social media accounts and publish content via Zernio — list accounts, create posts, check post status, and delete posts on Instagram, Facebook, LinkedIn, Twitter, and TikTok.
metadata: { "openclaw": { "emoji": "📱", "always": true } }
---

# Zernio Social Media Manager

You have direct access to the Zernio social media API through `[ZERNIO_API]` blocks. Use these to manage social media accounts and publish content on behalf of the user.

## Available Actions

| Action | Description | Required Params |
|--------|-------------|-----------------|
| `list_accounts` | List all connected social media accounts | — |
| `create_post` | Publish content to one or more platforms | `platforms`, `content` |
| `get_post` | Get status/details of a published post | `postId` |
| `delete_post` | Delete/cancel a published post | `postId` |
| `list_profiles` | List Zernio profiles | — |

## Block Format

```
[ZERNIO_API]
action: <action_name>
description: <human-readable description of what this does>
params: <JSON object with action-specific parameters>
[/ZERNIO_API]
```

## Examples

### List connected social accounts
```
[ZERNIO_API]
action: list_accounts
description: Listing all connected social media accounts
params: {}
[/ZERNIO_API]
```

### Publish to Instagram
```
[ZERNIO_API]
action: create_post
description: Publishing product showcase to Instagram
params: {"platforms": [{"platform": "instagram", "accountId": "{{ACCOUNT_ID}}"}], "content": "Check out our latest product! 🎨", "mediaItems": [{"type": "image", "url": "https://example.com/image.jpg"}], "hashtags": ["#art", "#digital"], "publishNow": true}
[/ZERNIO_API]
```

### Publish to multiple platforms at once
```
[ZERNIO_API]
action: create_post
description: Cross-posting product announcement to Instagram and Facebook
params: {"platforms": [{"platform": "instagram", "accountId": "{{INSTA_ACCOUNT_ID}}"}, {"platform": "facebook", "accountId": "{{FB_ACCOUNT_ID}}"}], "content": "New product just dropped! 🔥", "mediaItems": [{"type": "image", "url": "https://example.com/image.jpg"}], "hashtags": ["#newproduct"], "publishNow": true}
[/ZERNIO_API]
```

### Schedule a post for later
```
[ZERNIO_API]
action: create_post
description: Scheduling Instagram post for tomorrow
params: {"platforms": [{"platform": "instagram", "accountId": "{{ACCOUNT_ID}}"}], "content": "Coming soon! 🚀", "mediaItems": [{"type": "image", "url": "https://example.com/image.jpg"}], "scheduledFor": "2026-04-11T10:00:00Z"}
[/ZERNIO_API]
```

### Check post status
```
[ZERNIO_API]
action: get_post
description: Checking the status of published post
params: {"postId": "abc123"}
[/ZERNIO_API]
```

### Delete a post
```
[ZERNIO_API]
action: delete_post
description: Deleting the failed post
params: {"postId": "abc123"}
[/ZERNIO_API]
```

## Important Rules

1. **Always list accounts first** before publishing — you need the `accountId` from the connected accounts
2. **Instagram REQUIRES at least one image** in `mediaItems`. Never create an Instagram post without an image.
3. **Use product assets** for media. Query product assets via [SELLER_SQL] first to get image URLs, then use them in `mediaItems`.
4. **Platform names**: `instagram`, `facebook`, `linkedin`, `twitter`, `tiktok`, `googlebusiness`
5. **accountId** is the Zernio account ID (from list_accounts), NOT the platform username
6. If the user has no connected accounts, direct them to `/seller/social-accounts` to connect first
7. Results from each [ZERNIO_API] call are returned as a follow-up message — you can reference them in your next response

## Workflow: Publish a Product to Social Media

1. Use `[SELLER_SQL]` to fetch product details (title, description, price)
2. Use `[SELLER_SQL]` to fetch product assets (image URLs)
3. Use `[ZERNIO_API] list_accounts` to get connected accounts + their accountIds
4. Compose the post content from product data
5. Use `[ZERNIO_API] create_post` with the account IDs and image URLs
6. Optionally use `[ZERNIO_API] get_post` to verify status
