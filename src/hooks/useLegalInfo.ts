import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { LEGAL_INFO } from "@/lib/legal-info";

/**
 * Élő jogi adatok az adatbázisból (store_settings) — ha valami nincs kitöltve,
 * a `LEGAL_INFO` defaultra esik vissza. Az impresszum / ÁSZF / Adatvédelem
 * oldalakon ezt használjuk, hogy az admin pultból azonnal frissíthető legyen
 * a hivatalos szöveg újraírása nélkül.
 */
export type LegalInfo = typeof LEGAL_INFO & { _ready: boolean };

type DbPayload = Partial<Record<
  | "ownerName" | "companyName" | "taxId" | "euVatNumber" | "registryNumber"
  | "vatStatus" | "registeredOffice" | "mailingAddress" | "email" | "legalEmail"
  | "privacyEmail" | "phone" | "customerHours" | "bankName" | "bankAccount",
  string | null
>>;

const isFilled = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

export function useLegalInfo(): LegalInfo {
  const [data, setData] = useState<LegalInfo>({ ...LEGAL_INFO, _ready: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rpcData, error } = await supabase.rpc("get_public_legal_info");
      if (cancelled) return;
      if (error || !rpcData) {
        setData({ ...LEGAL_INFO, _ready: true });
        return;
      }
      const db = rpcData as DbPayload;
      setData({
        ...LEGAL_INFO,
        ownerName:        isFilled(db.ownerName)        ? db.ownerName        : LEGAL_INFO.ownerName,
        taxId:            isFilled(db.taxId)            ? db.taxId            : LEGAL_INFO.taxId,
        registryNumber:   isFilled(db.registryNumber)   ? db.registryNumber   : LEGAL_INFO.registryNumber,
        registeredOffice: isFilled(db.registeredOffice) ? db.registeredOffice : LEGAL_INFO.registeredOffice,
        mailingAddress:   isFilled(db.mailingAddress)   ? db.mailingAddress   : LEGAL_INFO.mailingAddress,
        email:            isFilled(db.email)            ? db.email            : LEGAL_INFO.email,
        legalEmail:       isFilled(db.legalEmail)       ? db.legalEmail       : LEGAL_INFO.legalEmail,
        privacyEmail:     isFilled(db.privacyEmail)     ? db.privacyEmail     : LEGAL_INFO.privacyEmail,
        phone:            isFilled(db.phone)            ? db.phone            : LEGAL_INFO.phone,
        customerHours:    isFilled(db.customerHours)    ? db.customerHours    : LEGAL_INFO.customerHours,
        bankName:         isFilled(db.bankName)         ? db.bankName         : LEGAL_INFO.bankName,
        bankAccount:      isFilled(db.bankAccount)      ? db.bankAccount      : LEGAL_INFO.bankAccount,
        vatStatus:        isFilled(db.vatStatus)        ? db.vatStatus        : LEGAL_INFO.vatStatus,
        _ready: true,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return data;
}

/** Igaz, ha a jogszabály szerinti kötelező EV-adatok ki vannak töltve. */
export function isLegalInfoComplete(info: LegalInfo): boolean {
  const required = [info.ownerName, info.taxId, info.registryNumber, info.registeredOffice, info.email, info.phone];
  return required.every(v => isFilled(v) && !v.includes("PÓTLANDÓ"));
}
