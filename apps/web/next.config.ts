import path from "path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-highlight"],
  },
});

// Turbopack must scan from the monorepo root to find `next` (pnpm hoists
// it there). DO NOT set `outputFileTracingRoot` — when both are set Next 16
// requires them to match, and pointing tracing at the monorepo causes
// Vercel `--prebuilt` deploy to look for .next at apps/web/apps/web/
// (path duplication). Letting Next auto-infer the tracing root keeps Vercel
// happy while turbopack.root keeps the build resolving correctly.
const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default withMDX(nextConfig);
