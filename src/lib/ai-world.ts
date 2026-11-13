// AI VILÁG — digitális AI-munkaszervezet (Central AI → 20 terület × 10 specialista)
// AEGIS őrrel. Csak tervez: semmit nem hajt végre (EMPYREAN foundation read-only).
export type Risk = "green" | "yellow" | "red";
export type Department = { id: string; name: string; roles: string[]; keywords: string[]; risk: Risk };
export const departments: Department[] = [
{
"id": "01",
"name": "VEZETÉS",
"roles": [
"stratégiai vezető",
"operációs vezető",
"projektvezető",
"programvezető",
"folyamatvezető",
"döntéstámogató",
"kockázatkezelő",
"erőforrás-tervező",
"teljesítményelemző",
"vezetői asszisztens"
],
"keywords": [
"stratégi",
"vezet",
"döntés",
"prioritás"
],
"risk": "green"
},
{
"id": "02",
"name": "PROJEKTMENEDZSMENT",
"roles": [
"projekttervező",
"ütemező",
"feladatkoordinátor",
"határidőfigyelő",
"függőségkezelő",
"erőforrás-koordinátor",
"státuszriporter",
"kockázati koordinátor",
"meeting-koordinátor",
"projektadminisztrátor"
],
"keywords": [
"projekt",
"határidő",
"ütemez",
"feladat"
],
"risk": "green"
},
{
"id": "03",
"name": "SZOFTVERFEJLESZTÉS",
"roles": [
"frontend fejlesztő",
"backend fejlesztő",
"full-stack fejlesztő",
"API fejlesztő",
"adatbázis-fejlesztő",
"mobilfejlesztő",
"rendszertervező",
"kódreviewer",
"hibakereső",
"dokumentációs fejlesztő"
],
"keywords": [
"fejleszt",
"kód",
"oldal",
"app",
"funkció",
"hiba",
"bug"
],
"risk": "yellow"
},
{
"id": "04",
"name": "KIBERBIZTONSÁG",
"roles": [
"biztonsági elemző",
"sérülékenységvizsgáló",
"alkalmazásbiztonsági szakértő",
"hálózati biztonsági szakértő",
"identitáskezelő",
"naplóelemző",
"incidenskezelő",
"biztonsági auditor",
"megfelelőségi ellenőr",
"biztonsági dokumentátor"
],
"keywords": [
"biztonság",
"jelszó",
"támadás",
"sérülékeny",
"aegis",
"jogosultság"
],
"risk": "yellow"
},
{
"id": "05",
"name": "QA ÉS TESZTELÉS",
"roles": [
"funkcionális tesztelő",
"regressziós tesztelő",
"API-tesztelő",
"teljesítménytesztelő",
"kompatibilitási tesztelő",
"automatizált tesztelő",
"hibajegy-elemző",
"minőségellenőr",
"release-ellenőr",
"QA vezető"
],
"keywords": [
"teszt",
"qa",
"minőség",
"ellenőriz"
],
"risk": "green"
},
{
"id": "06",
"name": "DEVOPS / INFRASTRUKTÚRA",
"roles": [
"CI/CD specialista",
"deployment specialista",
"szerverkezelő",
"cloud specialista",
"konténerizációs specialista",
"monitoring specialista",
"backup specialista",
"infrastruktúra-tervező",
"rendelkezésreállási elemző",
"release manager"
],
"keywords": [
"deploy",
"szerver",
"mentés",
"backup",
"felhő",
"publikál"
],
"risk": "yellow"
},
{
"id": "07",
"name": "ADAT",
"roles": [
"adatelemző",
"adatbázis-adminisztrátor",
"adatmodellező",
"ETL specialista",
"adatminőség-ellenőr",
"dashboard-készítő",
"statisztikai elemző",
"adatvédelmi elemző",
"adatkutató",
"adatdokumentátor"
],
"keywords": [
"adat",
"riport",
"dashboard",
"statisztik",
"kpi"
],
"risk": "green"
},
{
"id": "08",
"name": "AI / MACHINE LEARNING",
"roles": [
"AI-kutató",
"prompt engineer",
"modellelemző",
"RAG-specialista",
"agent-fejlesztő",
"modelltesztelő",
"AI-evaluátor",
"AI-biztonsági szakértő",
"AI-integrációs fejlesztő",
"AI-kutatási asszisztens"
],
"keywords": [
"ai",
"modell",
"prompt",
"agent",
"ügynök"
],
"risk": "green"
},
{
"id": "09",
"name": "KUTATÁS",
"roles": [
"webkutató",
"szakirodalom-kutató",
"piackutató",
"versenytárselemző",
"trendkutató",
"forrásellenőr",
"tényellenőr",
"adatgyűjtő",
"kutatási koordinátor",
"kutatási jelentéskészítő"
],
"keywords": [
"kutat",
"piac",
"versenytárs",
"trend"
],
"risk": "green"
},
{
"id": "10",
"name": "MARKETING",
"roles": [
"marketingstratéga",
"kampánymenedzser",
"tartalomstratéga",
"közösségimédia-kezelő",
"e-mail marketinges",
"hirdetési elemző",
"SEO-szakértő",
"márkaelemző",
"konverzióoptimalizáló",
"marketingriporter"
],
"keywords": [
"marketing",
"kampány",
"seo",
"hirdetés",
"hírlevél",
"konverzió"
],
"risk": "yellow"
},
{
"id": "11",
"name": "ÉRTÉKESÍTÉS",
"roles": [
"értékesítési stratégiai AI",
"leadkutató",
"leadminősítő",
"ajánlatkészítő",
"ügyfél-előkészítő",
"CRM-kezelő",
"értékesítési elemző",
"utánkövető",
"sales-adminisztrátor",
"sales-vezető"
],
"keywords": [
"értékesít",
"eladás",
"lead",
"ajánlat",
"crm"
],
"risk": "yellow"
},
{
"id": "12",
"name": "ÜGYFÉLSZOLGÁLAT",
"roles": [
"elsővonalbeli ügyintéző",
"technikai ügyintéző",
"panaszkezelő",
"visszajelzés-elemző",
"ügyfélmegtartó",
"tudásbázis-kezelő",
"FAQ-specialista",
"ügyfélelégedettség-elemző",
"eszkalációs koordinátor",
"ügyfélszolgálati vezető"
],
"keywords": [
"ügyfél",
"panasz",
"support",
"visszajelzés"
],
"risk": "green"
},
{
"id": "13",
"name": "PÉNZÜGY",
"roles": [
"pénzügyi elemző",
"költségtervező",
"cash-flow elemző",
"számlaelemző",
"költségellenőr",
"pénzügyi riportkészítő",
"előrejelző",
"pénzügyi adminisztrátor",
"audit-előkészítő",
"pénzügyi vezető"
],
"keywords": [
"pénzügy",
"költség",
"bevétel",
"profit",
"cash",
"kredit"
],
"risk": "red"
},
{
"id": "14",
"name": "SZÁMVITEL",
"roles": [
"könyvelési előkészítő",
"számlafeldolgozó",
"költségelszámoló",
"bevételi elemző",
"kiadási elemző",
"egyeztető",
"bizonylatellenőr",
"könyvelési riportkészítő",
"audit-asszisztens",
"számviteli koordinátor"
],
"keywords": [
"számla",
"könyvel",
"bizonylat"
],
"risk": "red"
},
{
"id": "15",
"name": "JOG / COMPLIANCE",
"roles": [
"szerződés-elemző",
"jogi kutató",
"megfelelőségi elemző",
"adatvédelmi ellenőr",
"szabályzat-ellenőr",
"jogi dokumentáló",
"kockázatelemző",
"jogi adminisztrátor",
"változásfigyelő",
"compliance vezető"
],
"keywords": [
"jogi",
"szerződés",
"gdpr",
"adatvédelem",
"ászf",
"compliance"
],
"risk": "red"
},
{
"id": "16",
"name": "HR",
"roles": [
"toborzó",
"önéletrajz-elemző",
"jelöltértékelő",
"onboarding-koordinátor",
"képzésszervező",
"teljesítményelemző",
"munkafolyamat-elemző",
"HR-adminisztrátor",
"munkatársi visszajelzés-elemző",
"HR-vezető"
],
"keywords": [
"toboroz",
"hr",
"munkatárs",
"onboarding",
"partner"
],
"risk": "yellow"
},
{
"id": "17",
"name": "BESZERZÉS",
"roles": [
"beszállítókereső",
"ajánlatbekérő",
"ár-összehasonlító",
"beszállítóértékelő",
"szerződés-előkészítő",
"rendeléskövető",
"költségelemző",
"beszállítói kockázatelemző",
"beszerzési adminisztrátor",
"procurement manager"
],
"keywords": [
"beszerz",
"beszállító",
"ár-összehason"
],
"risk": "yellow"
},
{
"id": "18",
"name": "LOGISZTIKA",
"roles": [
"rendeléskövető",
"készletelemző",
"szállításszervező",
"útvonaltervező",
"raktárkoordinátor",
"szállítóértékelő",
"késésfigyelő",
"készlet-előrejelző",
"logisztikai adminisztrátor",
"logisztikai vezető"
],
"keywords": [
"szállítás",
"készlet",
"raktár",
"rendelés",
"késés",
"visszaküld"
],
"risk": "yellow"
},
{
"id": "19",
"name": "GYÁRTÁS",
"roles": [
"termeléstervező",
"folyamatellenőr",
"készletelemző",
"minőségellenőr",
"karbantartási tervező",
"kapacitástervező",
"hibaanalizáló",
"munkafolyamat-optimalizáló",
"termelési riportkészítő",
"gyártásvezető"
],
"keywords": [
"gyártás",
"termelés",
"kapacitás"
],
"risk": "green"
},
{
"id": "20",
"name": "MÉRNÖKSÉG",
"roles": [
"rendszertervező",
"gépészeti elemző",
"villamos elemző",
"konstrukciós elemző",
"szimulációs szakértő",
"műszaki dokumentáló",
"hibaanalizáló",
"követelménykezelő",
"műszaki tesztelő",
"műszaki projektvezető"
],
"keywords": [
"műszaki",
"mérnök",
"szimuláció"
],
"risk": "green"
}
];

