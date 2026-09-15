import { describe, it, expect } from "vitest";
import {
  normalizeCampaignPlan,
  runCampaignQa,
  slugifyCampaign,
  campaignPageHtml,
  campaignNewsletterHtml,
  type CampaignPlanDraft,
} from "@/lib/campaign-plan";

const good: CampaignPlanDraft = {
  name: "Őszi alkatrész kampány",
  goal: "Növeljük az őszi fékbetét eladásokat",
  audience: "Budapesti autótulajdonosok, 30-50 év",
  message_headline: "Ősszel a fék a legfontosabb",
  message_body: "Ellenőrzött prémium fékbetétek raktárról, gyors kiszállítással minden népszerű típushoz.",
  newsletter_subject: "Ősszel a fék a legfontosabb",
  newsletter_body: "Kedves Vásárlónk! Az őszi szezonban a fékrendszer a legfontosabb biztonsági elem, ezért összeválogattuk a legjobb fékbetéteinket.",
  page_slug: "oszi-fek-kampany",
  page_headline: "Őszi fékbetét akció",
  page_subheadline: "Prémium minőség, raktárról",
  page_body: "Az összes fékbetétünk bevizsgált, gyári minőségű alkatrész, amelyet raktárról szállítunk ki egy munkanapon belül.",
  page_cta_text: "Megnézem",
};

describe("campaign-plan", () => {
  it("slugot képez ékezetes névből", () => {
    expect(slugifyCampaign("Őszi Fék Kampány!")).toBe("oszi-fek-kampany");
  });

  it("a jó terv publikálható, magas pontszámmal", () => {
    const qa = runCampaignQa(good);
    expect(qa.publishable).toBe(true);
    expect(qa.score).toBeGreaterThanOrEqual(90);
  });

  it("hiányzó kötelező mezőt kritikus hibaként jelez", () => {
    const qa = runCampaignQa({ ...good, newsletter_body: "" });
    expect(qa.publishable).toBe(false);
    expect(qa.issues.some((i) => i.field === "newsletter_body" && i.severity === "critical")).toBe(true);
  });

  it("helyőrző szöveget elutasít", () => {
    const qa = runCampaignQa({ ...good, page_body: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do." });
    expect(qa.publishable).toBe(false);
  });

  it("érvénytelen slugot kritikus hibaként jelez", () => {
    const qa = runCampaignQa({ ...good, page_slug: "Nem Jó Slug" });
    expect(qa.issues.some((i) => i.field === "page_slug" && i.severity === "critical")).toBe(true);
  });

  it("hosszú hírlevél-tárgyat figyelmeztetésként jelez", () => {
    const qa = runCampaignQa({ ...good, newsletter_subject: "Őszi fékbetét akció minden népszerű autótípushoz, raktárról azonnal" });
    expect(qa.publishable).toBe(true);
    expect(qa.issues.some((i) => i.field === "newsletter_subject" && i.severity === "warning")).toBe(true);
  });

  it("normalizálás HTML-t eltávolít és slugot generál", () => {
    const p = normalizeCampaignPlan({
      name: "<b>Téli</b> kampány",
      message_headline: "Címsor",
      page_slug: "Téli Kampány",
    });
    expect(p.name).toBe("Téli kampány");
    expect(p.page_slug).toBe("teli-kampany");
  });

  it("normalizálás vágja a túl hosszú mezőt", () => {
    const p = normalizeCampaignPlan({ ...good, page_cta_text: "Nagyon hosszú gombfelirat ami biztosan túl hosszú" });
    expect(p.page_cta_text.length).toBeLessThanOrEqual(30);
  });

  it("HTML generálás bekezdéseket készít és escapel", () => {
    const html = campaignPageHtml({ ...good, page_body: "Első <script> bekezdés\n\nMásodik bekezdés" });
    expect(html).toContain("<p>Első &lt;script&gt; bekezdés</p>");
    expect(html.match(/<p>/g)?.length).toBe(2);
  });

  it("hírlevél HTML tartalmazza a főcímet", () => {
    expect(campaignNewsletterHtml(good)).toContain("<h1>Ősszel a fék a legfontosabb</h1>");
  });
});
