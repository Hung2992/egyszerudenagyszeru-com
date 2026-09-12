import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/untyped-client";
import { storeBaseUrl } from "@/lib/storefrontSeo";
import { getPartnerSlugFromHostname, resolveCustomDomainSlug } from "@/lib/partner-subdomain";
import { ArrowLeft } from "lucide-react";

// Kötelező bolti információs oldalak: /b/:slug/info/:infoSlug
export const INFO_PAGES = [
  { slug: "merettablazat", title: "Mérettáblázat" },
  { slug: "szallitas-visszakuldes", title: "Szállítás & Visszaküldés" },
  { slug: "kapcsolat", title: "Kapcsolat" },
  { slug: "aszf", title: "ÁSZF" },
] as const;

type Method = {
  id: string; name: string; description: string | null; method_type: string;
  fee_huf: number; free_over_huf: number | null; requires_address: boolean; is_active: boolean;
};

const huf = (n: number) => `${(n || 0).toLocaleString("hu-HU")} Ft`;

const BrandInfoPage = () => {
  const params = useParams<{ slug: string; infoSlug: string }>();
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(params.slug || getPartnerSlugFromHostname());
  const [sf, setSf] = useState<any>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const def = INFO_PAGES.find(p => p.slug === params.infoSlug);

  useEffect(() => {
    if (resolvedSlug) return;
    (async () => {
      const s = await resolveCustomDomainSlug();
      if (s) setResolvedSlug(s); else setNotFound(true);
    })();
  }, [resolvedSlug]);

  useEffect(() => {
    if (!resolvedSlug || !def) return;
    let alive = true;
    (async () => {
      const { data: store } = await supabase.from("partner_storefronts").select("*").eq("slug", resolvedSlug).eq("is_published", true).maybeSingle();
      if (!alive) return;
      if (!store) { setNotFound(true); setLoading(false); return; }
      setSf(store);
      const [m, p] = await Promise.all([
        supabase.from("partner_shipping_methods").select("*").eq("partner_id", store.partner_id).eq("is_active", true).order("sort_order"),
        supabase.from("partner_products").select("sizes,attributes").eq("partner_id", store.partner_id).eq("status", "active"),
      ]);
      if (!alive) return;
      setMethods((m.data as Method[]) || []);
      const set = new Set<string>();
      ((p.data as any[]) || []).forEach(row => {
        const list = Array.isArray(row?.sizes) ? row.sizes : Array.isArray(row?.attributes?.sizes) ? row.attributes.sizes : [];
        list.forEach((s: any) => {
          const label = typeof s === "string" ? s : s?.size || s?.label || s?.name;
          if (label) set.add(String(label));
        });
      });
      setSizes(Array.from(set));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [resolvedSlug, def]);

  const description = useMemo(() => {
    if (!sf || !def) return "";
    switch (def.slug) {
      case "merettablazat": return `Mérettáblázat és méretválasztási segítség a ${sf.display_name} webáruházban.`;
      case "szallitas-visszakuldes": return `Szállítási módok, díjak és visszaküldési feltételek – ${sf.display_name}.`;
      case "kapcsolat": return `Lépj kapcsolatba a ${sf.display_name} csapatával: elérhetőségek és ügyfélszolgálat.`;
      default: return `A ${sf.display_name} webáruház általános szerződési feltételei: rendelés, fizetés, szállítás, elállás.`;
    }
  }, [sf, def]);

  if (!def) return <Navigate to={params.slug ? `/b/${params.slug}` : "/"} replace />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white text-xs uppercase tracking-widest">Betöltés…</div>;
  if (notFound || !sf) return <Navigate to="/" replace />;

  const bg = sf.bg_color || "#0a0a0a";
  const text = sf.text_color || "#ffffff";
  const accent = sf.accent_color || "#D4AF37";
  const backUrl = params.slug ? `/b/${params.slug}` : "/";
  const url = `${storeBaseUrl(sf)}/info/${def.slug}`;
  const seller = sf.company_legal_name || sf.display_name;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-3">
      <h2 className="text-xl font-bold uppercase tracking-wide" style={{ fontFamily: sf.font_heading || "Space Grotesk, sans-serif" }}>{title}</h2>
      <div className="space-y-2 leading-relaxed opacity-90">{children}</div>
    </section>
  );

  const shippingList = methods.length ? (
    <div className="border divide-y" style={{ borderColor: `${text}22` }}>
      {methods.map(m => (
        <div key={m.id} className="flex items-center justify-between gap-4 p-3" style={{ borderColor: `${text}22` }}>
          <div>
            <div className="font-semibold">{m.name}</div>
            <div className="text-xs opacity-70">{m.description || (m.requires_address ? "Szállítási cím megadása szükséges" : "Cím nélkül is választható")}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-bold">{m.fee_huf > 0 ? huf(m.fee_huf) : "Ingyenes"}</div>
            {m.free_over_huf ? <div className="text-xs opacity-70">Ingyenes {huf(m.free_over_huf)} felett</div> : null}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p>Jelenleg nincs publikált szállítási mód. A pontos szállítási lehetőségekről a Kapcsolat oldalon tudsz érdeklődni.</p>
  );

  return (
    <div className="min-h-screen" style={{ background: bg, color: text, fontFamily: sf.font_body || "Inter, sans-serif" }}>
      <Helmet>
        <title>{`${def.title} | ${sf.display_name}`.slice(0, 60)}</title>
        <meta name="description" content={description.slice(0, 160)} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${def.title} | ${sf.display_name}`} />
        <meta property="og:description" content={description.slice(0, 160)} />
        <meta property="og:url" content={url} />
      </Helmet>

      <header className="border-b" style={{ borderColor: `${text}22` }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={backUrl} className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" /> {sf.display_name}
          </Link>
          <Link to={backUrl} className="text-xs uppercase tracking-widest px-3 py-2 border" style={{ borderColor: accent, color: accent }}>Webshop</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight" style={{ fontFamily: sf.font_heading || "Space Grotesk, sans-serif" }}>{def.title}</h1>

        {def.slug === "merettablazat" && (
          <>
            <Section title="Elérhető méretek">
              {sizes.length ? (
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => <span key={s} className="border px-3 py-1 text-sm" style={{ borderColor: `${text}33` }}>{s}</span>)}
                </div>
              ) : (
                <p>A boltban jelenleg nincsenek méretválasztós termékek. A konkrét termékek méret- és paraméteradatai a termékoldalon szerepelnek.</p>
              )}
            </Section>
            <Section title="Hogyan mérj?">
              <ul className="list-disc pl-6 space-y-1">
                <li>Mellbőség: a mellkas legszélesebb pontján, vízszintesen körbemérve.</li>
                <li>Derékbőség: a derék legkeskenyebb részén, lazán.</li>
                <li>Csípőbőség: a csípő legszélesebb pontján.</li>
                <li>Belső szárhossz: a lábfejtől a lépésvonalig.</li>
                <li>Talphossz: a sarok és a leghosszabb lábujj közti távolság, centiméterben.</li>
              </ul>
              <p>Tipp: mérj olyan ruhadarabot, amely jól áll rajtad, és hasonlítsd össze a termékoldalon megadott adatokkal.</p>
            </Section>
            <Section title="Bizonytalan vagy?">
              <p>Írj nekünk a <Link to={`${backUrl}/info/kapcsolat`} className="underline">Kapcsolat</Link> oldalon megadott elérhetőségen, és segítünk a méretválasztásban. Ha mégsem jó a méret, a <Link to={`${backUrl}/info/szallitas-visszakuldes`} className="underline">Szállítás &amp; Visszaküldés</Link> oldalon találod a csere menetét.</p>
            </Section>
          </>
        )}

        {def.slug === "szallitas-visszakuldes" && (
          <>
            <Section title="Szállítási módok és díjak">{shippingList}</Section>
            <Section title="Feldolgozás és átfutás">
              <p>A megrendelést a visszaigazolás után dolgozzuk fel. A csomag feladásáról és a várható érkezésről e-mailben értesítünk. A pontos átfutási időt a választott szállítási mód határozza meg.</p>
            </Section>
            <Section title="Elállás és visszaküldés">
              <p>Fogyasztóként a csomag átvételétől számított <strong>14 napon belül</strong> indokolás nélkül elállhatsz a vásárlástól (45/2014. (II. 26.) Korm. rendelet). Az elállási szándékot írásban jelezd a Kapcsolat oldalon megadott elérhetőségen.</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>A terméket sértetlen, hiánytalan állapotban kérjük vissza, lehetőleg eredeti csomagolásban.</li>
                <li>A visszaküldés költsége a vásárlót terheli, kivéve hibás vagy téves teljesítés esetén.</li>
                <li>A vételárat az áru visszaérkezését követően, legkésőbb 14 napon belül visszatérítjük.</li>
                <li>Az elállási jog nem érvényes egyedi igény szerint készített, gyorsan romló, illetve lezárt csomagolású higiéniai termékekre, valamint már megkezdett digitális tartalomra.</li>
              </ul>
            </Section>
            <Section title="Hibás termék, szavatosság">
              <p>Hibás teljesítés esetén kellékszavatossági, illetve — fogyasztói szerződés esetén — termékszavatossági igényt érvényesíthetsz a Ptk. szabályai szerint. A hibát az észlelés után haladéktalanul jelezd.</p>
            </Section>
          </>
        )}

        {def.slug === "kapcsolat" && (
          <>
            <Section title="Elérhetőségek">
              <ul className="space-y-1">
                <li><strong>Eladó:</strong> {seller}</li>
                {sf.company_email ? <li><strong>E-mail:</strong> <a className="underline" href={`mailto:${sf.company_email}`}>{sf.company_email}</a></li> : null}
                {sf.company_phone ? <li><strong>Telefon:</strong> <a className="underline" href={`tel:${String(sf.company_phone).replace(/\s/g, "")}`}>{sf.company_phone}</a></li> : null}
                {sf.company_address ? <li><strong>Cím:</strong> {sf.company_address}</li> : null}
                {sf.company_tax_id ? <li><strong>Adószám:</strong> {sf.company_tax_id}</li> : null}
                {sf.company_registration_number ? <li><strong>Nyilvántartási szám:</strong> {sf.company_registration_number}</li> : null}
              </ul>
              {!sf.company_email && !sf.company_phone && (
                <p className="opacity-80">A bolt még nem adott meg nyilvános elérhetőséget. Rendeléssel kapcsolatban a visszaigazoló e-mailre válaszolva tudsz üzenni.</p>
              )}
            </Section>
            <Section title="Ügyfélszolgálat">
              <p>Rendeléssel, szállítással vagy visszaküldéssel kapcsolatos kérdés esetén írj e-mailt, és munkanapokon igyekszünk 1–2 munkanapon belül válaszolni. Kérjük, add meg a rendelési azonosítót, így gyorsabban tudunk segíteni.</p>
            </Section>
            <Section title="Hasznos oldalak">
              <ul className="list-disc pl-6 space-y-1">
                <li><Link className="underline" to={`${backUrl}/info/szallitas-visszakuldes`}>Szállítás &amp; Visszaküldés</Link></li>
                <li><Link className="underline" to={`${backUrl}/info/merettablazat`}>Mérettáblázat</Link></li>
                <li><Link className="underline" to={`${backUrl}/info/aszf`}>ÁSZF</Link></li>
              </ul>
            </Section>
          </>
        )}

        {def.slug === "aszf" && (
          <>
            <Section title="1. Az eladó adatai">
              <ul className="space-y-1">
                <li><strong>Eladó:</strong> {seller}</li>
                {sf.company_address ? <li><strong>Székhely:</strong> {sf.company_address}</li> : null}
                {sf.company_tax_id ? <li><strong>Adószám:</strong> {sf.company_tax_id}</li> : null}
                {sf.company_registration_number ? <li><strong>Nyilvántartási szám:</strong> {sf.company_registration_number}</li> : null}
                {sf.company_email ? <li><strong>E-mail:</strong> {sf.company_email}</li> : null}
                {sf.company_phone ? <li><strong>Telefon:</strong> {sf.company_phone}</li> : null}
              </ul>
              {(!sf.company_address || !sf.company_tax_id) && (
                <p className="opacity-80 text-sm">A hiányzó cégadatokat a bolt üzemeltetője a Partner Központban tudja kitölteni, és itt automatikusan megjelennek.</p>
              )}
            </Section>
            <Section title="2. A szerződés tárgya, megrendelés">
              <p>A webáruházban leadott megrendeléssel a vásárló és az eladó között elektronikus úton megkötött, magyar nyelvű, írásba nem foglalt szerződés jön létre. A termékek lényeges tulajdonságai és bruttó árai a termékoldalakon szerepelnek. A megrendelést e-mailes visszaigazolás követi.</p>
            </Section>
            <Section title="3. Árak és fizetés">
              <p>Az árak forintban értendők és tartalmazzák a jogszabály szerinti áfát, de nem tartalmazzák a szállítási díjat. A választható fizetési módokat a pénztár oldalon mutatjuk meg; a fizetendő végösszeg a szállítási díjjal együtt a megrendelés összegzésében jelenik meg.</p>
            </Section>
            <Section title="4. Szállítás">
              {shippingList}
            </Section>
            <Section title="5. Elállás, szavatosság">
              <p>A fogyasztót az átvételtől számított 14 napos indokolás nélküli elállási jog illeti meg a 45/2014. (II. 26.) Korm. rendelet szerint. A részletes feltételeket a <Link className="underline" to={`${backUrl}/info/szallitas-visszakuldes`}>Szállítás &amp; Visszaküldés</Link> oldal tartalmazza. Hibás teljesítés esetén a Ptk. szerinti kellék- és termékszavatossági jogok érvényesíthetők.</p>
            </Section>
            <Section title="6. Adatkezelés">
              <p>A megrendelés teljesítéséhez szükséges személyes adatokat az eladó a GDPR és az Infotv. szabályai szerint kezeli, kizárólag a szerződés teljesítése, számlázás és kapcsolattartás céljából.</p>
            </Section>
            <Section title="7. Panaszkezelés, jogorvoslat">
              <p>Panaszt a Kapcsolat oldalon megadott elérhetőségen lehet bejelenteni. Vita esetén a fogyasztó a lakóhelye szerint illetékes békéltető testülethez, illetve a fogyasztóvédelmi hatósághoz fordulhat. Az online vitarendezési platform elérhető az Európai Bizottság oldalán.</p>
            </Section>
            <Section title="8. Egyéb rendelkezések">
              <p>A jelen feltételekben nem szabályozott kérdésekben a magyar jog az irányadó. Az eladó fenntartja a feltételek módosításának jogát; a már leadott megrendelésekre a leadáskor hatályos feltételek vonatkoznak.</p>
            </Section>
          </>
        )}
      </main>

      <footer className="border-t mt-8" style={{ borderColor: `${text}22` }}>
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs opacity-70">
          <span>© {new Date().getFullYear()} {sf.display_name}</span>
          <div className="flex flex-wrap gap-4">
            {INFO_PAGES.filter(p => p.slug !== def.slug).map(p => (
              <Link key={p.slug} to={`${backUrl}/info/${p.slug}`} className="underline">{p.title}</Link>
            ))}
            <Link to={backUrl} className="underline">Webshop</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BrandInfoPage;
