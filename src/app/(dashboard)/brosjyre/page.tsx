"use client";

import dynamic from "next/dynamic";
import "@/components/brosjyre/editor.css";

// Editoren bruker DOM-API-er (FileReader, window.print, drag&drop) og skal ikke SSR-rendres
const BrochureEditor = dynamic(
  () => import("@/components/brosjyre/editor").then((m) => m.BrochureEditor),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center text-gray-400">Laster brosjyre-editor...</div> }
);

export default function BrosjyrePage() {
  // Fullscreen overlay som dekker dashbord-layout. position: fixed → ignorerer parent overflow.
  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        // Hindre at body scroller mens editoren er aktiv
        overflow: "hidden",
      }}
    >
      <BrochureEditor />
    </div>
  );
}
