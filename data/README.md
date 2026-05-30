# Seed data

## Files

- `categories.json` — category tree source (numeric `categoryId` in file; API exposes `id` as string)
- `products.json` — normalized product catalog (deduplicated, validated URLs)

## Product fields (seed)

| Field | Type | Notes |
|-------|------|--------|
| id | number | Maps to `productId` in MongoDB |
| name | string | Display name |
| slug | string | URL-safe unique key |
| description | string | Long description |
| price | number | List/original price |
| discountPrice | number? | Sale price |
| images | string[] | Valid `https://` URLs |
| thumbnail | string | Primary image |
| categoryId | string/number | Must exist in categories |
| categoryName | string | Denormalized; synced from category |
| vendor | string | Publisher/brand |
| stock | number | Inventory count |
| rating | number | 0–5 |
| reviewsCount | number | Review count |
| badge | string | UI label (HOT, NEW, …) |
| isActive | boolean | Soft-delete via `false` |

## Restart

Run `npm run dev` in `E-commerce_Server` to upsert seed data on startup.
