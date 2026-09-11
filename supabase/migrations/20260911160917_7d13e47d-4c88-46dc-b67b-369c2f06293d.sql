CREATE OR REPLACE FUNCTION public.generate_partner_contract_on_kyc_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_number text;
  v_address text;
  v_body text;
  v_owner public.owner_company_profile%ROWTYPE;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    IF EXISTS (SELECT 1 FROM public.partner_contracts WHERE kyc_submission_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_owner FROM public.owner_company_profile WHERE is_current = true LIMIT 1;
    IF v_owner.id IS NULL THEN
      RAISE EXCEPTION 'No current owner_company_profile configured';
    END IF;

    v_contract_number := 'EDN-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(NEW.id::text,'-',''),1,6));
    v_address := concat_ws(', ',
      concat_ws(' ', NEW.address_zip, NEW.address_city),
      NEW.address_street, NEW.address_country);

    v_body := format($body$PARTNERI EGYÜTTMŰKÖDÉSI SZERZŐDÉS

Szerződésszám: %s
Kelt: %s
Szerződésverzió: v2.1
Cégadatok verzió: v%s

I. SZERZŐDŐ FELEK

Üzemeltető:
  %s
  Képviselő: %s
  Adószám: %s
  Közösségi adószám: %s
  Adóazonosító jel (egyéni vállalkozó / magánszemély esetén): %s
  Székhely: %s

Partner:
  Név: %s
  Születési név: %s
  Születési hely, idő: %s, %s
  Anyja neve: %s
  Lakcím / székhely: %s
  Személyi igazolvány szám: %s
  Adóazonosító jel / adószám: %s
  E-mail: %s
  Telefon: %s

A Partner a szerződéskötéskor nyilatkozik arról, hogy magánszemélyként, egyéni vállalkozóként vagy gazdasági társaság képviseletében jár el. Magánszemély esetén adóazonosító jel, vállalkozás esetén adószám (és képviselő) az irányadó adat; a másik mező ilyenkor nem alkalmazandó.

II. FOGALOMMEGHATÁROZÁSOK
1. Platform: az Üzemeltető zárt forráskódú, több-bérlős (multi-tenant) APEX üzleti szoftverrendszere.
2. Partner Példány (tenant): a Partner számára elkülönített, saját adatokkal működő felület.
3. Bruttó bevétel: a Partner Példányán keresztül leadott, a vevő által ténylegesen kifizetett és a Partner által teljesített megrendelések végösszege, ÁFÁ-val együtt.
4. Elszámolási alap: a bruttó bevétel, az alábbi tételekkel csökkentve:
   a) a vevőnek visszatérített összegek (elállás, garancia, jóváírás);
   b) a sztornózott, meghiúsult vagy nem teljesített megrendelések összege;
   c) a sikeres chargeback (bankkártyás visszaterhelés) összege;
   d) a vevőre továbbhárított, ténylegesen felmerült szállítási díj;
   e) a be nem folyt (kifizetetlen) megrendelések összege.
   Részfizetés esetén kizárólag a ténylegesen befolyt és teljesítéssel fedezett rész számít bele. Ha a visszatérítés/chargeback egy már elszámolt időszakot érint, azt a következő elszámolási időszakban jóváírásként kell figyelembe venni.
5. Elszámolási időszak: naptári hónap. Az elszámolás a tárgyhót követő hónap 10. napjáig készül el, a fizetési határidő a számla kiállításától számított 8 naptári nap.
6. Éves göngyölítés: a sávos részesedés számítása naptári évenként újrainduló, göngyölített elszámolási alapon történik.

III. A SZERZŐDÉS TÁRGYA
Üzemeltető a Platformon elkülönített bérlői felületet biztosít a Partner részére. A Platform egyetlen rendszerben egyesíti a weboldal-, webshop-, ügyfél- (CRM), naptár-, marketing-, kommunikációs-, pénzügyi-, logisztikai- és mesterséges intelligencia-modulokat, asztali és mobil eszközön egyaránt.

