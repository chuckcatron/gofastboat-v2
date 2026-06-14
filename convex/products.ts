import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { slugify, uniqueSlug } from "./lib/slug";
import { listingStatus } from "./lib/validators";

// Product (parts/accessories) queries + admin-gated mutations (AB#1239).
// Mirrors boats.ts; the legacy "Products" page reads through these.

// Paginated product listing, newest first. Public callers pass `status:
// "available"`; the admin dashboard omits `status` to see everything.
export const listProducts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(listingStatus),
  },
  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      const status = args.status;
      return await ctx.db
        .query("products")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("products")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Single product by slug. Returns sold/coming-soon items too (SEO + deep links).
export const getProductBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const createProduct = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: v.optional(listingStatus),
    price: v.optional(v.number()),
    images: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = await uniqueSlug(ctx, "products", slugify(args.title, "product"));
    return await ctx.db.insert("products", {
      title: args.title,
      slug,
      description: args.description,
      status: args.status ?? "available",
      price: args.price,
      images: args.images ?? [],
      createdAt: Date.now(),
    });
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(listingStatus),
    price: v.optional(v.number()),
    images: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Product not found");

    // Only defined fields are patched; omitting a field leaves it unchanged.
    const { id, title, ...rest } = args;
    const updates: Partial<Doc<"products">> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        (updates as Record<string, unknown>)[key] = value;
      }
    }
    if (title !== undefined && title !== existing.title) {
      updates.title = title;
      updates.slug = await uniqueSlug(
        ctx,
        "products",
        slugify(title, "product"),
        id,
      );
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Stored image blobs (products.images) are left to a storage-cleanup pass;
    // cascading file deletion is out of scope for this story.
    await ctx.db.delete(args.id);
  },
});
