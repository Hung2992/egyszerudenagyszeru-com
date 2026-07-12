# Fejlesztési Terv - 8 Kiválasztott Modul

Nagy scope. Reálisan több hét munka. Fázisokra bontva, hogy minden fázis után használható legyen a rendszer.

## FÁZIS 1 - Most azonnal (ebben a menetben)
Kis-közepes komplexitású, gyorsan élesíthető funkciók.

**1.1 AI Shopping Assistant** 🤖
- Új `AiShoppingAssistant.tsx` komponens (floating chat widget minden vásárló oldalon)
- Új edge function: `shopping-assistant` - természetes nyelvű termékkeresés
- Lovable AI (google/gemini-3-flash-preview) + tool calling: `search_products`, `filter_by_price`, `get_recommendations`
- Termék kártyák a chatben (nem csak szöveg)

**1.2 Intelligens Kosár** 🛍️
- `CartDrawer.tsx` bővítése: "Gyakran együtt vásárolt" szekció
- Új edge function: `smart-cart-suggestions` - AI ajánlások a kosár tartalma alapján
- Bundle kedvezmény logika (2+ termék = X% kedvezmény)
- Táblák: `product_bundles`, `frequently_bought_together`

**1.3 Gamification** 🎁
- Táblák: `user_gamification` (level, xp, streak_days), `user_badges`, `daily_quests`, `quest_completions`
- Új oldal: `/jutalmak` - napi bejelentkezés, küldetések, jelvények
- Profilba integráció: szint bar, XP, streak counter
- Hűségpont már van (`Loyalty.tsx`) - összekötés az új rendszerrel
- 15+ jelvény (első vásárlás, 5 értékelés, hűséges vásárló, stb.)

**1.4 AI Marketing Automation** 🧠
- `AdminMarketingTab.tsx` bővítése: "AI Kampány Generátor"
- Új edge function: `ai-marketing-auto` - vásárlói szegmentáció + auto kampány készítés
- Cron job: heti auto-szegmentáció (VIP, alvó, új, kockázatos)
- Auto kupon optimalizáció: rossz teljesítmény esetén kedvezmény növelése

## FÁZIS 2 - Következő menet
**2.1 Logisztika** 🚚 (GLS, Foxpost, MPL, Packeta, DPD)
- Minden szállítónál külön szerződés+API kulcs kell TŐLED
- Edge functions szállítónként: címke generálás, tracking
- Először a legfontosabbat kérdezem meg (melyikkel van szerződésed?)

**2.2 Nemzetközi értékesítés** 🌍
- `LocalePreferences.tsx` már megvan (nyelv/pénznem választó)
- Kell: teljes UI fordítás (i18n), régiós ÁFA szabályok, régiós árazás táblák
- Currency conversion API (fixer.io vagy hasonló)

## FÁZIS 3 - Utolsó menet
**3.1 Natív Mobilapp** 📱
- Capacitor setup (iOS + Android)
- Push notifications (Firebase Cloud Messaging vagy OneSignal connector)
- **FONTOS**: buildhez Mac + Xcode (iOS) és Android Studio kell a te oldaladon!
- Build config csak - a tényleges native build a te gépeden fut

**3.2 AI Virtuális Próba** 🎥
- Legkomplexebb feature. Cipőméret becslés fotó alapján (Gemini vision)
- Ruha overlay - komplex, valószínűleg 3rd party API kell (pl. AILabTools, custom model)
- AI stílustanácsadó - meglévő AI kiterjesztése

---

## Kérésem előtte

Mielőtt Fázis 1-et elkezdem, egy kérdés:
- **Van már meglévő shopping assistant chat?** Az `AdminAiAssistant.tsx` az admin panelnek szól. Új, publikus, vásárlóknak szóló asszisztenst kell építeni.
- **Gamification stílusa**: játékos/színes VAGY minimalista fekete-fehér+arany (a meglévő brand)?

## Ha jóváhagyod

Elkezdem a **Fázis 1-et most, egyben** (4 modul, ~15-20 fájl változás, 3-4 új tábla, 3 új edge function). Utána szólj hogy melyik fázisra megyünk tovább.

**Válaszolj**: 
- "Menjen a Fázis 1" → elkezdem
- "Kezdj csak X-szel" → csak azt csinálom
- "Módosítsd a tervet" → mondd mit
