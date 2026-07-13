// Sprint B.5 — Floating launcher az AI Fashion Stylist-hez
import { lazy, Suspense, useState } from "react";
import { Wand2 } from "lucide-react";
import { trackAiEvent } from "@/lib/ai-analytics";

const FashionStylist = lazy(() => import("./FashionStylist"));

export default function FashionStylistLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => { setOpen(true); trackAiEvent("assistant_open" as any, "fashion_stylist", {}); }}
        aria-label="AI Stylist"
        className="fixed bottom-4 right-4 z-40 bg-foreground text-background px-3 py-2 shadow-lg flex items-center gap-2 hover:opacity-90 text-xs uppercase tracking-wide font-bold border border-foreground"
      >
        <Wand2 className="h-4 w-4" />
        AI Stylist
      </button>
      {open && (
        <Suspense fallback={null}>
          <FashionStylist open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
