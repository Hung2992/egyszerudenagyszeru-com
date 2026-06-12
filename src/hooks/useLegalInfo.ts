import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { LEGAL_INFO } from "@/lib/legal-info";

/**
 * Élő jogi adatok az adatbázisból (store_settings) — ha valami nincs kitöltve,
 * a `LEGAL_INFO` defaultra esik vissza. Mentés után azonnal frissül:
 *  - `window` event ("legal-info-updated") — ugyanazon tabon belül
 *  - BroadcastChannel("legal-info") — más tabokon / ablakokban
 *  - Supabase Realtime (store_settings UPDATE) — másik kliensből / admin felületről
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

const EVENT_NAME = "legal-info-updated";
const CHANNEL_NAME = "legal-info";

/** Hívd meg mentés után: minden useLegalInfo előfizető azonnal frissül. */
export function notifyLegalInfoUpdated() {
  try { window.dispatchEvent(new Event(EVENT_NAME)); } catch { /* SSR */ }
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ updatedAt: Date.now() });
    bc.close();
  } catch { /* nem támogatott */ }
}

export function useLegalInfo(): LegalInfo & { refresh: () => void } {
  const [data, setData] = useState<LegalInfo>({ ...LEGAL_INFO, _ready: false });

  const load = useCallback(async () => {
    const { data: rpcData, error } = await supabase.rpc("get_public_legal_info");
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
  }, []);

  useEffect(() => {
    void load();

    const onEvent = () => { void load(); };
    window.addEventListener(EVENT_NAME, onEvent);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = () => { void load(); };
    } catch { /* nem támogatott */ }

    const channel = supabase
      .channel("store_settings-legal-info")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "store_settings" },
        () => { void load(); })
      .subscribe();

    return () => {
      window.removeEventListener(EVENT_NAME, onEvent);
      bc?.close();
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { ...data, refresh: load };
}

/** Igaz, ha a jogszabály szerinti kötelező EV-adatok ki vannak töltve. */
export function isLegalInfoComplete(info: LegalInfo): boolean {
  const required = [info.ownerName, info.taxId, info.registryNumber, info.registeredOffice, info.email, info.phone];
  return required.every(v => isFilled(v) && !v.includes("PÓTLANDÓ"));
}
