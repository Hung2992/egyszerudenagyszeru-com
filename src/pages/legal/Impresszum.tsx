import LegalLayout from "@/components/legal/LegalLayout";
import { H2, P, UL, Strong } from "@/components/legal/LegalProse";
import { LEGAL_INFO as L } from "@/lib/legal-info";

const Impresszum = () => (
  <LegalLayout
    slug="impresszum"
    title="Impresszum"
    subtitle="A 2001. évi CVIII. törvény (Ekertv.) 4. §-a szerinti kötelező adatok."
    effectiveDate={L.effectiveDate}
  >
    <H2>A szolgáltató</H2>
    <UL>
      <li><Strong>Név:</Strong> {L.ownerName}</li>
      <li><Strong>Jogi forma:</Strong> {L.legalForm}</li>
      <li><Strong>Székhely:</Strong> {L.registeredOffice}</li>
      <li><Strong>Levelezési cím:</Strong> {L.mailingAddress}</li>
      <li><Strong>Adószám:</Strong> {L.taxId}</li>
      <li><Strong>Nyilvántartási szám:</Strong> {L.registryNumber}</li>
      <li><Strong>Adózási státusz:</Strong> {L.vatStatus}</li>
    </UL>

    <H2>Elérhetőségek</H2>
    <UL>
      <li><Strong>E-mail:</Strong> {L.email}</li>
      <li><Strong>Jogi ügyek:</Strong> {L.legalEmail}</li>
      <li><Strong>Adatvédelem:</Strong> {L.privacyEmail}</li>
      <li><Strong>Telefon:</Strong> {L.phone}</li>
      <li><Strong>Ügyfélszolgálat:</Strong> {L.customerHours}</li>
      <li><Strong>Weboldal:</Strong> {L.website}</li>
    </UL>

    <H2>Tárhelyszolgáltató</H2>
    <UL>
      <li><Strong>Név:</Strong> {L.hostingProvider}</li>
      <li><Strong>Cím:</Strong> {L.hostingAddress}</li>
      <li><Strong>E-mail:</Strong> {L.hostingEmail}</li>
    </UL>

    <H2>Felügyeleti szervek</H2>
    <UL>
      <li>{L.consumerAuthority} — {L.consumerAuthorityAddress}</li>
      <li>{L.dataAuthority} — {L.dataAuthorityAddress}</li>
      <li>{L.arbitrationBoard} — {L.arbitrationAddress}</li>
    </UL>

    <H2>Bankszámla</H2>
    <UL>
      <li><Strong>Bank:</Strong> {L.bankName}</li>
      <li><Strong>Számlaszám:</Strong> {L.bankAccount}</li>
    </UL>

    <P>
      A jelen impresszum a 2001. évi CVIII. tv. (Ekertv.) 4. §, a 2008. évi XLVIII. tv. (Reklámtv.) és a Ptk.
      vonatkozó rendelkezései alapján készült.
    </P>

    <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
      Verzió: {L.version} — Hatályos: {L.effectiveDate}
    </p>
  </LegalLayout>
);

export default Impresszum;
