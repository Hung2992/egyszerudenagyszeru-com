/** Turns raw provider/AEGIS publication errors into a Hungarian explanation with the next step. */
export function socialErrorHint(platform: string, error: string | null | undefined): string | null {
  if (!error) return null;
  const e = error.toLowerCase();
  if (e.includes("publication_permission_required"))
    return "Nincs éles publikálási engedélyed. Add meg a Jóváhagyások oldal tetején vagy az „Engedélyek és napló” fülön.";
  if (platform === "facebook" && (e.includes("pages_manage_posts") || e.includes("publish_actions")))
    return "A Facebook-kapcsolatnak nincs joga az oldaladra posztolni (oldalbejegyzések kezelése). Ezt a posztot másold ki, és tedd ki kézzel a Facebook-oldaladra.";
  if (platform === "tiktok" && (e.includes("scope_not_authorized") || e.includes("requires a video")))
    return e.includes("requires a video")
      ? "TikTokra csak videós poszt tehető ki. Csatolj videót."
      : "A TikTok-kapcsolatnak nincs posztolási joga. Töltsd le a videót, és töltsd fel kézzel a szöveggel együtt.";
  if (platform === "linkedin" && e.includes("media requires"))
    return "LinkedInre a rendszer csak szöveges posztot tud kitenni. A képet/videót kézzel csatold.";
  if (e.includes("target not configured") || e.includes("target changed"))
    return "A célfiók nincs beállítva, vagy megváltozott. Ellenőrizd a kapcsolatot a „Kapcsolatok” részben.";
  if (e.includes("manual reconciliation"))
    return "Nem biztos, hogy kiment. Nézd meg a platformon, mielőtt újra próbálod — a rendszer nem küldi újra magától.";
  return "A platform visszautasította a közzétételt. Az eredeti hibaüzenet lent látható.";
}
