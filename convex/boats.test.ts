/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { subject: "admin|1", email: "dave@gofastboat.com" };

// Minimal required fields for a boat; spread + override per test.
const boatArgs = (overrides: Record<string, unknown> = {}) => ({
  title: "Baja 280 Outlaw",
  manufacturer: "Baja",
  craftType: "go-fast",
  description: "A fast boat.",
  priceType: "firm" as const,
  ...overrides,
});

beforeEach(() => {
  // convex-test starts each test with a fresh in-memory backend.
});

describe("boats mutations — admin gating", () => {
  test("createBoat rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.boats.createBoat, boatArgs())).rejects.toThrow(
      "Not authenticated",
    );
  });

  test("updateBoat rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    const id = await t
      .withIdentity(ADMIN)
      .mutation(api.boats.createBoat, boatArgs());
    await expect(
      t.mutation(api.boats.updateBoat, { id, title: "Hijacked" }),
    ).rejects.toThrow("Not authenticated");
  });

  test("deleteBoat rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    const id = await t
      .withIdentity(ADMIN)
      .mutation(api.boats.createBoat, boatArgs());
    await expect(
      t.mutation(api.boats.deleteBoat, { id }),
    ).rejects.toThrow("Not authenticated");
  });

  test("createBoat enforces ADMIN_EMAILS allowlist when set", async () => {
    const t = convexTest(schema, modules);
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "dave@gofastboat.com";
    try {
      await expect(
        t
          .withIdentity({ subject: "intruder", email: "nope@evil.com" })
          .mutation(api.boats.createBoat, boatArgs()),
      ).rejects.toThrow("Not authorized");
      // Allowlisted email succeeds.
      await expect(
        t.withIdentity(ADMIN).mutation(api.boats.createBoat, boatArgs()),
      ).resolves.toBeDefined();
    } finally {
      if (prev === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = prev;
    }
  });
});

describe("boats — slug generation", () => {
  test("auto-generates a slug from the title", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    await t.mutation(api.boats.createBoat, boatArgs());
    const boat = await t.query(api.boats.getBoatBySlug, { slug: "baja-280-outlaw" });
    expect(boat?.title).toBe("Baja 280 Outlaw");
  });

  test("appends a numeric suffix on slug collision", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    await t.mutation(api.boats.createBoat, boatArgs());
    await t.mutation(api.boats.createBoat, boatArgs());
    const second = await t.query(api.boats.getBoatBySlug, {
      slug: "baja-280-outlaw-2",
    });
    expect(second).not.toBeNull();
  });

  test("re-slugs on a title-changing update, excluding itself", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    const id = await t.mutation(api.boats.createBoat, boatArgs());
    await t.mutation(api.boats.updateBoat, { id, title: "Sunseeker Predator" });
    const renamed = await t.query(api.boats.getBoatBySlug, {
      slug: "sunseeker-predator",
    });
    expect(renamed?._id).toBe(id);
  });
});

describe("boats — queries", () => {
  test("getBoatBySlug returns null on a miss", async () => {
    const t = convexTest(schema, modules);
    const boat = await t.query(api.boats.getBoatBySlug, { slug: "nope" });
    expect(boat).toBeNull();
  });

  test("listBoats paginates and reports correct page/isDone", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    for (let i = 0; i < 3; i++) {
      await t.mutation(api.boats.createBoat, boatArgs({ title: `Boat ${i}` }));
    }
    const first = await t.query(api.boats.listBoats, {
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);

    const second = await t.query(api.boats.listBoats, {
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(1);
    expect(second.isDone).toBe(true);
  });

  test("listBoats filters by status", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    await t.mutation(api.boats.createBoat, boatArgs({ title: "A", status: "available" }));
    await t.mutation(api.boats.createBoat, boatArgs({ title: "B", status: "sold" }));
    const sold = await t.query(api.boats.listBoats, {
      paginationOpts: { numItems: 10, cursor: null },
      status: "sold",
    });
    expect(sold.page).toHaveLength(1);
    expect(sold.page[0].status).toBe("sold");
  });

  test("listFeaturedBoats returns only featured + available boats", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    await t.mutation(api.boats.createBoat, boatArgs({ title: "Feat", featured: true }));
    await t.mutation(
      api.boats.createBoat,
      boatArgs({ title: "FeatSold", featured: true, status: "sold" }),
    );
    await t.mutation(api.boats.createBoat, boatArgs({ title: "Plain", featured: false }));
    const featured = await t.query(api.boats.listFeaturedBoats, {});
    expect(featured).toHaveLength(1);
    expect(featured[0].title).toBe("Feat");
  });
});

describe("boats — delete", () => {
  test("deleteBoat removes the boat and its gallery images", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(ADMIN);
    const id = await asAdmin.mutation(api.boats.createBoat, boatArgs());

    // Seed a gallery image referencing the boat, then delete the boat.
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["img"]));
      await ctx.db.insert("boatImages", {
        boatId: id,
        storageId,
        order: 0,
        isPrimary: true,
      });
    });

    await asAdmin.mutation(api.boats.deleteBoat, { id });

    const gone = await t.query(api.boats.getBoatBySlug, { slug: "baja-280-outlaw" });
    expect(gone).toBeNull();
    const orphans = await t.run(async (ctx) =>
      ctx.db
        .query("boatImages")
        .withIndex("by_boat", (q) => q.eq("boatId", id))
        .collect(),
    );
    expect(orphans).toHaveLength(0);
  });
});
