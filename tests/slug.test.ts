import { describe, expect, it } from "vitest";
import { slugify } from "@/convex/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates a normal title", () => {
    expect(slugify("Baja 280 Outlaw")).toBe("baja-280-outlaw");
  });

  it("collapses runs of non-alphanumerics into a single hyphen", () => {
    expect(slugify("Sunseeker  ---  Predator!!!")).toBe("sunseeker-predator");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  *Cigarette* ")).toBe("cigarette");
  });

  it("decomposes accented characters", () => {
    expect(slugify("Café Racer")).toBe("cafe-racer");
  });

  it("falls back when the title has no usable characters", () => {
    expect(slugify("!!!")).toBe("item");
    expect(slugify("")).toBe("item");
  });

  it("honors a custom fallback", () => {
    expect(slugify("###", "boat")).toBe("boat");
  });
});
