import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Convex stores uploaded photos as blobs served from the deployment's
    // `<deployment>.convex.cloud` domain (via `ctx.storage.getUrl()`). Allow
    // that host so `next/image` can render listing/product photos. The
    // `.convex.site` domain is for HTTP actions and is not used for images.
    remotePatterns: [{ protocol: "https", hostname: "*.convex.cloud" }],
  },
};

export default nextConfig;
