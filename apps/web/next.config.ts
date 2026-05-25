import path from "path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-highlight"],
  },
});

// Pin turbopack.root to this workspace (apps/web) so it matches the
// outputFileTracingRoot that `vercel build` auto-sets — otherwise Next 16.2.4
// emits "Both ... must have the same value" and silently falls back to the
// Vercel-injected value, which conflicts with our config and breaks the
// build.
//
// For Turbopack to find `next/package.json` from apps/web with this scope,
// the package must be a REAL file (not a pnpm symlink to .pnpm/). That's
// arranged by apps/web/.npmrc (node-linker=hoisted) which installs packages
// directly under apps/web/node_modules/.
const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default withMDX(nextConfig);