export type AegisFinding = { code: string; label: string; severity: "block" | "warn" };
const RULES: { code: string; label: string; severity: "block" | "warn"; re: RegExp }[] = [
  { code: "prompt_injection", label: "Utasítás-felülírási kísérlet", severity: "block", re: /(ignore|hagyd figyelmen kívül|felejtsd el).{0,40}(instruction|utasítás|szabály)|system prompt|jailbreak|szűrők nélkül|korlátok nélkül/i },
  { code: "credential", label: "Titok / jelszó / kulcs kérése", severity: "block", re: /(service[_ ]?role|api[_ -]?kulcs|api[_ -]?key|jelszav|password|token|secret|\.env|titkos kulcs)/i },
  { code: "privilege", label: "Jogosultság-emelés", severity: "block", re: /(adj|tegyél|legyen).{0,30}(admin|szuperadmin|super admin)|rls.{0,20}(kikapcs|töröl|disable)|bypass/i },
  { code: "card_data", label: "Teljes kártyaadat", severity: "block", re: /\b(?:\d[ -]?){13,19}\b|cvv|cvc/i },
  { code: "ssrf", label: "Belső hálózati cím", severity: "block", re: /(localhost|127\.0\.0\.1|169\.254\.|metadata\.google|10\.\d+\.\d+\.\d+)/i },
  { code: "mass_change", label: "Tömeges / visszafordíthatatlan művelet", severity: "warn", re: /(mind(en|et)|összes).{0,30}(töröl|felülír|átír)|drop table|truncate/i },
  { code: "money", label: "Pénzmozgás", severity: "warn", re: /(utal|visszatérít|kifizet|refund|ár(at|ak) (módosít|átír|emel|csökkent))/i },
];

