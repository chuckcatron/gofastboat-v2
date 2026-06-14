/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { subject: "admin|1", email: "dave@gofastboat.com" };

const productArgs = (overrides: Record<string, unknown> = {}) => ({
  title: "Bravo One Propeller",
  description: "A propeller.",
  ...overrides,
});

describe("products mutations — admin gating", () => {
  test("createProduct rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.products.createProduct, productArgs()),
    ).rejects.toThrow("Not authenticated");
  });

  test("updateProduct rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    const id = await t
      .withIdentity(ADMIN)
      .mutation(api.products.createProduct, productArgs());
    await expect(
      t.mutation(api.products.updateProduct, { id, title: "Hijacked" }),
    ).rejects.toThrow("Not authenticated");
  });

  test("deleteProduct rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    const id = await t
      .withIdentity(ADMIN)
      .mutation(api.products.createProduct, productArgs());
    await expect(
      t.mutation(api.products.deleteProduct, { id }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("products — slug generation", () => {
  test("auto-generates a slug and defaults images to an empty array", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    await t.mutation(api.products.createProduct, productArgs());
    const product = await t.query(api.products.getProductBySlug, {
      slug: "bravo-one-propeller",
    });
    expect(product?.title).toBe("Bravo One Propeller");
    expect(product?.images).toEqual([]);
  });

  test("appends a numeric suffix on slug collision", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    await t.mutation(api.products.createProduct, productArgs());
    await t.mutation(api.products.createProduct, productArgs());
    const second = await t.query(api.products.getProductBySlug, {
      slug: "bravo-one-propeller-2",
    });
    expect(second).not.toBeNull();
  });

  test("re-slugs on a title-changing update", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    const id = await t.mutation(api.products.createProduct, productArgs());
    await t.mutation(api.products.updateProduct, { id, title: "Stainless Prop" });
    const renamed = await t.query(api.products.getProductBySlug, {
      slug: "stainless-prop",
    });
    expect(renamed?._id).toBe(id);
  });
});

describe("products — queries", () => {
  test("getProductBySlug returns null on a miss", async () => {
    const t = convexTest(schema, modules);
    const product = await t.query(api.products.getProductBySlug, { slug: "nope" });
    expect(product).toBeNull();
  });

  test("listProducts paginates and reports correct page/isDone", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    for (let i = 0; i < 3; i++) {
      await t.mutation(
        api.products.createProduct,
        productArgs({ title: `Part ${i}` }),
      );
    }
    const first = await t.query(api.products.listProducts, {
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);

    const second = await t.query(api.products.listProducts, {
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(1);
    expect(second.isDone).toBe(true);
  });

  test("listProducts filters by status", async () => {
    const t = convexTest(schema, modules).withIdentity(ADMIN);
    await t.mutation(
      api.products.createProduct,
      productArgs({ title: "A", status: "available" }),
    );
    await t.mutation(
      api.products.createProduct,
      productArgs({ title: "B", status: "sold" }),
    );
    const sold = await t.query(api.products.listProducts, {
      paginationOpts: { numItems: 10, cursor: null },
      status: "sold",
    });
    expect(sold.page).toHaveLength(1);
    expect(sold.page[0].status).toBe("sold");
  });
});

describe("products — delete", () => {
  test("deleteProduct removes the product", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(ADMIN);
    const id = await asAdmin.mutation(api.products.createProduct, productArgs());
    await asAdmin.mutation(api.products.deleteProduct, { id });
    const gone = await t.query(api.products.getProductBySlug, {
      slug: "bravo-one-propeller",
    });
    expect(gone).toBeNull();
  });
});
