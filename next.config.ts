import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Hovedrepoets rot — inneholder både worktree-koden (under .claude/worktrees/)
    // OG node_modules som worktreen symlinker til.
    root: "/Users/adrianhpettersen/Downloads/Fosen Tools Apper/Fosen Tools Analytics",
  },
  // Remotion-render (video-bygger) kjører @remotion/bundler + renderer
  // server-side. De skal IKKE bundles av Next — de starter sin egen
  // webpack + headless Chrome ved kjøretid.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
};

export default nextConfig;