IV. A BIZTOSÍTOTT SZOFTVERÖSSZETEVŐK
A Partner a szerződés hatálya alatt az alábbi modulokhoz kap hozzáférést:
  1. Weboldal- és márkaoldal-motor: saját domain, landing oldalak, blog, SEO metaadatok, mobil megjelenés, verziókezelés és egykattintásos visszaállítás.
  2. Webshop és termékkezelés: fizikai, digitális, oktatási/kurzus és szolgáltatás típusú termékek; variánsok, méretek, színek, készlet, licenckulcsok, letöltések, árazási szabályok, kosárelhagyás-kezelés.
  3. Ügyfélkapcsolat-kezelés (CRM): érdeklődők, vásárlók, foglalások, előzmények, címkék, csoportok, napi teendők.
  4. Naptár és online foglalás: idősávok, automatikus visszaigazolás, emlékeztetők, napi ügyféllista.
  5. Marketing- és kampányközpont: szegmentált kampányok, hírlevelek, QR-kódok, UTM-linkek, A/B tesztelés, automatikus tölcsérek.
  6. AI munkatársak: szöveg, kép, videó, kód, termékleírás, SEO tartalom, hirdetésszöveg, oldal- és webshop-generálás.
  7. APEX kommunikációs platform: e-mail, SMS, WhatsApp, hanghívás, AI hang, CPaaS motor DLR-ekkel, opt-outtal, routinggal, újraküldéssel.
  8. Vezetői és pénzügyi központ: rendelések, bevétel, részesedés, KPI, audit napló, kifizetések, visszatérítések.
  9. Biztonság és tenant isolation: row-level security (RLS), szerepkör-alapú hozzáférés, változásnaplózás, rollback.

V. HASZNÁLATI KERETEK ÉS KORLÁTOK
1. A modulok használata a mindenkori Használati Keretek (Fair Use, 1. sz. melléklet) szerinti, számszerűen meghatározott keretek között nem keletkeztet a partneri részesedésen felüli elszámolási tételt. A keretek kiterjednek különösen a tárhelyre, sávszélességre, e-mail-, SMS-, WhatsApp- és hanghívás-darabszámra, AI-generálások számára, API-hívásokra és háttérfolyamatokra.
2. A mindenkori keretek a Partner Központban folyamatosan, számszerűen megtekinthetők, a tárgyidőszaki felhasználással együtt. Az Üzemeltető a kereteket a Partner előzetes, legalább 30 napos értesítése mellett módosíthatja.
3. A kereten felüli felhasználás külön elszámolású tétel, amely nem a partneri részesedés része; erről az Üzemeltető előzetesen, tételesen tájékoztat, és a Partner kifejezett jóváhagyása nélkül automatikus terhelés nem történik.
4. Harmadik felek költségei és díjai (pl. távközlési szolgáltató, fizetési szolgáltató, domain-regisztrátor) nem részei a partneri részesedésnek, azokat a Partner viseli.

VI. PARTNERI RÉSZESEDÉSI MODELL ÉS ELSZÁMOLÁS
1. A Partner az együttműködés keretében a biztosított eszközöket, rendszereket és szolgáltatásokat használhatja, amelyek révén saját tevékenységét és bevételtermelő működését folytathatja. Az együttműködés ellenértéke nem fix szolgáltatási vagy használati díj, hanem kizárólag partneri részesedési modell alapján kerül meghatározásra: az Üzemeltető a Partner által elért, elszámolási alapot képező bevételből részesedik. Ahol jelen szerződés vagy annak melléklete bármely helyen díjat, ellenértéket vagy fizetendő összeget említ az Üzemeltető javára, azon a jelen VI. pont szerinti partneri részesedést kell érteni. A részesedési rendszer célja, hogy a Partner számára az együttműködés induló szakaszában, alacsonyabb forgalom mellett is kiszámítható és fenntartható feltételeket biztosítson, miközben magasabb bevétel esetén a partneri részesedés előre meghatározott és átlátható módon alakul.
2. A Partner az Üzemeltető részére a II.4. pont szerinti elszámolási alap után partneri részesedést teljesít, az alábbiak szerint:
   a) 1 000 000 Ft elszámolási alapig: 5 százalék partneri részesedés (legfeljebb 50 000 Ft);
   b) 1 000 000 Ft feletti elszámolási alap esetén: az első 1 000 000 Ft után 50 000 Ft partneri részesedés, ezt követően minden megkezdett további 1 000 000 Ft után további 10 000 Ft fix összegű (nem százalékos) partneri részesedés.
