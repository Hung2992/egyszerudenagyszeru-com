import LegalLayout from "@/components/legal/LegalLayout";
import { H2, P, UL, Strong, Box } from "@/components/legal/LegalProse";
import { useLegalInfo, isLegalInfoComplete } from "@/hooks/useLegalInfo";

const PLACEHOLDER_RE = /\[.*PÓTLANDÓ.*\]/;

const Field = ({ value }: { value: string }) => {
  if (!value || PLACEHOLDER_RE.test(value)) {
    return <span className="text-destructive font-bold">{value || "—"}</span>;
  }
  return <>{value}</>;
};

const Impresszum = () => {
  const L = useLegalInfo();
  const complete = isLegalInfoComplete(L);

  return (
    <LegalLayout
      slug="impresszum"
      title="Impresszum"
      subtitle="A 2001. évi CVIII. törvény (Ekertv.) 4. §-a szerinti kötelező adatok."
      effectiveDate={L.effectiveDate}
    >
      {!complete && L._ready && (
        <Box variant="warn">
          <Strong>Figyelem:</Strong> A piros mezők még nincsenek kitöltve. Az
          egyéni vállalkozói regisztráció (NAV Webes Ügysegéd) után az
          adminisztrációs felület → <em>Jogi Központ → Cégadatok</em>
          szekcióban add meg a valós adatokat. Élesítés előtt minden mezőnek
          ki kell lennie töltve.
        </Box>
      )}

      <H2>A szolgáltató</H2>
      <UL>
        <li><Strong>Név:</Strong> <Field value={L.ownerName} /></li>
        <li><Strong>Jogi forma:</Strong> {L.legalForm}</li>
        <li><Strong>Székhely:</Strong> <Field value={L.registeredOffice} /></li>
        <li><Strong>Levelezési cím:</Strong> <Field value={L.mailingAddress} /></li>
        <li><Strong>Adószám:</Strong> <Field value={L.taxId} /></li>
        <li><Strong>Nyilvántartási szám:</Strong> <Field value={L.registryNumber} /></li>
        <li><Strong>Adózási státusz:</Strong> <Field value={L.vatStatus} /></li>
      </UL>

      <H2>Elérhetőségek</H2>
      <UL>
        <li><Strong>E-mail:</Strong> <Field value={L.email} /></li>
        <li><Strong>Jogi ügyek:</Strong> <Field value={L.legalEmail} /></li>
        <li><Strong>Adatvédelem:</Strong> <Field value={L.privacyEmail} /></li>
        <li><Strong>Telefon:</Strong> <Field value={L.phone} /></li>
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
        <li><Strong>Bank:</Strong> <Field value={L.bankName} /></li>
        <li><Strong>Számlaszám:</Strong> <Field value={L.bankAccount} /></li>
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
};

export default Impresszum;
