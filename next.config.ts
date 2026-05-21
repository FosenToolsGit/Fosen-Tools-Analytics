import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Hovedrepoets rot — inneholder både worktree-koden (under .claude/worktrees/)
    // OG node_modules som worktreen symlinker til.
    root: "/Users/adrianhpettersen/Downloads/Fosen Tools Apper/Fosen Tools Analytics",
  },
};

export default nextConfig;