3. A számítás képlete: ha az elszámolási alap (A) legfeljebb 1 000 000 Ft, a részesedés = A x 5 százalék. Ha A nagyobb, mint 1 000 000 Ft, a részesedés = 50 000 Ft + FELFELÉ KEREKÍTVE((A - 1 000 000) / 1 000 000) x 10 000 Ft. A "megkezdett millió" azt jelenti, hogy az 1 000 000 Ft feletti rész minden megkezdett (nem feltétlenül teljes) egymillió forintja után jár a 10 000 Ft.
4. Számítási példák (éves göngyölített elszámolási alapra):
   • 400 000 Ft → 400 000 x 5 százalék = 20 000 Ft;
   • 1 000 000 Ft → 1 000 000 x 5 százalék = 50 000 Ft (a sáv felső határa, még nem indul új millió);
   • 1 000 001 Ft → 50 000 Ft + 10 000 Ft (1. megkezdett millió) = 60 000 Ft;
   • 1 200 000 Ft → 50 000 Ft + 10 000 Ft = 60 000 Ft;
   • 1 999 999 Ft → 50 000 Ft + 10 000 Ft = 60 000 Ft;
   • 2 000 000 Ft → 50 000 Ft + 10 000 Ft = 60 000 Ft (a 2 000 000 Ft még az 1. megkezdett millió utolsó forintja);
   • 2 000 001 Ft → 50 000 Ft + 20 000 Ft = 70 000 Ft (itt indul a 2. megkezdett millió);
   • 5 000 000 Ft → 50 000 Ft + 40 000 Ft = 90 000 Ft;
   • 10 000 000 Ft → 50 000 Ft + 90 000 Ft = 140 000 Ft.
5. A felek rögzítik, hogy az 1 000 000 Ft és 1 000 001 Ft közötti 10 000 Ft-os, illetve a 2 000 000 Ft és 2 000 001 Ft közötti további 10 000 Ft-os lépcső a felek tudatos, kifejezetten elfogadott megállapodása; a küszöbnél jelentkező ugrás nem minősül aránytalanságnak, mert felfelé korlátos (millióként legfeljebb 10 000 Ft) és a részesedés az elszámolási alap 5 százalékát összességében soha nem haladja meg.
6. A b) pont szerinti 10 000 Ft rögzített, forintban meghatározott összeg, nem százalékos részesedés.
7. A részesedés összege nettó összeg; az Üzemeltető a mindenkori jogszabályok szerinti ÁFÁ-t felszámítja.
8. Az Üzemeltető a részesedést jogosult a Partner részére fizetendő kifizetésből levonni, vagy külön számlázni. Minden elszámolásról tételes, letölthető kimutatás készül a Partner Központban.
9. A Partner az elszámolást annak közlésétől számított 15 napon belül írásban kifogásolhatja; a kifogásolt tételt a felek 15 napon belül egyeztetik.

VII. A FELEK KÖTELEZETTSÉGEI
1. A Partner kijelenti, hogy a KYC során megadott adatai valósak, és azok változását 8 napon belül bejelenti.
2. A Partner betartja a hatályos jogszabályokat (Ptk., GDPR, Pmt. 2017. évi LIII. tv., fogyasztóvédelmi és e-kereskedelmi szabályok), és felel az általa értékesített termékekért, szolgáltatásokért, azok jogszerűségéért, valamint az általa közzétett tartalomért.
3. Az Üzemeltető biztosítja a Platform és a partneri admin felület működését, karbantartását és fejlesztését.
4. A Partner a hozzáférési adatait bizalmasan kezeli, és felel a saját felhasználói fiókjaiban végzett tevékenységért.

