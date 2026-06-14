import { v } from "convex/values";

// Shared argument validators mirroring the schema unions (AB#1239), reused by
// the boat and product functions so the two files never drift apart.

// Listing lifecycle. Matches `listingStatus` in schema.ts.
export const listingStatus = v.union(
  v.literal("available"),
  v.literal("sold"),
  v.literal("coming-soon"),
);

// How a price is presented. Matches `priceType` in schema.ts.
export const priceType = v.union(
  v.literal("firm"),
  v.literal("obo"),
  v.literal("call"),
);
