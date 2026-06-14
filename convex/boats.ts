import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { slugify, uniqueSlug } from "./lib/slug";
import { listingStatus, priceType } from "./lib/validators";

// Boat inventory queries + admin-gated mutations (AB#1239).
// Public site and admin dashboard both read through these.

const FEATURED_LIMIT = 24;

// Paginated boat listing, newest first. Public callers pass `status:
// "available"`; the admin dashboard omits `status` to see every listing.
export const listBoats = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(listingStatus),
  },
  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      const status = args.status;
      return await ctx.db
        .query("boats")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db.query("boats").order("desc").paginate(args.paginationOpts);
  },
});

// Single boat by slug. Returns sold/coming-soon items too — they stay queryable
// for SEO and deep links.
export const getBoatBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("boats")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Boats surfaced in the home carousel: featured AND currently available.
export const listFeaturedBoats = query({
  args: {},
  handler: async (ctx) => {
    const featured = await ctx.db
      .query("boats")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .order("desc")
      .take(FEATURED_LIMIT);
    return featured.filter((boat) => boat.status === "available");
  },
});

export const createBoat = mutation({
  args: {
    title: v.string(),
    manufacturer: v.string(),
    craftType: v.string(),
    description: v.string(),
    priceType,
    status: v.optional(listingStatus),
    featured: v.optional(v.boolean()),
    year: v.optional(v.number()),
    model: v.optional(v.string()),
    lengthFt: v.optional(v.number()),
    price: v.optional(v.number()),
    hours: v.optional(v.number()),
    engine: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = await uniqueSlug(ctx, "boats", slugify(args.title, "boat"));
    return await ctx.db.insert("boats", {
      title: args.title,
      slug,
      manufacturer: args.manufacturer,
      craftType: args.craftType,
      description: args.description,
      priceType: args.priceType,
      status: args.status ?? "available",
      featured: args.featured ?? false,
      year: args.year,
      model: args.model,
      lengthFt: args.lengthFt,
      price: args.price,
      hours: args.hours,
      engine: args.engine,
      location: args.location,
      createdAt: Date.now(),
    });
  },
});

export const updateBoat = mutation({
  args: {
    id: v.id("boats"),
    title: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    craftType: v.optional(v.string()),
    description: v.optional(v.string()),
    priceType: v.optional(priceType),
    status: v.optional(listingStatus),
    featured: v.optional(v.boolean()),
    year: v.optional(v.number()),
    model: v.optional(v.string()),
    lengthFt: v.optional(v.number()),
    price: v.optional(v.number()),
    hours: v.optional(v.number()),
    engine: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Boat not found");

    // Only defined fields are patched; omitting a field leaves it unchanged
    // (clearing an optional field is not supported here by design).
    const { id, title, ...rest } = args;
    const updates: Partial<Doc<"boats">> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        (updates as Record<string, unknown>)[key] = value;
      }
    }
    // Re-slug only when the title actually changes; exclude self from the check.
    if (title !== undefined && title !== existing.title) {
      updates.title = title;
      updates.slug = await uniqueSlug(ctx, "boats", slugify(title, "boat"), id);
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

export const deleteBoat = mutation({
  args: { id: v.id("boats") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Remove the gallery rows that reference this boat so we don't orphan them.
    const images = await ctx.db
      .query("boatImages")
      .withIndex("by_boat", (q) => q.eq("boatId", args.id))
      .collect();
    for (const image of images) {
      await ctx.db.delete(image._id);
    }
    await ctx.db.delete(args.id);
  },
});