VIII. SZELLEMI TULAJDON, ADATOK ÉS TARTALOM
1. A Platform, annak forráskódja, architektúrája és minden összetevője az Üzemeltető kizárólagos szellemi tulajdona. A Partner nem kizárólagos, nem átruházható, a szerződés időtartamára szóló felhasználási jogot kap.
2. A Partner ügyféladatai, rendelési adatai, termék- és tartalomadatai a Partnert illetik. A szerződés megszűnése esetén a Partner ezeket géppel olvasható (CSV/JSON) formátumban exportálhatja.
3. A Partner által feltöltött szövegek, képek, videók és márkajelzések a Partner tulajdonában maradnak; a Partner az Üzemeltetőnek a szolgáltatás nyújtásához szükséges mértékű felhasználási jogot ad.
4. AI által generált tartalom (szöveg, kép, videó, hang, termékleírás, oldalstruktúra, kód):
   a) A Partner utasítására, a Partner Példányán generált tartalmon a Partner időben és területileg korlátlan, kizárólagosságot nem biztosító, ingyenes, a szerződés megszűnése után is fennmaradó, harmadik félre átruházható és allicencbe adható felhasználási jogot szerez. A Partner a tartalmat szabadon felhasználhatja, módosíthatja, átdolgozhatja, más művekbe építheti, üzleti és reklámcélra újrahasznosíthatja, bármely csatornán közzéteheti, ideértve a jelen Platformon kívüli felhasználást is.
   b) Az Üzemeltető a generált tartalmat kizárólag a szolgáltatás nyújtásához, tárolásához, megjelenítéséhez és biztonsági mentéséhez használja. Az Üzemeltető a Partner azonosítható tartalmát referenciaként vagy marketingcélra csak a Partner előzetes, írásbeli hozzájárulásával használhatja fel.
   c) Az Üzemeltető a Partner tartalmát AI-modell tanítására nem használja, kivéve, ha a Partner ehhez a Partner Központban kifejezetten hozzájárul; a hozzájárulás bármikor, jövőre nézve visszavonható.
   d) A Partner tudomásul veszi, hogy a generatív tartalom szerzői jogi védelme a hatályos jog szerint korlátozott lehet, ezért az Üzemeltető nem szavatolja a tartalom egyediségét, kizárólagosságát, sem azt, hogy az harmadik fél jogát nem sérti. A publikálás előtti ellenőrzés és a tartalomért való felelősség a Partnert terheli.
   e) A generált tartalmat a Partner a szerződés megszűnésekor is exportálhatja a IX/XI. pont szerint; a megszűnés a már megszerzett felhasználási jogot nem szünteti meg.
5. Domain: a Partner saját nevén regisztrált domainje a Partneré. Ha a domaint az Üzemeltető regisztrálja a Partner javára, a szerződés megszűnésekor – a felmerült költségek megtérítése mellett – azt a Partnerre átruházza.

IX. ADATVÉDELEM (GDPR)
1. A KYC- és szerződéses adatok tekintetében az Üzemeltető önálló adatkezelő (jogalap: szerződés teljesítése és jogi kötelezettség, Pmt.).
2. A Partner Példányán kezelt vevői és érdeklődői adatok tekintetében a Partner az adatkezelő, az Üzemeltető pedig adatfeldolgozó. Az Üzemeltető ezen adatokat kizárólag a Partner írásbeli utasítása és jelen szerződés szerint kezeli.
3. A felek a GDPR 28. cikke szerinti adatfeldolgozói feltételeket a 2. sz. mellékletben (DPA) rögzítik, amely jelen szerződés elválaszthatatlan része. Az igénybe vett további adatfeldolgozók listáját az Üzemeltető közzéteszi, és változásukról előzetesen értesít.
4. Adatvédelmi incidens esetén az Üzemeltető a tudomásszerzéstől számított 48 órán belül tájékoztatja a Partnert.
5. A KYC adatok kezelésére a KYC Adatkezelési Tájékoztató is irányadó.

