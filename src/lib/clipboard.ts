import { toast } from "@/hooks/use-toast";

/**
 * Vágólapra másolás megbízható hibakezeléssel és vizuális visszajelzéssel.
 * Visszatérési érték: true ha sikerült, false ha nem.
 */
export async function copyToClipboard(
  text: string,
  successMessage = "Másolva",
  description?: string
): Promise<boolean> {
  if (!text) {
    toast({ title: "Nincs másolható tartalom", variant: "destructive" });
    return false;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback nem-HTTPS / régi böngészőkre
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) throw new Error("execCommand copy failed");
    }
    toast({ title: successMessage, description: description ?? text });
    return true;
  } catch (e: any) {
    toast({
      title: "Másolás sikertelen",
      description: e?.message || "A böngésző nem engedte a vágólap használatát.",
      variant: "destructive",
    });
    return false;
  }
}
