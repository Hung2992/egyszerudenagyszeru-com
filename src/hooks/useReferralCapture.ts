import { useEffect } from "react";

const STORAGE_KEY = "edn_partner_ref";
const TTL_DAYS = 30;

interface StoredRef {
  code: string;
  capturedAt: number;
}

/**
 * Captures ?ref=PARTNER-XXXX from URL on app load and stores in localStorage for 30 days.
 * Used to auto-apply partner coupon at checkout even if user doesn't manually type it.
 */
export function useReferralCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (!ref) return;

      const code = ref.trim().toUpperCase();
      if (!code || code.length > 64 || !/^[A-Z0-9_-]+$/.test(code)) return;

      const payload: StoredRef = { code, capturedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Referral capture failed", err);
    }
  }, []);
}

export function getStoredReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    const ageMs = Date.now() - parsed.capturedAt;
    if (ageMs > TTL_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.code || null;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