X. RENDELKEZÉSRE ÁLLÁS ÉS FELELŐSSÉG
1. Az Üzemeltető éves szinten 99,5 százalékos rendelkezésre állásra törekszik, az előre bejelentett karbantartások idejét ide nem számítva.
2. Az Üzemeltető naponta biztonsági mentést készít, és 30 napos visszaállítási időablakot tart fenn.
3. Az Üzemeltető felelőssége a neki felróható károkra korlátozódik; a felelősség felső határa a káreseményt megelőző 12 hónapban a Partner által ténylegesen teljesített partneri részesedés összege. E korlátozás nem terjed ki a szándékosan vagy súlyos gondatlansággal, illetve emberi életet, testi épséget vagy egészséget károsítva okozott károkra.
4. Az Üzemeltető nem felel elmaradt haszonért, közvetett károkért, valamint harmadik fél szolgáltatásának (távközlési, fizetési, tárhely-, AI-szolgáltató) kieséséért.
5. Az AI-modulok kimenete javaslat jellegű; annak üzleti, jogi vagy pénzügyi felhasználásáért a Partner felel.

XI. A SZERZŐDÉS IDŐTARTAMA ÉS MEGSZŰNÉSE
1. A szerződés határozatlan időre jön létre.
2. Rendes felmondás: bármelyik fél indokolás nélkül, írásban, 30 napos felmondási idővel felmondhatja.
3. Azonnali hatályú felmondás súlyos szerződésszegés esetén, így különösen: jogszabálysértő vagy tiltott termék értékesítése, valótlan KYC-adat, a Platform biztonságának veszélyeztetése, 30 napot meghaladó fizetési késedelem, vagy a Platform jogosulatlan másolása. Az azonnali felmondást megelőzően – ha a jogsértés orvosolható – a másik fél 8 napos írásbeli felszólítást kap.
4. A megszűnés napján a Partner Példánya inaktiválásra kerül, de az adatok exportját az Üzemeltető további 30 napig biztosítja; ezt követően – a jogszabályi megőrzési kötelezettség (Pmt., Számv. tv.) alá eső adatok kivételével – az adatok véglegesen törlésre kerülnek.
5. Megszűnés esetén a felek a megszűnés napjáig keletkezett elszámolási alap alapján 30 napon belül végelszámolnak. A megszűnés után befolyó, de korábban teljesített megrendelések bevétele is az elszámolás része.

XII. AZ ALÁÍRÁS MÓDJA
1. A szerződés a felek elektronikus úton tett, jelen felületen rögzített aláírásával jön létre. Az aláírás az eIDAS rendelet szerinti egyszerű elektronikus aláírásnak minősül.
2. Az Üzemeltető az aláírás tényét, időpontját, az aláíró nevét, IP-címét és a dokumentum SHA-256 lenyomatát naplózza. A hash a dokumentum változatlanságának igazolására szolgál, önmagában nem minősül minősített elektronikus aláírásnak.
3. Az aláírt dokumentum a rendszerben zárolt, módosítást a rendszer nem tesz lehetővé; módosítás kizárólag közös, írásbeli szerződésmódosítással lehetséges.
4. A felek elfogadják, hogy jogvita esetén a naplóadatok és a hash bizonyítékként felhasználhatók.

XIII. VEGYES ÉS ZÁRÓ RENDELKEZÉSEK
1. A szerződés módosítása írásban érvényes. Az Üzemeltető a Platform általános feltételeit legalább 30 napos előzetes értesítéssel módosíthatja; ha a Partner a módosítást nem fogadja el, a hatálybalépésig rendkívüli felmondással élhet.
2. A felek üzleti titokként kezelik a másik fél tudomásukra jutott adatait.
3. A felek kapcsolattartása írásban, a szerződésben megadott e-mail címeken történik.
4. Ha a szerződés bármely rendelkezése érvénytelen, az a többi rendelkezés érvényességét nem érinti.
5. Alkalmazandó jog: a magyar jog, különösen a Ptk. A szerződésben nem szabályozott kérdésekben a magyar jogszabályok az irányadók.
6. Jogvita esetén a felek elsődlegesen egyeztetnek. Ennek eredménytelensége esetén a jogvita elbírálására a magyar bíróságok rendelkeznek joghatósággal, az általános hatásköri és illetékességi szabályok szerint.

