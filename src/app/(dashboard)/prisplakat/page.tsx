"use client";

import dynamic from "next/dynamic";
import "@/components/brosjyre/editor.css";

const Editor = dynamic(
  () => import("@/components/prisplakat/editor").then((m) => m.PrisplakatEditor),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center text-gray-400">Laster prisplakat-editor...</div> }
);

export default function PrisplakatPage() {
  return (
    <div className="fixed inset-0 z-50" style={{ overflow: "hidden" }}>
      <Editor />
    </div>
  );
}
