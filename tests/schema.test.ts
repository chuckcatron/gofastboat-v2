import { describe, expect, it } from "vitest";
import schema from "@/convex/schema";

describe("convex schema", () => {
  it("defines the inventory tables", () => {
    expect(Object.keys(schema.tables).sort()).toEqual([
      "boatImages",
      "boats",
      "pageContent",
      "products",
    ]);
  });
});
