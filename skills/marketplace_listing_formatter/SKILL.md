---
name: marketplace_listing_formatter
description: Use when formatting final marketplace listings for Barrsa's internal marketplace. Handles catalog structure, SEO-friendly copy, and consistent listing format across all seller categories.
metadata: { "openclaw": { "emoji": "🏪" } }
---

# Marketplace Listing Formatter

Formats product listings for Barrsa's internal marketplace catalog.

## Listing Structure

Every marketplace listing must have:

```
TITLE: [max 100 chars, searchable, benefit-driven]
SHORT DESCRIPTION: [max 160 chars, shown in search results / cards]
FULL DESCRIPTION: [structured, max 2000 words]
PRICE: [amount + model]
TAGS: [5-10 relevant, lowercase, searchable]
CATEGORY: [one of the seller_categories]
CTA: [action button text]
```

## Title Rules

- Front-load the primary keyword
- Include the deliverable type
- Add a differentiator or benefit
- No ALL CAPS, no excessive punctuation
- Max 100 characters

Good: "Custom Minimalist Logo Design — Professional Brand Identity Package"
Bad: "BEST LOGO DESIGN EVER!!! 🔥🔥🔥 CHEAP"

## Short Description (Search Preview)

- Exactly what the buyer gets, in one sentence
- Include: deliverable + audience + key benefit
- Max 160 characters

Example: "Professional logo design with 3 concepts, unlimited revisions, and full source files. Perfect for startups and small businesses."

## Full Description Template

```markdown
## What You Get
[Numbered list of deliverables]

## How It Works
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Who This Is For
[Target audience description]

## What's Included
- [Deliverable 1]: [detail]
- [Deliverable 2]: [detail]

## Requirements
[What the buyer needs to provide]

## Delivery
[Turnaround time and delivery format]
```

## Tag Selection

Choose 5-10 tags from the product's domain:
- 2-3 broad category tags: `logo-design`, `digital-product`, `saas-tool`
- 2-3 niche tags: `minimalist`, `notion-template`, `telegram-bot`
- 1-2 audience tags: `for-startups`, `for-developers`, `for-creators`
- 1 format tag: `instant-download`, `custom-work`, `subscription`

All lowercase, hyphenated, no special characters.

## Price Display

| Model | Display Format |
|-------|---------------|
| one_time | "$49" or "$49 one-time" |
| subscription | "$12/mo" or "From $12/mo" |
| free | "Free" |
| custom | "Contact for pricing" |
| contact | "Request a quote" |

## Quality Checklist

Before saving a marketplace listing, verify:
- [ ] Title is under 100 chars and keyword-rich
- [ ] Short description is under 160 chars
- [ ] Full description follows the template structure
- [ ] At least one thumbnail image is attached
- [ ] Tags are relevant and properly formatted
- [ ] Price and pricing model are set
- [ ] Category is assigned
- [ ] CTA text is clear and actionable