export function aegisScan(text: string): AegisFinding[] {
  return RULES.filter((r) => r.re.test(text)).map(({ code, label, severity }) => ({ code, label, severity }));
}

const order: Record<Risk, number> = { green: 0, yellow: 1, red: 2 };
export type Assignment = { department: Department; score: number; owner: string; reviewer: string };
export type WorkPlan = {
  goal: string; blocked: boolean; findings: AegisFinding[]; risk: Risk;
  assignments: Assignment[]; needsHuman: boolean; approval: string;
};

export function planGoal(goal: string, max = 4): WorkPlan {
  const text = goal.toLowerCase().trim();
  const findings = aegisScan(goal);
  const blocked = findings.some((f) => f.severity === "block");
  const scored = departments
    .map((d) => ({ d, score: d.keywords.filter((k) => text.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id))
    .slice(0, max);
  const list = blocked ? [] : scored.length ? scored : text ? [{ d: departments[0], score: 0 }] : [];
  const assignments = list.map(({ d, score }) => ({ department: d, score, owner: d.roles[0], reviewer: d.roles[d.roles.length - 1] }));
  // QA mindig független ellenőr, ha van végrehajtandó munka
  const qa = departments.find((d) => d.id === "05")!;
  if (assignments.length && !assignments.some((a) => a.department.id === "05"))
    assignments.push({ department: qa, score: 0, owner: qa.roles[8], reviewer: qa.roles[9] });
  let risk: Risk = assignments.reduce<Risk>((r, a) => (order[a.department.risk] > order[r] ? a.department.risk : r), "green");
  if (findings.some((f) => f.code === "money")) risk = "red";
  else if (findings.some((f) => f.severity === "warn") && risk === "green") risk = "yellow";
  if (blocked) risk = "red";
  const needsHuman = risk !== "green";
  const approval = blocked ? "AEGIS blokkolta — nem indítható"
    : risk === "red" ? "Kötelező emberi döntés (jogi/pénzügyi)"
    : risk === "yellow" ? "Jóváhagyás után indítható"
    : "Elemzés — automatikusan futhat";
  return { goal, blocked, findings, risk, assignments, needsHuman, approval };
}

export const totals = { departments: departments.length, specialists: departments.reduce((n, d) => n + d.roles.length, 0) };