MELLÉKLETEK

1. SZ. MELLÉKLET – HASZNÁLATI KERETEK (FAIR USE)
A keretek naptári hónapra, Partner Példányonként értendők, és a Partner Központban számlálóval követhetők.
  a) Tárhely: 25 GB (média, dokumentum, biztonsági mentés együtt).
  b) Sávszélesség / adatforgalom: 250 GB.
  c) Termékek száma: 10 000 tétel; oldalak/aloldalak: 500.
  d) Tranzakciós és marketing e-mail: 20 000 db.
  e) SMS: 1 000 db; WhatsApp-üzenet: 1 000 db; hanghívás: 300 perc.
  f) AI-szöveggenerálás: 2 000 kérés; AI-képgenerálás: 500 kép; AI-videó: 30 perc renderidő.
  g) API-hívás: 200 000 db/hó, legfeljebb 20 kérés/másodperc.
  h) Háttérfolyamatok (workflow-futás): 100 000 lépés.
  i) Adminisztrátori felhasználók: 10 fő.
A keret 80 százalékának elérésekor a rendszer automatikus értesítést küld. A kereten felüli felhasználás nem jár automatikus terheléssel: az Üzemeltető tételes ajánlatot ad, és a Partner kifejezett jóváhagyása szükséges. Jóváhagyás hiányában az érintett funkció a következő elszámolási időszak kezdetéig korlátozásra kerülhet, a Platform többi része üzemszerűen működik. Nem minősül rendeltetésszerű használatnak különösen: kéretlen tömeges üzenetküldés, mások nevében történő küldés, terheléses vagy automatizált visszaélésszerű hívássorozat, a Platform továbbértékesítése vagy harmadik fél kiszolgálása a Partner saját tevékenységén kívül.

2. SZ. MELLÉKLET – ADATFELDOLGOZÓI MEGÁLLAPODÁS (DPA)
1. Felek: adatkezelő a Partner, adatfeldolgozó az Üzemeltető, a Partner Példányán kezelt személyes adatok tekintetében (GDPR 28. cikk).
2. Az adatkezelés tárgya és célja: a Platform üzemeltetése, webshop-, CRM-, naptár-, marketing-, kommunikációs és AI-funkciók biztosítása a Partner utasítása szerint.
3. Az adatkezelés időtartama: a szerződés hatálya, valamint a megszűnést követő 30 napos exportidőszak.
4. Érintettek kategóriái: a Partner vevői, érdeklődői, hírlevél-feliratkozói, foglalást vagy időpontot kérő ügyfelei, a Partner munkatársai és adminisztrátorai.
5. Kezelt adatok kategóriái: név, e-mail-cím, telefonszám, szállítási és számlázási cím, rendelési és foglalási adatok, kommunikációs előzmények, kézbesítési státuszok, technikai naplóadatok (IP-cím, eszközadat), marketing-hozzájárulási állapot. Különleges adat kezelése nem cél; a Partner ilyet nem tölthet fel a rendszerbe erre vonatkozó külön írásbeli megállapodás nélkül. Fizetési kártyaadatot az Üzemeltető nem tárol, kizárólag a kártyabirtokos nevét és a kártyaszám utolsó négy számjegyét.
6. Al-adatfeldolgozók: tárhely- és adatbázis-szolgáltató, e-mail-küldő szolgáltató, távközlési/CPaaS-szolgáltató, fizetési szolgáltató, AI-szolgáltató. Aktuális listájuk a Partner Központban elérhető. Új al-adatfeldolgozó bevonásáról az Üzemeltető legalább 30 nappal előre értesít; a Partner ez idő alatt kifogást emelhet, és kifogás esetén rendkívüli felmondással élhet.
7. Biztonsági intézkedések: sorszintű hozzáférés-szabályozás (RLS) és bérlői elkülönítés, titkosított adattovábbítás (TLS) és titkosított tárolás, szerepköralapú jogosultságkezelés, naplózás és audit nyomvonal, napi biztonsági mentés 30 napos visszaállítási ablakkal, hozzáférés-felülvizsgálat.
8. Titoktartás: az adatokhoz kizárólag az Üzemeltető titoktartásra kötelezett munkatársai férhetnek hozzá, a feladatuk ellátásához szükséges mértékben.
9. Incidenskezelés: az Üzemeltető adatvédelmi incidens esetén a tudomásszerzéstől számított 48 órán belül tájékoztatja a Partnert az incidens jellegéről, az érintettek és adatok becsült köréről, a várható következményekről és a megtett intézkedésekről, és támogatja a Partner hatósági bejelentési kötelezettségének teljesítését.
10. Közreműködés: az Üzemeltető segíti a Partnert az érintetti kérelmek (hozzáférés, helyesbítés, törlés, hordozhatóság, tiltakozás) teljesítésében, valamint az adatvédelmi hatásvizsgálat és előzetes konzultáció során.
11. Törlés és visszaadás: a szerződés megszűnésekor a Partner az adatokat géppel olvasható (CSV/JSON) formátumban exportálhatja; az exportidőszak lejártát követően az Üzemeltető az adatokat törli, kivéve a jogszabályi megőrzési kötelezettség alá eső adatokat.
12. Ellenőrzés: a Partner évente egy alkalommal, előzetes, legalább 15 napos írásbeli értesítés mellett, az üzletmenet zavarása nélkül auditot kezdeményezhet, vagy elfogadhatja az Üzemeltető által rendelkezésre bocsátott biztonsági dokumentációt.
13. Adattovábbítás harmadik országba: alapesetben nem történik; ha elkerülhetetlen, kizárólag a GDPR V. fejezete szerinti megfelelő garanciák (pl. általános szerződési feltételek) mellett.

