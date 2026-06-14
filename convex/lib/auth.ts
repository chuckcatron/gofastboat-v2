import type { UserIdentity } from "convex/server";
import type { QueryCtx } from "../_generated/server";

// Admin gating for inventory mutations (AB#1239).
//
// gofastboat has no users table or role claim yet. `proxy.ts` protects only the
// `/admin` route — it does NOT cover Convex endpoints — so every admin mutation
// must guard itself here. Baseline: a caller must be an authenticated Clerk
// identity. When `ADMIN_EMAILS` is configured (comma-separated), the caller's
// email must additionally be on the allowlist; when it is unset, any
// authenticated identity is accepted (intentional for the pre-launch phase).
export async function requireAdmin(ctx: QueryCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const allowlist = process.env.ADMIN_EMAILS;
  if (allowlist) {
    const allowed = allowlist
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const email = identity.email?.toLowerCase();
    if (!email || !allowed.includes(email)) {
      throw new Error("Not authorized");
    }
  }

  return identity;
}
