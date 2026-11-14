# Partner webshop 2026

## AI Marketing Command OS — egységes tervezés
- [ ] Közzététel nélküli teljes tesztfolyamat; külön test/live publikálási engedély; pontos tartalom, időpont és végrehajtó naplója, hitelesített ellenőrzéssel.
- [x] A hét új marketingterv összevonása, meglévő kód kapcsolódási pontjainak ellenőrzése, AEGIS-források visszaolvasása és kapukhoz kötött megvalósítási terv elkészítése; megvalósítás külön jóváhagyás után.
- [x] 1. szakasz alapjai: közös AEGIS kapu, pontos review-hashhez kötött 72 órás approval, service-only atomikus claim/preflight/receipt, csak-hozzáírható audit, bizonytalan eredménynél nincs újraküldés; 38 teszt és hitelesített jóváhagyás nélküli tiltási próba sikeres. Teszttervezetek visszavonva, napló megőrizve.
- [ ] 1. szakasz teljes biztonsági minősítése — élő párhuzamos claim/lejárat/stop próbák és szolgáltatói befejezés-visszaolvasás még szükséges; addig további automatizálás nem indul.
- [ ] 1. szakasz külső sikerbizonyítéka — kijelölt tesztfiók és külön publikálási engedély szükséges; a további szakaszok az első kapu után indulnak.

## Social AI külön oldal
- [x] Külön adminoldal a feltöltött social tervhez: meglévő tartalomstúdiók, valós közös sor, elemzések, Marketing és AEGIS hivatkozások; további tervrészek külön jelölve.

## EMPYREAN ∞ — BLACK CROWN

- [x] Forráskódbeli admin-, AI-, adat- és jogosultsági rétegek feltérképezése; nem ellenőrzött éles működés külön jelölve.
- [x] Teljes technikai terv: COMMAND / MISSIONS / CONTROL, közös szerződések, ügynökök, API-k, jogosultságok, audit és fejlesztési kapuk.
- [x] Felhasználó által szerkesztett EMPYREAN terv jóváhagyva.
- [x] FOUNDATION: arculati tokenek, adminba bekötött COMMAND / MISSIONS / CONTROL alapnézet, közös jóváhagyási és bizonyítékszerződések.
- [x] FOUNDATION éles séma, RLS, biztonsági és hitelesített adminellenőrzés: `empyrean_*` táblák, admin-RLS, szerveroldali vészleállítás, csak-hozzáírható audit napló.
- [x] Első teljes termék-SEO javaslat → approval → kontrollált mentés → audit → független ellenőrzés → rollback folyamat: élesben igazolva (PROPOSED → APPROVED → EXECUTING → VERIFIED → ROLLED_BACK, sha256 bizonylattal).
- [x] Partner média tároló publikus olvasása csak a valóban megjelenített képekre: anon kulccsal ellenőrizve.
- [x] BUSINESS INTELLIGENCE: egységes pénzügyi definíciók, admin-only szerveroldali üzleti pillanatkép, időszak-összehasonlítás, COMMAND dashboard.
- [x] CONTROLLED AUTOMATION (1. kör): szerveroldali SEO-felderítő ügynök, javaslat csak jóváhagyási láncon.
- [x] PREDICTIVE (1. kör): run-rate előrejelzés, adat nélkül nem becsül.
- [x] ENTERPRISE SECURITY (1. kör): AEGIS élő biztonsági állapot a CONTROL nézetben.
- [x] CONTINUOUS OPTIMIZATION (1. kör): AI-költség, cache, költségcsúcs, ügynök-értékelés, AI-visszajelzés, kézbesítés, fizetés, csalás, készlet, javaslatmotor, szimulátor (csak olvasás).
- [x] MODEL COMMAND (1. kör): AI-keret kimerülése külön jelölve, nem rontja az ügynök-pontszámot; riasztó javaslat.
- [ ] MODEL COMMAND (2. kör): tényleges AI-költség és tokenhasználat rögzítése minden hívásnál, költségkeret.

- [x] Egységes prémium mobil- és asztali kezdőoldal
- [x] Dinamikus partner branding, hero, kategóriák és termékblokkok
- [x] Keresés, kedvencek és gyors kosárba helyezés
- [x] Bizalmi elemek, hírlevél és többoszlopos lábléc
- [x] Prémium termékoldal és pénztár megjelenés
- [ ] Mega menu, összetett szűrés és önálló kategóriaoldalak
- [ ] Kuponmotor, mini cart és partnerenkénti online fizetési szolgáltató
- [ ] Értékelési és személyre szabott ajánlómotor
- [ ] AI által rendezhető komponensalapú oldalépítő további blokkokkal
- [ ] Teljes, valódi vásárlási lánc külső fizetési és kézbesítési bizonyítékkal

