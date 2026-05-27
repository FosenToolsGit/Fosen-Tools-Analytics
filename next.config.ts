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
  //
  // pdf-parse + pdfjs-dist har en intern worker (pdf.worker.mjs) som
  // Next.js bundler ikke får til å resolve i .next/dev/server/chunks/.
  // Eksternalisering tvinger Node til å bruke pakkene direkte fra
  // node_modules/ — da finner den worker-fila riktig.
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "pdf-parse",
    "pdfjs-dist",
  ],
};

export default nextConfig;
