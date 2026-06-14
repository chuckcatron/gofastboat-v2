import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// URL-safe slug helpers shared by boat and product mutations (AB#1239).

const DEFAULT_FALLBACK = "item";

// Turn a human title into a lowercase, hyphenated, URL-safe slug. Accented
// characters are decomposed (café -> cafe); runs of non-alphanumerics collapse
// to a single hyphen. Falls back to `fallback` when the title has no usable
// characters (e.g. symbol-only titles) so we never produce an empty slug.
export function slugify(title: string, fallback: string = DEFAULT_FALLBACK): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

// Resolve a slug that is unique within `table`. Appends `-2`, `-3`, … on
// collision. `excludeId` lets an update keep its own slug without colliding
// with itself.
export async function uniqueSlug(
  ctx: QueryCtx,
  table: "boats" | "products",
  base: string,
  excludeId?: Id<"boats"> | Id<"products">,
): Promise<string> {
  let candidate = base;
  let n = 1;
  // Bounded by the number of existing rows that share `base`; in practice tiny.
  for (;;) {
    const existing = await ctx.db
      .query(table)
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing || existing._id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
