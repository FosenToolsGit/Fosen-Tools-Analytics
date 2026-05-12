import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pinne workspace root til denne worktreens rot (ikke hovedrepoet)
    // — unngår at Turbopack velger feil package-lock.json som root.
    root: path.resolve("./"),
  },
};

export default nextConfig;
