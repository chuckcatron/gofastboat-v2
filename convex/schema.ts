import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Inventory data model for the GoFastBoat storefront (AB#1238).
// Mirrors the legacy site's models (boat / image / part / pageContent),
// modernized with slugs, prices, and explicit status for SEO + merchandising.

// How the price is presented on a listing.
const priceType = v.union(
  v.literal("firm"), // exact asking price
  v.literal("obo"), // or best offer
  v.literal("call") // "call for price" — `price` may be omitted
);

// Listing lifecycle. Sold items stay queryable (kept for SEO) but are filtered
// out of the default public listing.
const listingStatus = v.union(
  v.literal("available"),
  v.literal("sold"),
  v.literal("coming-soon")
);

export default defineSchema({
  boats: defineTable({
    title: v.string(),
    slug: v.string(),
    manufacturer: v.string(),
    craftType: v.string(), // e.g. "go-fast", "center console", "pontoon"
    year: v.optional(v.number()),
    model: v.optional(v.string()),
    lengthFt: v.optional(v.number()),
    price: v.optional(v.number()), // omitted when priceType === "call"
    priceType,
    hours: v.optional(v.number()), // engine hours
    engine: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.string(),
    status: listingStatus,
    featured: v.boolean(), // surfaced in the home carousel
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_featured", ["featured"]),

  boatImages: defineTable({
    boatId: v.id("boats"),
    storageId: v.id("_storage"),
    order: v.number(), // display order within a boat's gallery
    isPrimary: v.boolean(), // the card/thumbnail + OG image
  }).index("by_boat", ["boatId"]),

  // Parts / accessories — the legacy "Products" page.
  products: defineTable({
    title: v.string(),
    slug: v.string(),
    price: v.optional(v.number()),
    description: v.string(),
    status: listingStatus,
    images: v.array(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // Editable site copy (home hero, footer phone/email) keyed by a stable string.
  pageContent: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