3. SZ. MELLÉKLET – KYC ADATKEZELÉSI TÁJÉKOZTATÓ
A KYC-eljárás során kezelt adatok körét, célját, jogalapját (szerződés teljesítése és jogi kötelezettség, Pmt.), megőrzési idejét és az érintetti jogokat a mindenkori KYC Adatkezelési Tájékoztató tartalmazza, amely a Partner Központban elérhető.$body$,
      v_contract_number, to_char(now(),'YYYY-MM-DD'), v_owner.version,
      v_owner.legal_name, v_owner.representative_name,
      v_owner.tax_number, coalesce(v_owner.eu_tax_number,'-'),
      coalesce(v_owner.tax_identification_number,'-'), v_owner.address,
      NEW.full_name, coalesce(NEW.birth_name,'-'),
      coalesce(NEW.birth_place,'-'), coalesce(NEW.birth_date::text,'-'),
      coalesce(NEW.mother_name,'-'), v_address,
      NEW.id_card_number, coalesce(NEW.tax_id,'-'),
      NEW.email, coalesce(NEW.phone,'-'));

    INSERT INTO public.partner_contracts (
      user_id, kyc_submission_id, contract_number, contract_version, contract_body,
      partner_full_name, partner_birth_name, partner_birth_place, partner_birth_date,
      partner_mother_name, partner_address, partner_id_card_number, partner_tax_id,
      partner_email, partner_phone,
      owner_name, owner_representative, owner_tax_number, owner_address,
      owner_profile_version, status
    ) VALUES (
      NEW.user_id, NEW.id, v_contract_number, 'v2.1', v_body,
      NEW.full_name, NEW.birth_name, NEW.birth_place, NEW.birth_date,
      NEW.mother_name, v_address, NEW.id_card_number, NEW.tax_id,
      NEW.email, NEW.phone,
      v_owner.legal_name, v_owner.representative_name, v_owner.tax_number, v_owner.address,
      v_owner.version, 'pending_partner_signature'
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_partner_contract_on_kyc_approval() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_partner_contract_on_kyc_approval() TO authenticated, service_role;