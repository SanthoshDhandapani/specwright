import path from "path";
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-highlight"],
  },
});

// Monorepo root — pnpm hoists `next` here, so Turbopack must scan from this
// path to resolve next/package.json. `outputFileTracingRoot` must match
// turbopack.root or Next.js refuses to build (silent auto-inference picks
// apps/web otherwise, which conflicts with the explicit turbopack.root).
const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default withMDX(nextConfig);