## Blokkolók

- Az online fizetéshez aktív partneri fizetési kapcsolat szükséges.
- A teljes éles rendelési teszthez valódi fizetés és külső kézbesítés szükséges.
## Rendszeraudit (2026-11-14)
- [x] Harmadik kör: 5 szerverfunkció mezőhibája javítva, 5 veszélyes adatbázisművelet lezárva; 37 admin beállítólap + ~35 további hiányzó mező, hiányzó értékelési tárhely, fizetési kliensbeállítás és webhook feltárva (v3).
- [x] Negyedik kör: 13 súlyos találat javítva és támadás-szimulációval ellenőrizve; 2 nem induló funkció javítva; dupla hibás ütemezés törölve (v4).
- [ ] Értékelési képek tárhelye — blokkoló: a munkatér tiltja a nyilvános tárhelyet (felhasználói beállítás).
- [ ] Partner SMS/hírlevél címzett-ellenőrzés — blokkoló: termékdöntés (dupla megerősítés, korlát).
- [x] Ötödik kör: 37 admin beállítólap 76 hiányzó mezője pótolva (mentés élesben igazolva); 14 táblázat-export képletvédelem; e-mail címek kitakarása a naplókban; jelszó-visszaállítás és fizetés visszatérési cím rögzítve; csevegő-utasítás felülírás tiltva; keresőszűrő-trükkök, hanghívás-injekció, belső hálózati SMS-végpontok, sorsolás és szerepkör-lekérdezés lezárva; napi korlátok a fizetős nyilvános AI-ra és vendégrendelésre.
- [x] Részletes második kör: hat hitelesített belső oldal; 32 hiányzó táblahivatkozás, egy hiányzó RPC; kedvencek 404 reprodukálva; rendelési küldődomain eltérés; 21/21 készlépés naplója egyezik. Részletes v2 jelentés átadva, nem ellenőrzött folyamatok külön jelölve.
- [x] Gyors biztonsági ellenőrzés, függőségi vizsgálat, kulcsnevek összevetése, hiányzó üzleti adatok ellenőrzése, 280 teszt és négy nyilvános oldal indulásának ellenőrzése; részletes hibajegyzék átadva.
- [x] Mély biztonsági vizsgálat lefutott (v3 jelentés).
- [ ] Külső szolgáltatások teljes működési próbája — blokkoló: hiányzó szolgáltatói kapcsolatok és valódi fizetési/kézbesítési bizonyítékok.
## Új kérések (2026-11-13)
- [x] Munkatársi teljesítmény: kész lépések, teljesítési arány és részesedés az összes kész lépésből; 24 teszt sikeres.
- [x] Új Webshop AI-tervjavaslat mentése és ellenőrzése a HUMAN GATE, dashboard és státusz nézeteken; 5 lépés, jóváhagyásra vár.
- [ ] Valódi munkatársak és e-mail értesítések — blokkoló: még nincsenek munkatársak/címzettek; a küldődomain infrastruktúrája már beállítva.
- [x] Összekapcsolt AI-munkatársak: közös fontos adatok, címzett átadások, élő tervkapcsolat; admin átadás + címzetti AI-válasz és mobil nézet ellenőrizve. Megjelölt ellenőrző adat a naplóban megőrizve.
- [x] AI-költségkeret a CONTROL panelen + előzetes figyelmeztetés (admin értesítés, leállítás a keretnél)
- [x] AI-hívás rögzítés: segédek + közös AI útvonal (8 funkció). [x] Maradék 39 közvetlen hívó funkció bekötése (közös mérő, élesben igazolva)
- [x] 30 napos összesítés: 231 hívás, 2,60 kredit, 247 109 token
- [ ] Befolyt bevétel: blokkolva — nincs fizetett partnerrendelés (5 függő, szeptemberi)
- [x] Szállítás/visszaküldés mutatók az Üzleti intelligenciában (díj, feladásra vár, úton, átvéve, visszaküldés, átl. kézbesítés)
- [x] Visszaküldés-kezelő a CONTROL panelen (kérés → jóváhagyás → visszatérítés), visszatérítés levonva a befolyt bevételből
- [ ] Szállítási dátumok az 5 függő rendelésre — valós feladási adat kell a felhasználótól
- [x] AI kredit számlázási ár beállítható, havi költség pénzben
- [ ] Tényleges kredit ár megadása — a felhasználótól vár
- [ ] TikTok-posztolás — BLOKKOLVA: a TikTok-kapcsolat nem ad posztolási engedélyt (video.publish nem kérhető)
